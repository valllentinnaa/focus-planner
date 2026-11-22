import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { takePendingLink } from "@/data/circles";
import { useSettings } from "@/data/profile";
import { colors } from "@/theme/tokens";

export const unstable_settings = { anchor: "index" };

export default function AppLayout() {
  const router = useRouter();
  const { settings, loading } = useSettings();
  // Opened a circle invite or profile link while signed out? Back to it once signed in —
  // for a brand-new account, right after first-run setup.
  const ready = !loading && settings.onboarded;
  useEffect(() => {
    if (!ready) return;
    takePendingLink()
      .then((path) => path && router.push(path))
      .catch(() => undefined);
  }, [ready, router]);

  // New account: first-run setup before the planner.
  if (!loading && !settings.onboarded) return <Redirect href="/welcome" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: colors.paper },
      }}
    />
  );
}
