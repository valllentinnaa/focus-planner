// share-in — add something to a user's Clipboard from outside the app (the iPhone Shortcut).
//
//   POST /functions/v1/share-in
//   Authorization: Bearer fps_…            (the user's share key, made in Settings)
//   Body: multipart/form-data  — text, url, title, and image file(s) under any field name
//      or application/json     — { "text", "url", "title" }
//      or text/plain           — the text itself
//   → 200 "Added to your Clipboard."   401 bad/revoked key   413 too big   429 too many
//
// Security: the key is looked up by its SHA-256 (the plain key is never stored). A key can only
// ADD lines and images to its owner's Clipboard — nothing can be read or changed with it. Image
// count is capped by plan (same rule the app's uploads follow), sizes are capped, and a user can
// add at most 30 things a minute.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sharedLine } from "../_shared/shared-line.ts";

const IMG_BUCKET = "clipboard-images";
const MAX_BODY = 20 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_IMAGES = 10;
const PER_MINUTE = 30;
const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret ${k}`);
  return v;
};
function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const keys = JSON.parse(env("SUPABASE_SECRET_KEYS")) as Record<string, string>;
  return keys.default ?? Object.values(keys)[0]!;
}
const admin = (): SupabaseClient =>
  createClient(env("SUPABASE_URL"), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });

const reply = (status: number, msg: string) =>
  new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

const sha256hex = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** Shortcuts sometimes label photos generically; sniff the real type from the first bytes. */
function sniff(bytes: Uint8Array, declared: string): string | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  const brand = new TextDecoder().decode(b.slice(4, 12));
  if (brand.startsWith("ftyphei") || brand.startsWith("ftypmif1") || brand.startsWith("ftypheic")) return "image/heic";
  return declared in IMG_EXT ? declared : null;
}

type Parsed = { title: string; text: string; url: string; images: { bytes: Uint8Array; type: string }[] };

async function parse(req: Request): Promise<Parsed | "too_big"> {
  const ct = req.headers.get("content-type") ?? "";
  const out: Parsed = { title: "", text: "", url: "", images: [] };
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 4000) : "");
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        if (key === "title" || key === "text" || key === "url") out[key] = str(value);
        continue;
      }
      if (out.images.length >= MAX_IMAGES) continue;
      if (value.size > MAX_IMAGE) return "too_big";
      const bytes = new Uint8Array(await value.arrayBuffer());
      const type = sniff(bytes, value.type);
      if (type) out.images.push({ bytes, type });
    }
  } else if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    out.title = str(j.title);
    out.text = str(j.text);
    out.url = str(j.url);
  } else {
    out.text = (await req.text()).slice(0, 4000);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, "Use POST.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return reply(413, "That's too big to add (max 8 MB per image).");

  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!/^fps_[0-9a-f]{64}$/.test(key)) return reply(401, "Your share key is missing. Make one in Focus Planner → Settings.");

  const db = admin();
  const { data: tok, error: tokErr } = await db.from("share_tokens").select("user_id").eq("token_hash", await sha256hex(key)).maybeSingle();
  if (tokErr) return reply(500, "Something went wrong. Try again.");
  if (!tok) return reply(401, "This share key no longer works. Make a new one in Focus Planner → Settings.");
  const userId = tok.user_id as string;

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count: recent } = await db.from("clipboard_items").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if ((recent ?? 0) >= PER_MINUTE) return reply(429, "Too many at once — try again in a minute.");

  const body = await parse(req).catch(() => null);
  if (body === "too_big") return reply(413, "That image is too big (max 8 MB).");
  if (!body) return reply(400, "Couldn't read what was shared.");

  const line = sharedLine(body);
  if (!line && body.images.length === 0) return reply(400, "Nothing to add.");

  if (body.images.length) {
    const [{ data: have }, { data: limit }] = await Promise.all([
      db.rpc("clipboard_image_files", { uid: userId }),
      db.rpc("clipboard_image_limit", { uid: userId }),
    ]);
    if ((have ?? 0) + body.images.length > (limit ?? 0)) {
      return reply(403, `Your Clipboard holds up to ${limit} images. Delete some to add more.`);
    }
  }

  const { count: existing } = await db.from("clipboard_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
  let position = existing ?? 0;
  const rows = body.images.length ? body.images.map((img, i) => ({ text: i === 0 ? line : "", img })) : [{ text: line, img: null }];

  for (const row of rows) {
    let path: string | null = null;
    if (row.img) {
      path = `${userId}/${crypto.randomUUID()}.${IMG_EXT[row.img.type]}`;
      const up = await db.storage.from(IMG_BUCKET).upload(path, row.img.bytes, { contentType: row.img.type, upsert: false });
      if (up.error) return reply(500, "Couldn't save the image. Try again.");
    }
    const { error } = await db
      .from("clipboard_items")
      .insert({ user_id: userId, text: row.text, attention: false, position: position++, image_path: path });
    if (error) {
      if (path) await db.storage.from(IMG_BUCKET).remove([path]);
      return reply(500, "Couldn't add it. Try again.");
    }
  }

  await db.from("share_tokens").update({ last_used_at: new Date().toISOString() }).eq("user_id", userId);
  return reply(200, rows.length > 1 ? `Added ${rows.length} to your Clipboard.` : "Added to your Clipboard.");
});
