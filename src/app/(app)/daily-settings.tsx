// Settings → Daily journal: choose which sections the journal shows and add your own fields.
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { newId } from "@/data/items";
import { useSettings } from "@/data/profile";
import { AreaColorsPicker } from "@/components/area-colors";
import { hasAreaColors } from "@/lib/area-colors";
import {
  addField,
  BUILTIN_FIELDS,
  isShown,
  LABEL_MAX,
  MAX_CUSTOM_FIELDS,
  removeField,
  setShown,
  updateField,
  type DailyLayout,
  type FieldSize,
} from "@/lib/daily-layout";
import { colors, fonts, space } from "@/theme/tokens";
import { PageTitle, Screen } from "@/components/screen";
import { GhostButton, OutlineButton, RuleInput, SectionLabel } from "@/components/ui";

export default function DailySettingsScreen() {
  const { settings, update, saveError } = useSettings();
  const fromToday = useLocalSearchParams<{ from?: string }>().from === "today";
  const layout = settings.dailyLayout;
  const save = (next: DailyLayout) => update({ dailyLayout: next });
  const [label, setLabel] = useState("");
  const [size, setSize] = useState<FieldSize>("short");
  const full = layout.custom.length >= MAX_CUSTOM_FIELDS;

  const add = () => {
    if (!label.trim()) return;
    save(addField(layout, label, size, newId()));
    setLabel("");
  };

  return (
    <Screen>
      <Link href={fromToday ? "/today" : "/settings"} asChild>
        <GhostButton style={{ alignSelf: "flex-start" }}>{fromToday ? "‹ Today" : "‹ Settings"}</GhostButton>
      </Link>
      <PageTitle eyebrow="Settings" title="Daily journal" />
      <View style={{ maxWidth: 480, gap: space.xl }}>
        {saveError ? <Text style={s.error}>{"Couldn't save. Check your connection and try again."}</Text> : null}

        <View>
          <SectionLabel>Sections</SectionLabel>
          <Text style={s.hint}>The focus of the day is always there.</Text>
          <View style={{ marginTop: space.sm }}>
            {BUILTIN_FIELDS.map((f) => (
              <Pressable key={f.key} style={s.row} onPress={() => save(setShown(layout, f.key, !isShown(layout, f.key)))}>
                <Text style={s.rowLabel}>{f.label}</Text>
                <Switch
                  value={isShown(layout, f.key)}
                  onValueChange={(on) => save(setShown(layout, f.key, on))}
                  trackColor={{ true: colors.gold, false: colors.rule }}
                  thumbColor={colors.paper}
                  {...({ activeThumbColor: colors.paper } as object)}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <SectionLabel>Colours</SectionLabel>
          <Text style={s.hint}>Colour the tasks in your day by life area. The palette button on Today turns them on and off.</Text>
          <Pressable style={[s.row, { marginTop: space.sm }]} onPress={() => update({ showAreaColors: !settings.showAreaColors })}>
            <Text style={s.rowLabel}>Show colours on Today</Text>
            <Switch
              value={settings.showAreaColors}
              onValueChange={(on) => update({ showAreaColors: on })}
              trackColor={{ true: colors.gold, false: colors.rule }}
              thumbColor={colors.paper}
              {...({ activeThumbColor: colors.paper } as object)}
            />
          </Pressable>
          <View style={{ marginTop: space.md }}>
            <AreaColorsPicker
              value={settings.areaColors}
              onChange={(areaColors) => update({ areaColors, ...(hasAreaColors(areaColors) ? {} : { showAreaColors: false }) })}
            />
          </View>
        </View>

        <View>
          <SectionLabel>Your own fields</SectionLabel>
          <Text style={s.hint}>Anything you want to track each day — mood, water, a question to answer.</Text>
          <View style={{ marginTop: space.sm, gap: space.sm }}>
            {layout.custom.map((f) => (
              <View key={f.id} style={s.custom}>
                <RuleInput
                  value={f.label}
                  maxLength={LABEL_MAX}
                  onChangeText={(v) => save(updateField(layout, f.id, { label: v }))}
                  onBlur={() => {
                    if (!f.label.trim()) save(removeField(layout, f.id));
                  }}
                  style={{ flex: 1 }}
                />
                <SizePicker value={f.size} onChange={(v) => save(updateField(layout, f.id, { size: v }))} />
                <Pressable accessibilityLabel={`Remove ${f.label}`} hitSlop={8} onPress={() => save(removeField(layout, f.id))} style={s.remove}>
                  <X size={14} color={colors.mutedForeground} strokeWidth={1.75} />
                </Pressable>
              </View>
            ))}
          </View>

          {full ? (
            <Text style={[s.hint, { marginTop: space.md }]}>{`That's the maximum of ${MAX_CUSTOM_FIELDS} fields.`}</Text>
          ) : (
            <View style={s.addRow}>
              <RuleInput
                value={label}
                onChangeText={setLabel}
                onSubmitEditing={add}
                maxLength={LABEL_MAX}
                placeholder="New field, e.g. Mood"
                style={{ flex: 1 }}
              />
              <SizePicker value={size} onChange={setSize} />
              <OutlineButton gold disabled={!label.trim()} onPress={add}>
                Add
              </OutlineButton>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

/** Short = one line; Long = a few lines. */
function SizePicker({ value, onChange }: { value: FieldSize; onChange: (v: FieldSize) => void }) {
  return (
    <View style={s.seg}>
      {(["short", "long"] as const).map((v) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[s.segItem, value === v && s.segItemOn]} accessibilityState={{ selected: value === v }}>
          <Text style={[s.segText, value === v && s.segTextOn]}>{v === "short" ? "Short" : "Long"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  custom: { flexDirection: "row", alignItems: "center", gap: space.md },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg },
  remove: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: 2 },
  segItem: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  segItemOn: { backgroundColor: colors.gold },
  segText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.mutedForeground },
  segTextOn: { color: colors.paper },
});

