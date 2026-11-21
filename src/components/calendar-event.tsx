import { format } from "date-fns";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { AgendaItem, DayEvent } from "@/lib/calendar-events";
import { fromISO } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { GhostButton } from "./ui";

const dayLabel = (iso: string) => format(fromISO(iso), "EEE d").toUpperCase();

/**
 * Shell for a read-only Google event line. ✕ (remove from the planner, not from Google) stays out
 * of the way: it shows on hover (desktop) or after a long-press (touch). Tapping opens the event.
 */
function EventLine({ event, onRemove, children }: { event: DayEvent; onRemove: (key: string) => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const showX = hover || revealed;
  return (
    <Pressable
      style={s.row}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onLongPress={() => setRevealed((v) => !v)}
      onPress={() => (revealed ? setRevealed(false) : event.link && Linking.openURL(event.link))}
      accessibilityLabel={`${event.title}, ${event.label}, from ${event.calendar}`}
      accessibilityHint="Long-press to show remove"
      accessibilityActions={[{ name: "remove", label: "Remove from planner" }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === "remove" && onRemove(event.key)}
    >
      <View style={[s.dot, { backgroundColor: event.color || colors.gold }]} />
      <View style={s.body}>{children}</View>
      <View style={[s.xWrap, !showX && s.hidden]} pointerEvents={showX ? "auto" : "none"}>
        <GhostButton accessibilityLabel={`Remove ${event.title} from the planner`} onPress={() => onRemove(event.key)}>
          <Text style={s.x}>✕</Text>
        </GhostButton>
      </View>
    </Pressable>
  );
}

/** Week day box: time + title, up to two lines. */
export function CalendarEventRow({ event, onRemove }: { event: DayEvent; onRemove: (key: string) => void }) {
  return (
    <EventLine event={event} onRemove={onRemove}>
      <Text style={s.text} numberOfLines={2}>
        {event.allDay ? null : <Text style={s.when}>{event.label}  </Text>}
        {event.title}
      </Text>
    </EventLine>
  );
}

/**
 * Month week box: events grouped under a day label (shown once per day), one line each, multi-day
 * events merged into a single line with their range. Shows `limit` lines, then "+N more".
 */
export function MonthAgenda({ agenda, onRemove, limit = 4 }: { agenda: { day: string; items: AgendaItem[] }[]; onRemove: (key: string) => void; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const rows = agenda.flatMap(({ day, items }) => items.map((item, i) => ({ day, item, firstOfDay: i === 0 })));
  if (!rows.length) return null;
  const visible = expanded ? rows : rows.slice(0, limit);
  const hiddenCount = rows.length - visible.length;

  return (
    <View style={s.agenda}>
      {visible.map(({ day, item, firstOfDay }, i) => {
        const { event, firstISO, lastISO } = item;
        // A day label repeats at the top of a collapsed list's continuation only if it's a new day.
        const showDay = firstOfDay || i === 0;
        return (
          <View key={`${day}|${event.key}`} style={s.agendaRow}>
            <Text style={[s.dayCol, !showDay && s.hidden]}>{dayLabel(day)}</Text>
            <View style={s.agendaMain}>
              <EventLine event={event} onRemove={onRemove}>
                <Text style={s.text} numberOfLines={1}>
                  {lastISO > firstISO ? <Text style={s.when}>→ {dayLabel(lastISO)}  </Text> : null}
                  {!event.allDay && lastISO === firstISO ? <Text style={s.when}>{event.label}  </Text> : null}
                  {event.title}
                </Text>
              </EventLine>
            </View>
          </View>
        );
      })}
      {hiddenCount > 0 || expanded ? (
        <GhostButton onPress={() => setExpanded((v) => !v)} style={s.more}>
          <Text style={s.moreText}>{expanded ? "Show less" : `+${hiddenCount} more`}</Text>
        </GhostButton>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 22, minWidth: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  body: { flex: 1, minWidth: 0 },
  text: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  when: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, color: colors.gold },
  xWrap: { marginLeft: 2 },
  hidden: { opacity: 0 },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  agenda: { gap: 1, marginBottom: space.sm },
  agendaMain: { flex: 1, minWidth: 0 },
  agendaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dayCol: { width: 46, fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.2, color: colors.mutedForeground },
  more: { alignSelf: "flex-start", marginLeft: 52, marginTop: 2 },
  moreText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.5, color: colors.gold },
});
