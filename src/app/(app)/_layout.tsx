import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export const unstable_settings = { anchor: "index" };

export default function AppLayout() {
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
