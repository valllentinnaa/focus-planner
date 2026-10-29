import { z } from "zod";

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
});

// Expo inlines EXPO_PUBLIC_* at build time; read them statically so Metro can replace them.
const parsed = schema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

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
  supabaseUrl: parsed.success ? parsed.data.EXPO_PUBLIC_SUPABASE_URL : "https://demo.invalid",
  supabasePublishableKey: parsed.success ? parsed.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY : "demo",
};
