// Share / invite / profile links, and the "reopen after sign-in" path check. Pure, so it's testable.
export type LinkKind = "w" | "join" | "u";

const TOKEN = /^[0-9a-f]{32}$/;

/** `${base}/${kind}/${token}`, or null when there's no web address or the token looks wrong. */
export function buildLink(base: string, kind: LinkKind, token: string) {
  const b = base.trim().replace(/\/+$/, "");
  if (!b || !TOKEN.test(token)) return null;
  return `${b}/${kind}/${token}`;
}

/** Only our own invite/profile paths may be reopened after sign-in (never an arbitrary URL). */
export function isPendingPath(p: unknown): p is `/join/${string}` | `/u/${string}` {
  return typeof p === "string" && /^\/(join|u)\/[0-9a-f]{32}$/.test(p);
}
