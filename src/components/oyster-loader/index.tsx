// Small in-page loader. Phones: a quiet line of text. Web: the oyster (index.web.tsx).
import { Text } from "react-native";
import { colors, fonts } from "@/theme/tokens";

export function OysterLoader({ hint = "One moment…" }: { size?: number; hint?: string }) {
  return <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground }}>{hint}</Text>;
}
