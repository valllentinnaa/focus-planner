/* eslint-disable @typescript-eslint/no-require-imports -- React Native loads asset files with require() */
// Web fonts: WOFF2 files cut down to the characters the app uses (Latin, accents, punctuation,
// arrows and symbols — these fonts have no Cyrillic; Bulgarian falls back to the system font).
// ~165 KB in total instead of ~710 KB of TTF. Made with:
//   pyftsubset <font>.ttf --flavor=woff2 --layout-features='*' \
//     --unicodes="U+0000-017F,U+2000-206F,U+2190-21FF,U+25A0-25FF,U+2600-27BF,…"
export const FONTS = {
  InstrumentSerif_400Regular: require("../../assets/fonts/InstrumentSerif_400Regular.woff2"),
  InstrumentSerif_400Regular_Italic: require("../../assets/fonts/InstrumentSerif_400Regular_Italic.woff2"),
  WorkSans_400Regular: require("../../assets/fonts/WorkSans_400Regular.woff2"),
  WorkSans_500Medium: require("../../assets/fonts/WorkSans_500Medium.woff2"),
  WorkSans_600SemiBold: require("../../assets/fonts/WorkSans_600SemiBold.woff2"),
};

/** Web: never hold the first paint longer than this for fonts; they swap in when they arrive. */
export const FONT_WAIT_MS: number | null = 1500;
