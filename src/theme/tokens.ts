import { Platform } from "react-native";
import { themeColors } from "./theme";

// Paper & Ink colours — light/dark palettes live in ./palettes, switching in ./theme.
// On web these are CSS variables; on native, the palette chosen at launch.
export { alpha } from "./theme";
export const colors = themeColors;

// Keys match the names passed to useFonts in src/app/_layout.tsx.
// Work Sans / Instrument Serif have no Cyrillic. Native platforms fall back to the system font for
// missing letters on their own; on web we spell out a fallback so Bulgarian text (e.g. calendar
// events) gets a matching sans/serif instead of the browser's default Times.
const SANS_FALLBACK = ', "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
const SERIF_FALLBACK = ', Georgia, "Times New Roman", serif';
const web = Platform.OS === "web";
const sans = (name: string) => (web ? name + SANS_FALLBACK : name);
const serif = (name: string) => (web ? name + SERIF_FALLBACK : name);

export const fonts = {
  display: serif("InstrumentSerif_400Regular"),
  displayItalic: serif("InstrumentSerif_400Regular_Italic"),
  sans: sans("WorkSans_400Regular"),
  sansMedium: sans("WorkSans_500Medium"),
  sansSemiBold: sans("WorkSans_600SemiBold"),
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;

// `pill` is the corner radius for every button, chip, tab and toggle: 6px (not fully round).
export const radius = { sm: 2, md: 4, pill: 6 } as const;

// The app uses the full width of the screen. Side padding grows with the screen; only very large
// displays get a cap, so lines and columns don't stretch absurdly wide.
export const layout = { maxWidth: 1920, gutter: 16, wideBreakpoint: 760 } as const;

/** Side padding for a window width: phones 16, tablets/laptops 32, desktops 48, large 64. */
export function gutterFor(width: number) {
  if (width < layout.wideBreakpoint) return 16;
  if (width < 1200) return 32;
  if (width < 1600) return 48;
  return 64;
}
