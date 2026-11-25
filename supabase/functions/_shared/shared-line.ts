// Used by the app (Android shares) and the share-in edge function (iPhone Shortcut). No imports:
// it must run in both React Native and Deno.
const MAX_LINE = 500;

/**
 * One clipboard line from what another app shared (title / text / link). Apps often repeat the
 * link inside the text, or the title inside the text, so repeats are dropped. A link is never cut.
 */
export function sharedLine({ title = "", text = "", url = "" }: { title?: string; text?: string; url?: string }) {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = clean(text);
  const ti = clean(title);
  const u = clean(url);
  const head = [ti && !t.includes(ti) ? ti : "", t].filter(Boolean).join(" — ");
  if (!u || head.includes(u)) return head.slice(0, MAX_LINE);
  if (u.length >= MAX_LINE - 3) return u.slice(0, MAX_LINE);
  return head ? `${head.slice(0, MAX_LINE - u.length - 3).trim()} — ${u}` : u;
}
