// Light / Dark / Auto, chosen per device.
// Web & PWA: colours are CSS variables, so switching is instant (just flips data-theme on <html>).
// Native: StyleSheets read colours once at launch, so the palette is picked at startup and the
// app reloads once when the setting changes.
import { Appearance, Platform } from "react-native";
import { ALPHAS, COLOR_NAMES, palettes, type Alpha, type ColorName, type ThemeName } from "./palettes";

export type ThemePref = "light" | "dark" | "system";
const KEY = "fp.theme";
const web = Platform.OS === "web";

const isPref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

function readPref(): ThemePref {
  try {
    if (web) {
      const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      return isPref(v) ? v : "light";
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
    const v = SecureStore.getItem(KEY);
    return isPref(v) ? v : "light";
  } catch {
    return "light";
  }
}

export const resolveTheme = (pref: ThemePref, system: string | null | undefined): ThemeName =>
  pref === "system" ? (system === "dark" ? "dark" : "light") : pref;

let pref: ThemePref = readPref();
/** The palette in effect on native (fixed for the app's lifetime; changing it reloads). */
export const nativeTheme: ThemeName = resolveTheme(pref, Appearance.getColorScheme());

export const getThemePref = () => pref;

// ---------- web: CSS variables ----------
const cssVar = (name: string) => `--fp-${name}`;
const hexToRgba = (hex: string, a: Alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${(parseInt(a, 16) / 255).toFixed(3)})`;
};
export function cssFor(theme: ThemeName) {
  const p = palettes[theme];
  return COLOR_NAMES.flatMap((c) => [`${cssVar(c)}: ${p[c]};`, ...ALPHAS.map((a) => `${cssVar(`${c}-${a}`)}: ${hexToRgba(p[c], a)};`)]).join(" ");
}

function applyWeb() {
  if (!web || typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = pref;
  let style = document.getElementById("fp-theme-css");
  if (!style) {
    style = document.createElement("style");
    style.id = "fp-theme-css";
    style.textContent = [
      `:root { ${cssFor("light")} color-scheme: light; }`,
      `:root[data-theme="dark"] { ${cssFor("dark")} color-scheme: dark; }`,
      `@media (prefers-color-scheme: dark) { :root[data-theme="system"] { ${cssFor("dark")} color-scheme: dark; } }`,
      `html, body { background-color: var(--fp-paper); }`,
    ].join("\n");
    document.head.appendChild(style);
  }
  const dark = resolveTheme(pref, window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") === "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palettes[dark ? "dark" : "light"].paper);
  // The browser-tab icon follows the theme too (home-screen icons can't change once added).
  document.querySelector('link[rel="icon"]')?.setAttribute("href", dark ? "/icons/favicon-dark.png" : "/favicon.ico");
}

/** Is the app showing its dark theme right now? */
export function isDarkNow() {
  if (!web) return isDarkNative;
  return resolveTheme(pref, typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") === "dark";
}
applyWeb();

export async function setThemePref(next: ThemePref) {
  pref = next;
  if (web) {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    applyWeb();
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  SecureStore.setItem(KEY, next);
  if (resolveTheme(next, Appearance.getColorScheme()) === nativeTheme) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    await (require("expo-updates") as typeof import("expo-updates")).reloadAsync();
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native").DevSettings?.reload?.();
  }
}

/** Colour references for styles: CSS variables on web, concrete values on native. */
export const themeColors = Object.fromEntries(
  COLOR_NAMES.map((c) => [c, web ? `var(${cssVar(c)})` : palettes[nativeTheme][c]]),
) as Record<ColorName, string>;

/** A colour at partial opacity (e.g. alpha("card", "80")), theme-aware. */
export const alpha = (c: ColorName, a: Alpha) => (web ? `var(${cssVar(`${c}-${a}`)})` : palettes[nativeTheme][c] + a);

/** For things that need a real colour value rather than a style (status bar). */
export const isDarkNative = nativeTheme === "dark";
