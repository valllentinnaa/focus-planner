// Google Calendar (read-only) for Focus Planner.
//
//   POST /google-calendar/auth-url    { returnTo }            → { url }   start connecting an account
//   GET  /google-calendar/callback    ?code&state             → 302 back to the app
//   POST /google-calendar/status                              → { accounts }
//   POST /google-calendar/refresh                             → re-sync each account's calendar list
//   POST /google-calendar/events      { timeMin, timeMax }    → { events, errors }
//   POST /google-calendar/disconnect  { connectionId }        → revoke at Google + forget
//   POST /google-calendar/contacts                            → { contacts, needsAccess }  for Presents
//
// Security: every API action requires the user's Supabase access token. Google refresh tokens are
// stored AES-256-GCM encrypted in a table the client cannot reach; access tokens are never stored
// and never leave this function. Scopes are read-only (calendar.readonly, and contacts.readonly only
// if the user asks to import contacts) — the planner can't change Google data. Contacts are passed
// through to the user's own device and never stored here; the app saves only the ones they pick.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";
const GCAL = "https://www.googleapis.com/calendar/v3";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];
const CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
const PEOPLE = "https://people.googleapis.com/v1";
const MAX_CONTACT_PAGES = 5; // 1000 per page
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_RANGE_DAYS = 62;
const APP_SCHEME = "focusplanner://";

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

const callbackUrl = () => `${env("SUPABASE_URL")}/functions/v1/google-calendar/callback`;

// ---------- crypto (one secret → separate AES and HMAC keys via HKDF) ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf: ArrayBuffer | Uint8Array) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

let keys: Promise<{ aes: CryptoKey; hmac: CryptoKey }> | null = null;
function getKeys() {
  keys ??= (async () => {
    const raw = unb64(env("GOOGLE_TOKEN_KEY"));
    if (raw.length < 32) throw new Error("GOOGLE_TOKEN_KEY must be at least 32 random bytes (base64)");
    const base = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
    const derive = (info: string, alg: AesKeyGenParams | HmacKeyGenParams, use: KeyUsage[]) =>
      crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: enc.encode(info) }, base, alg, false, use);
    return {
      aes: await derive("focus-planner/google-token", { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
      hmac: await derive("focus-planner/oauth-state", { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign", "verify"]),
    };
  })();
  return keys;
}

async function encrypt(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, (await getKeys()).aes, enc.encode(plain));
  return `${b64(iv)}.${b64(ct)}`;
}
async function decrypt(packed: string) {
  const [iv, ct] = packed.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv!) }, (await getKeys()).aes, unb64(ct!));
  return dec.decode(pt);
}

type State = { u: string; r: string; n: string; e: number };
async function signState(s: State) {
  const body = b64url(enc.encode(JSON.stringify(s)));
  const sig = await crypto.subtle.sign("HMAC", (await getKeys()).hmac, enc.encode(body));
  return `${body}.${b64url(sig)}`;
}
async function verifyState(token: string): Promise<State | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify("HMAC", (await getKeys()).hmac, unb64url(sig), enc.encode(body));
  if (!ok) return null;
  const s = JSON.parse(dec.decode(unb64url(body))) as State;
  return s.e > Date.now() ? s : null;
}

// ---------- return-to allow-list (no open redirects) ----------
function allowedReturn(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  if (url.startsWith(APP_SCHEME)) return true;
  const origins = (Deno.env.get("APP_URLS") ?? "http://localhost:8081").split(",").map((o) => o.trim().replace(/\/$/, ""));
  try {
    const u = new URL(url);
    return origins.includes(u.origin);
  } catch {
    return false;
  }
}
const withParam = (url: string, k: string, v: string) => `${url}${url.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}`;

// ---------- http helpers ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function requireUser(req: Request, db: SupabaseClient) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Not signed in");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Not signed in");
  return data.user.id;
}

// ---------- Google ----------
async function googleToken(params: Record<string, string>) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), ...params }),
  });
  const body = await res.json();
  if (!res.ok) throw new HttpError(res.status === 400 ? 409 : 502, body.error ?? "google_token_error");
  return body as { access_token: string; refresh_token?: string; id_token?: string; expires_in: number };
}

type Connection = { id: string; user_id: string; email: string; refresh_token_enc: string };

async function accessTokenFor(c: Connection) {
  const t = await googleToken({ grant_type: "refresh_token", refresh_token: await decrypt(c.refresh_token_enc) });
  return t.access_token;
}

