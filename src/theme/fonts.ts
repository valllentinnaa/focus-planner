// The app's fonts (names match fonts in tokens.ts). Phones load the original TTF files, bundled
// into the app. Each file is required directly, so only the five fonts used are bundled — not the
// whole family.
export const FONTS = {
  InstrumentSerif_400Regular: require("@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"),
  InstrumentSerif_400Regular_Italic: require("@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"),
  WorkSans_400Regular: require("@expo-google-fonts/work-sans/400Regular/WorkSans_400Regular.ttf"),
  WorkSans_500Medium: require("@expo-google-fonts/work-sans/500Medium/WorkSans_500Medium.ttf"),
  WorkSans_600SemiBold: require("@expo-google-fonts/work-sans/600SemiBold/WorkSans_600SemiBold.ttf"),
};

/** Phones: wait for the fonts (they're on the device, so it's instant). */
export const FONT_WAIT_MS: number | null = null;
