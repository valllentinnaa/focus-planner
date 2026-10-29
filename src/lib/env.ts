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

if (!parsed.success) {
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env.local and fill in both values.\n" +
      parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n"),
  );
}

export const env = {
  supabaseUrl: parsed.data.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: parsed.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
