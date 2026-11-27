// Pick a colour per life area: Today's task text takes it. Inline on the Today settings page;
// as a sheet on Today (tap the palette the first time, or press and hold it to change).
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SUGGESTED, SWATCHES, hasAreaColors, setAreaColor, type AreaColors, type Swatch } from "@/lib/area-colors";
import type { TaskArea } from "@/lib/database.types";
import { AREA_LABELS, AREAS } from "@/lib/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Display, GhostButton, OutlineButton } from "./ui";

/** The colour to draw for a task's area, when colours are on. null = on, but this area has none. */
export function areaTint(c: AreaColors, area: TaskArea | null | undefined): string | null {
  const sw = area ? c[area] : undefined;
  return sw ? colors[sw] : null;
}

export function AreaColorsPicker({ value, onChange }: { value: AreaColors; onChange: (next: AreaColors) => void }) {
  return (
    <View style={{ gap: space.md }}>
      {AREAS.map((a) => (
        <View key={a} style={s.area}>
          <Text style={s.areaLabel}>{AREA_LABELS[a]}</Text>
          <View style={s.swatches}>
            <Pressable
              onPress={() => onChange(setAreaColor(value, a, null))}
              accessibilityRole="radio"
              accessibilityLabel={`${AREA_LABELS[a]}: no colour`}
              accessibilityState={{ selected: !value[a] }}
              hitSlop={4}
              style={[s.swatch, s.none, !value[a] && s.picked]}
            />
            {SWATCHES.map((sw: Swatch) => (
              <Pressable
                key={sw}
                onPress={() => onChange(setAreaColor(value, a, sw))}
                accessibilityRole="radio"
                accessibilityLabel={`${AREA_LABELS[a]}: ${sw}`}
                accessibilityState={{ selected: value[a] === sw }}
                hitSlop={4}
                style={[s.swatch, { backgroundColor: colors[sw] }, value[a] === sw && s.picked]}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** On Today: choose colours; saving turns them on. */
export function AreaColorsSheet({ value, onSave, onClose }: { value: AreaColors; onSave: (next: AreaColors) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AreaColors>(hasAreaColors(value) ? value : SUGGESTED);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 26, lineHeight: 30 }}>Colours</Display>
          <Text style={s.hint}>See at a glance what each task in your day is for.</Text>
          <AreaColorsPicker value={draft} onChange={setDraft} />
          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            <OutlineButton
              gold
              onPress={() => {
                onSave(draft);
                onClose();
              }}
            >
              Show colours
            </OutlineButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: space.xl, gap: space.md },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.md, marginTop: space.sm },
  area: { gap: 6 },
  areaLabel: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.mutedForeground },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  none: { borderColor: colors.rule, borderStyle: "dashed" },
  picked: { borderColor: colors.ink },
});
