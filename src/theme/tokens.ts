// Paper & Ink — tokens ported from the Lovable prototype (src/styles.css).
export const colors = {
  paper: "#ede9e0",
  ink: "#2b2926",
  gold: "#a69b85",
  rule: "#ddd8cc",
  card: "#faf7f0",
  muted: "#f5f0e8",
  mutedForeground: "#8b857a",
  destructive: "#c45c5c",
  white: "#ffffff",
} as const;

// Keys match the names passed to useFonts in src/app/_layout.tsx.
export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  sans: "WorkSans_400Regular",
  sansMedium: "WorkSans_500Medium",
  sansSemiBold: "WorkSans_600SemiBold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;

export const radius = { sm: 2, md: 4, pill: 999 } as const;

export const layout = { maxWidth: 1040, gutter: 16, wideBreakpoint: 760 } as const;
