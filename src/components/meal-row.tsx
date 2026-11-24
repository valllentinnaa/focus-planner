// A cooking-list item planned for a day, shown in day boxes and the Daily journal. Ticking it here
// ticks it in the Food lists too (same row).
import { StyleSheet, Text, View } from "react-native";
import { CookingPot } from "lucide-react-native";
import type { FoodItemRow } from "@/lib/database.types";
import { colors, fonts } from "@/theme/tokens";
import { CheckBox } from "./ui";

export function MealRow({ meal, onDone, compact }: { meal: FoodItemRow; onDone: (done: boolean) => void; compact?: boolean }) {
  return (
    <View style={s.row}>
      <CheckBox size={compact ? 16 : 18} checked={meal.done} onChange={onDone} />
      <CookingPot size={compact ? 12 : 14} color={colors.gold} strokeWidth={1.75} accessibilityLabel="Cooking" />
      <Text style={[s.text, compact && { fontSize: 13 }, meal.done && s.done]} numberOfLines={2}>
        {meal.text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  text: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
});
