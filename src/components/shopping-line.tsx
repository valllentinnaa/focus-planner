import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShopping } from "@/data/food";
import { colors, fonts } from "@/theme/tokens";
import { CheckBox } from "./ui";

/**
 * Week → Personal life: the week's shopping list (Food tab) as one line. Ticking it ticks every
 * shopping item; ticking all items on the Food tab ticks it. Hidden when the list is empty.
 */
export function ShoppingLine({ weekStart }: { weekStart: string }) {
  const { total, done, allDone, setAllDone } = useShopping(weekStart);
  if (total === 0) return null;
  return (
    <View style={s.row}>
      <CheckBox checked={allDone} onChange={setAllDone} />
      <Link href="/food" asChild>
        <Pressable style={s.body} accessibilityLabel={`Shopping, ${done} of ${total} done. Open the Food page`}>
          <Text style={[s.text, allDone && s.done]}>Shopping</Text>
          <Text style={s.count}>
            {done}/{total} ↗
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 },
  body: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  text: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  count: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, color: colors.gold },
});
