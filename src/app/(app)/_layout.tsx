import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { takePendingJoin } from "@/data/circles";
import { colors } from "@/theme/tokens";

export const unstable_settings = { anchor: "index" };

export default function AppLayout() {
  const router = useRouter();
  // Opened a circle invite while signed out? Back to it once signed in.
  useEffect(() => {
    takePendingJoin()
      .then((token) => token && router.push(`/join/${token}`))
      .catch(() => undefined);
  }, [router]);

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
