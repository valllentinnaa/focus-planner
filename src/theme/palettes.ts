// Paper & Ink. Light is ported from the Lovable prototype; dark is its night version
// (warm near-black paper, cream ink, the gold lifted so it reads on dark).
export const palettes = {
  light: {
    paper: "#ede9e0",
    ink: "#2b2926",
    gold: "#a69b85",
    rule: "#ddd8cc",
    card: "#faf7f0",
    muted: "#f5f0e8",
    mutedForeground: "#8b857a",
    destructive: "#c45c5c",
    burgundy: "#7d2a3a",
    white: "#ffffff",
  },
  dark: {
    paper: "#0f0d0b",
    ink: "#eee8dc",
    gold: "#c8b995",
    rule: "#35312b",
    card: "#1a1713",
    muted: "#221e19",
    mutedForeground: "#9d9587",
    destructive: "#de7b7b",
    burgundy: "#d98a98",
    white: "#ffffff",
  },
} as const;

export type ThemeName = keyof typeof palettes;
export type ColorName = keyof (typeof palettes)["light"];
export const COLOR_NAMES = Object.keys(palettes.light) as ColorName[];
/** Transparency suffixes used with alpha(); each gets a CSS variable on web. */
export const ALPHAS = ["18", "22", "4d", "55", "66", "80", "99", "B3", "f2"] as const;
export type Alpha = (typeof ALPHAS)[number];
