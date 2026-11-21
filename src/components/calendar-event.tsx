import { format } from "date-fns";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { DayEvent } from "@/lib/calendar-events";
import { fromISO } from "@/lib/dates";
import { colors, fonts } from "@/theme/tokens";
import { GhostButton } from "./ui";

/** A Google Calendar event line: read-only, with ✕ to remove it from the planner (not from Google). */
export function CalendarEventRow({ event, day, onRemove }: { event: DayEvent; /** Show the day in front (Month view). */ day?: string; onRemove: (key: string) => void }) {
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: event.color || colors.gold }]} />
      <Pressable
        style={s.body}
        disabled={!event.link}
        onPress={() => event.link && Linking.openURL(event.link)}
        accessibilityLabel={`${event.title}, ${event.label}, from ${event.calendar}`}
      >
        <Text style={s.text} numberOfLines={2}>
          <Text style={s.when}>
            {day ? `${format(fromISO(day), "EEE d").toUpperCase()} · ` : ""}
            {event.label}
          </Text>
          {"  "}
          {event.title}
        </Text>
      </Pressable>
      <GhostButton accessibilityLabel={`Remove ${event.title} from the planner`} onPress={() => onRemove(event.key)}>
        <Text style={s.x}>✕</Text>
      </GhostButton>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 },
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 5, marginRight: 3 },
  body: { flex: 1 },
  text: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  when: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, color: colors.gold },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
});
