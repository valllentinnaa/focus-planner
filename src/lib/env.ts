// Expo inlines EXPO_PUBLIC_* at build time; read them statically so Metro can replace them.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * A usable Supabase config: an http(s) URL with a host, and a key of plausible length.
 * (A pattern, not `new URL`: React Native's URL support is incomplete on phones.)
 */
export function validSupabaseConfig(u: string, k: string) {
  return /^https?:\/\/[^\s/:]+(:\d+)?(\/\S*)?$/.test(u) && k.length >= 10;
}
const parsed = { success: validSupabaseConfig(url, key) };

/**
 * Demo mode: no Supabase configured (or EXPO_PUBLIC_DEMO=1). The app runs fully against local
 * storage with a fake signed-in user so screens can be reviewed. Nothing leaves the device.
 */
const demo = process.env.EXPO_PUBLIC_DEMO === "1" || !parsed.success;

if (!parsed.success && process.env.EXPO_PUBLIC_DEMO !== "1" && process.env.NODE_ENV !== "test") {
  console.warn(
    "Focus Planner: no Supabase config found, running in demo mode. Copy .env.example to .env.local to use a real backend.",
  );
}

export const env = {
  demo,
  supabaseUrl: parsed.success ? url : "https://demo.invalid",
  supabasePublishableKey: parsed.success ? key : "demo",
  /** Public web address (for share links made from the phone app). Web uses its own origin. */
  webUrl: (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/$/, ""),
};
