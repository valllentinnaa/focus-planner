// Monthly check-in. If you have people (circles/connections) and it's check-in time, it first
// offers to do it together; then the festive month card: your 12-week goals, where the focus went,
// week-by-week numbers, a constellation of everything you did, and the month's sky. At check-in
// time it ends with "I'm ready for <next month>"; opened later, it's just a look back.
import { addMonths, format, startOfMonth } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Platform, Share, View } from "react-native";
import { useCheckin } from "@/data/checkins";
import { useSettings } from "@/data/profile";
import { useCurrentQuarter, useGoals } from "@/data/quarter";
import { useMonthTasks } from "@/data/tasks";
import { buildRecap, isCheckinTime, isMonthKey, monthKey, recapShareText } from "@/lib/checkin";
import { fromISO, mondayOf, monthWeeks, toISO } from "@/lib/dates";
import { AREA_LABELS as GOAL_AREA_LABELS, type Area } from "@/lib/quarter-goals";
import { skyFor } from "@/lib/sky";
import { space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { MonthCard } from "@/components/checkin/month-card";
import { TogetherStep, useHasPeople } from "@/components/checkin/together";

const areaLabel = (a: string) => GOAL_AREA_LABELS[a as Area] ?? a;

export default function CheckinScreen() {
  const params = useLocalSearchParams<{ month?: string }>();
  const month = isMonthKey(params.month) ? params.month : monthKey(new Date());
  const router = useRouter();
  const { doc, patch, flush } = useCheckin(month);
  const onTime = isCheckinTime(month, new Date());
  const hasPeople = useHasPeople();
  const [solo, setSolo] = useState(false);
  const name = format(fromISO(month), "MMMM");

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/")), [router]);

  if (onTime && !doc.doneAt && hasPeople && !solo)
    return (
      <Screen>
        <PageTitle eyebrow="Monthly check-in" title={name} />
        <View style={{ marginTop: space.xl }}>
          <TogetherStep monthName={name} onSolo={() => setSolo(true)} />
        </View>
      </Screen>
    );

  const next = startOfMonth(addMonths(fromISO(month), 1));
  return (
    <Card
      month={month}
      onClose={close}
      ready={
        onTime
          ? {
              label: `I’m ready for ${format(next, "MMMM")} →`,
              onPress: () => {
                if (!doc.doneAt) patch({ doneAt: new Date().toISOString() });
                flush();
                router.replace({ pathname: "/month", params: { month: toISO(next) } });
              },
            }
          : null
      }
    />
  );
}

function Card({ month, onClose, ready }: { month: string; onClose: () => void; ready: { label: string; onPress: () => void } | null }) {
  const weeks = useMemo(() => monthWeeks(fromISO(month)), [month]);
  const { tasks, loading } = useMonthTasks(toISO(mondayOf(weeks[0]!.start)), toISO(mondayOf(weeks[weeks.length - 1]!.start)));
  const { quarter } = useCurrentQuarter();
  const { goals } = useGoals(quarter?.id ?? null);
  const { settings } = useSettings();
  const [note, setNote] = useState<string | null>(null);

  const recap = useMemo(() => buildRecap(month, { tasks, goals }), [month, tasks, goals]);
  const sky = useMemo(() => skyFor(month, recap.doneCount), [month, recap.doneCount]);

  if (loading)
    return (
      <Screen>
        <Hint>Gathering your month…</Hint>
      </Screen>
    );

  const share = async () => {
    const owner = settings.ownerName.trim();
    const text = recapShareText(month, recap, sky.line, areaLabel).replace(/^My /, owner ? `${owner}’s ` : "My ");
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      if (typeof navigator.share === "function") {
        try {
          return void (await navigator.share({ text }));
        } catch {
          /* cancelled — fall back to copy */
        }
      }
      await navigator.clipboard?.writeText(text);
      setNote("Copied — paste it to a friend. Or screenshot this page.");
    } else await Share.share({ message: text });
  };

  return <MonthCard month={month} recap={recap} sky={sky} areaLabel={areaLabel} onShare={share} shareNote={note} ready={ready} onClose={onClose} />;
}