async function gcal<T>(token: string, path: string) {
  const res = await fetch(`${GCAL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new HttpError(res.status === 401 ? 409 : 502, `google_calendar_${res.status}`);
  return (await res.json()) as T;
}

type GCalendar = { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean; selected?: boolean; accessRole: string };

/** Pull the account's calendar list into calendar_sources (keeps the user's on/off choices). */
async function syncCalendars(db: SupabaseClient, c: Connection, token?: string) {
  token ??= await accessTokenFor(c);
  const list = await gcal<{ items: GCalendar[] }>(token, "/users/me/calendarList?minAccessRole=reader&maxResults=250");
  const { data: existing } = await db.from("calendar_sources").select("calendar_id").eq("connection_id", c.id);
  const known = new Set((existing ?? []).map((r) => r.calendar_id as string));
  const row = (cal: GCalendar) => ({
    user_id: c.user_id,
    connection_id: c.id,
    calendar_id: cal.id,
    summary: (cal.summaryOverride ?? cal.summary ?? "").slice(0, 200),
    color: cal.backgroundColor ?? "",
  });
  // Known calendars: refresh name/colour, keep the user's on/off choice.
  const existingRows = list.items.filter((cal) => known.has(cal.id)).map(row);
  if (existingRows.length) {
    const { error } = await db.from("calendar_sources").upsert(existingRows, { onConflict: "connection_id,calendar_id" });
    if (error) throw error;
  }
  // New calendars start on only if they're the primary one or ticked in Google Calendar.
  const newRows = list.items.filter((cal) => !known.has(cal.id)).map((cal) => ({ ...row(cal), enabled: !!(cal.primary || cal.selected) }));
  if (newRows.length) {
    const { error } = await db.from("calendar_sources").insert(newRows);
    if (error) throw error;
  }
  const gone = [...known].filter((id) => !list.items.some((cal) => cal.id === id));
  if (gone.length) await db.from("calendar_sources").delete().eq("connection_id", c.id).in("calendar_id", gone);
}

type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  transparency?: string;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

// ---------- actions ----------
async function handle(req: Request, action: string) {
  const db = admin();

  if (action === "callback") {
    const url = new URL(req.url);
    const state = await verifyState(url.searchParams.get("state") ?? "");
    if (!state || !allowedReturn(state.r)) return new Response("Invalid or expired link. Please try connecting again.", { status: 400 });
    const back = (result: string) => Response.redirect(withParam(state.r, "calendar", result), 302);
    const code = url.searchParams.get("code");
    if (!code) return back("cancelled");
    try {
      const t = await googleToken({ grant_type: "authorization_code", code, redirect_uri: callbackUrl() });
      if (!t.refresh_token || !t.id_token) return back("error");
      // id_token comes straight from Google's token endpoint over TLS, so its claims can be read as-is.
      const claims = JSON.parse(dec.decode(unb64url(t.id_token.split(".")[1]!))) as { sub: string; email?: string };
      const { data: conn, error } = await db
        .from("google_connections")
        .upsert(
          { user_id: state.u, google_sub: claims.sub, email: claims.email ?? "", refresh_token_enc: await encrypt(t.refresh_token) },
          { onConflict: "user_id,google_sub" },
        )
        .select("id, user_id, email, refresh_token_enc")
        .single();
      if (error) throw error;
      await syncCalendars(db, conn as Connection, t.access_token);
      return back("connected");
    } catch (e) {
      console.error("callback", e);
      return back("error");
    }
  }

  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  const userId = await requireUser(req, db);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const connections = async () => {
    const { data, error } = await db.from("google_connections").select("id, user_id, email, refresh_token_enc").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as Connection[];
  };

  switch (action) {
    case "auth-url": {
      if (!allowedReturn(body.returnTo)) throw new HttpError(400, "returnTo not allowed");
      const state = await signState({ u: userId, r: body.returnTo, n: crypto.randomUUID(), e: Date.now() + STATE_TTL_MS });
      const params = new URLSearchParams({
        client_id: env("GOOGLE_CLIENT_ID"),
        redirect_uri: callbackUrl(),
        response_type: "code",
        scope: [...SCOPES, ...(body.contacts === true ? [CONTACTS_SCOPE] : [])].join(" "),
        access_type: "offline",
        prompt: "consent select_account",
        include_granted_scopes: "true",
        state,
      });
      return json({ url: `${GOOGLE_AUTH}?${params}` });
    }

    case "status": {
      const conns = await connections();
      const { data: cals } = await db
        .from("calendar_sources")
        .select("id, connection_id, calendar_id, summary, color, enabled")
        .eq("user_id", userId)
        .order("summary");
      return json({
        accounts: conns.map((c) => ({ id: c.id, email: c.email, calendars: (cals ?? []).filter((k) => k.connection_id === c.id) })),
      });
    }

    case "refresh": {
      const errors: { account: string; error: string }[] = [];
      for (const c of await connections()) {
        try {
          await syncCalendars(db, c);
        } catch (e) {
          errors.push({ account: c.email, error: e instanceof HttpError && e.status === 409 ? "reconnect" : "failed" });
        }
      }
      return json({ errors });
    }

    case "events": {
      const min = new Date(String(body.timeMin));
      const max = new Date(String(body.timeMax));
      if (Number.isNaN(min.getTime()) || Number.isNaN(max.getTime()) || max <= min || max.getTime() - min.getTime() > MAX_RANGE_DAYS * 864e5)
        throw new HttpError(400, "Bad range");
      const conns = await connections();
      const { data: cals } = await db.from("calendar_sources").select("connection_id, calendar_id, summary, color").eq("user_id", userId).eq("enabled", true);
      const events: unknown[] = [];
      const errors: { account: string; error: string }[] = [];
      await Promise.all(
        conns.map(async (c) => {
          const mine = (cals ?? []).filter((k) => k.connection_id === c.id);
          if (!mine.length) return;
          try {
            const token = await accessTokenFor(c);
            await Promise.all(
              mine.map(async (cal) => {
                const q = new URLSearchParams({
                  timeMin: min.toISOString(),
                  timeMax: max.toISOString(),
                  singleEvents: "true",
                  orderBy: "startTime",
                  maxResults: "250",
                  fields: "items(id,status,summary,htmlLink,start,end,transparency,attendees(self,responseStatus))",
                });
                const res = await gcal<{ items?: GEvent[] }>(token, `/calendars/${encodeURIComponent(cal.calendar_id)}/events?${q}`);
                for (const ev of res.items ?? []) {
                  if (ev.status === "cancelled") continue;
                  if (ev.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
                  const allDay = !!ev.start?.date;
                  events.push({
                    key: `${cal.calendar_id}|${ev.id}`,
                    title: (ev.summary ?? "(busy)").slice(0, 300),
                    start: allDay ? ev.start!.date : ev.start?.dateTime,
                    end: allDay ? ev.end?.date : ev.end?.dateTime,
                    allDay,
                    calendar: cal.summary,
                    color: cal.color,
                    link: ev.htmlLink ?? null,
                  });
                }
              }),
            );
          } catch (e) {
            console.error("events", c.id, e);
            errors.push({ account: c.email, error: e instanceof HttpError && e.status === 409 ? "reconnect" : "failed" });
          }
        }),
      );
      return json({ events, errors });
    }

    case "contacts": {
      type GPerson = {
        resourceName: string;
        names?: { displayName?: string; metadata?: { primary?: boolean } }[];
        birthdays?: { date?: { year?: number; month?: number; day?: number }; metadata?: { primary?: boolean } }[];
      };
      const contacts: { id: string; name: string; month: number | null; day: number | null; year: number | null; account: string }[] = [];
      const needsAccess: string[] = [];
      const errors: { account: string; error: string }[] = [];
      const conns = await connections();
      for (const c of conns) {
        try {
          const token = await accessTokenFor(c);
          let pageToken = "";
          for (let page = 0; page < MAX_CONTACT_PAGES; page++) {
            const q = new URLSearchParams({ personFields: "names,birthdays", pageSize: "1000", sortOrder: "FIRST_NAME_ASCENDING" });
            if (pageToken) q.set("pageToken", pageToken);
            const res = await fetch(`${PEOPLE}/people/me/connections?${q}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 403) {
              // Either the user didn't grant contacts access, or the People API isn't enabled in
              // the Google Cloud project. Tell them apart so the app can say what to fix.
              const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; details?: { reason?: string }[] } };
              const reason = err.error?.details?.find((d) => d.reason)?.reason ?? "";
              console.error("contacts 403", c.id, reason, err.error?.message);
              if (reason === "SERVICE_DISABLED" || /has not been used|is disabled/i.test(err.error?.message ?? "")) {
                errors.push({ account: c.email, error: "api_disabled" });
              } else {
                needsAccess.push(c.email);
              }
              break;
            }
            if (!res.ok) throw new HttpError(res.status === 401 ? 409 : 502, `google_people_${res.status}`);
            const body = (await res.json()) as { connections?: GPerson[]; nextPageToken?: string };
            for (const p of body.connections ?? []) {
              const name = (p.names?.find((n) => n.metadata?.primary) ?? p.names?.[0])?.displayName?.trim();
              if (!name) continue;
              const b = (p.birthdays?.find((x) => x.metadata?.primary && x.date?.month) ?? p.birthdays?.find((x) => x.date?.month))?.date;
              contacts.push({
                id: p.resourceName.slice(0, 200),
                name: name.slice(0, 120),
                month: b?.month && b.day ? b.month : null,
                day: b?.month && b.day ? b.day : null,
                year: b?.month && b.day && b.year ? b.year : null,
                account: c.email,
              });
            }
            if (!body.nextPageToken) break;
            pageToken = body.nextPageToken;
          }
        } catch (e) {
          console.error("contacts", c.id, e);
          errors.push({ account: c.email, error: e instanceof HttpError && e.status === 409 ? "reconnect" : "failed" });
        }
      }
      return json({ connected: conns.length > 0, accounts: conns.map((c) => c.email), contacts, needsAccess, errors });
    }

    case "disconnect": {
      const c = (await connections()).find((k) => k.id === body.connectionId);
      if (!c) throw new HttpError(404, "Not found");
      try {
        await fetch(GOOGLE_REVOKE, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: await decrypt(c.refresh_token_enc) }),
        });
      } catch (e) {
        console.error("revoke", e); // still forget it locally
      }
      const { error } = await db.from("google_connections").delete().eq("id", c.id).eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Unknown action");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const action = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    return await handle(req, action);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(action, e);
    return json({ error: "Something went wrong" }, 500);
  }
});
