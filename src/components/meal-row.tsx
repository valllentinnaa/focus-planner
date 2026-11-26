// A cooking-list item planned for a day, shown in day boxes and the Daily journal. Ticking it here
// ticks it in the Food lists too (same row). It can have a time, set with the clock like a task.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Clock, CookingPot } from "lucide-react-native";
import type { FoodItemRow } from "@/lib/database.types";
import { shortTime } from "@/lib/task-time";
import { colors, fonts } from "@/theme/tokens";
import { CheckBox } from "./ui";
import { TimeSheet } from "./task-item";

export function MealRow({
  meal,
  onDone,
  onTime,
  compact,
}: {
  meal: FoodItemRow;
  onDone: (done: boolean) => void;
  onTime?: (time: string | null) => void;
  compact?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const time = shortTime(meal.cook_time);
  return (
    <View style={s.row}>
      <CheckBox size={compact ? 16 : 18} checked={meal.done} onChange={onDone} />
      {time ? (
        <Pressable onPress={() => onTime && setPicking(true)} hitSlop={6} accessibilityLabel={`At ${time}. Change time`}>
          <Text style={[s.time, meal.done && s.done]}>{time}</Text>
        </Pressable>
      ) : null}
      <CookingPot size={compact ? 12 : 14} color={colors.gold} strokeWidth={1.75} accessibilityLabel="Cooking" />
      <Text style={[s.text, compact && { fontSize: 13 }, meal.done && s.done]} numberOfLines={2}>
        {meal.text}
      </Text>
      {onTime && !time ? (
        <Pressable onPress={() => setPicking(true)} hitSlop={8} accessibilityLabel="Add a time" style={({ pressed }) => [s.clock, pressed && { opacity: 0.5 }]}>
          <Clock size={compact ? 12 : 14} color={colors.gold} strokeWidth={1.75} />
        </Pressable>
      ) : null}
      {picking && onTime ? (
        <TimeSheet
          initial={time}
          title={meal.text}
          onClose={() => setPicking(false)}
          onSave={(t) => {
            onTime(t);
            setPicking(false);
          }}
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  text: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  time: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 0.5, color: colors.gold, fontVariant: ["tabular-nums"] },
  clock: { paddingHorizontal: 4, opacity: 0.7 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
});
