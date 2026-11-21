// Google Calendar (read-only). Talks to the `google-calendar` edge function, which holds the Google
// tokens; the client only ever sees event data. "Remove" hides an event in the planner — Google is
// never changed. Not available in demo mode (there is no backend to hold the tokens).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo } from "react";
import { Platform } from "react-native";
import { eventsByDay, rangeBounds, type CalendarEvent } from "@/lib/calendar-events";
import { env } from "@/lib/env";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";

export const calendarAvailable = !env.demo;

export type CalendarSource = { id: string; connection_id: string; calendar_id: string; summary: string; color: string; enabled: boolean };
export type CalendarAccount = { id: string; email: string; calendars: CalendarSource[] };
type AccountError = { account: string; error: "reconnect" | "failed" };

export async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`google-calendar/${action}`, { body });
  if (error) throw error;
  return data as T;
}

export function useCalendarStatus() {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["gcal", userId, "status"],
    enabled: calendarAvailable && !!userId,
    queryFn: () => call<{ accounts: CalendarAccount[] }>("status"),
    staleTime: 5 * 60_000,
  });
  return { accounts: q.data?.accounts ?? [], loading: q.isLoading, error: q.error };
}

function useHidden() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["gcal", userId, "hidden"],
    enabled: calendarAvailable && !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb.from("hidden_calendar_events").select("event_key");
      if (error) throw error;
      return new Set((data ?? []).map((r: { event_key: string }) => r.event_key));
    },
    staleTime: Infinity,
  });
}

/** Events from the enabled calendars for a range of days, grouped by day, minus removed ones. */
export function useCalendarEvents(firstISO: string, lastISO: string) {
  const userId = useUserId();
  const hidden = useHidden();
  const status = useCalendarStatus();
  const connected = status.accounts.length > 0;
  const q = useQuery({
    queryKey: ["gcal", userId, "events", firstISO, lastISO],
    enabled: calendarAvailable && !!userId && connected,
    queryFn: () => call<{ events: CalendarEvent[]; errors: AccountError[] }>("events", rangeBounds(firstISO, lastISO)),
    staleTime: 5 * 60_000,
  });
  const byDay = useMemo(() => eventsByDay(q.data?.events ?? [], hidden.data), [q.data, hidden.data]);
  return { byDay, errors: q.data?.errors ?? [], connected };
}

export function useCalendarOps() {
  const qc = useQueryClient();
  const userId = useUserId();
  const refreshAll = useCallback(() => qc.invalidateQueries({ queryKey: ["gcal"] }), [qc]);

  const hide = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await rawDb.from("hidden_calendar_events").upsert({ event_key: key }, { onConflict: "user_id,event_key", ignoreDuplicates: true });
      if (error) throw error;
    },
    onMutate: (key) => qc.setQueryData<Set<string>>(["gcal", userId, "hidden"], (cur) => new Set([...(cur ?? []), key])),
    onError: () => qc.invalidateQueries({ queryKey: ["gcal", userId, "hidden"] }),
  });

  const restoreHidden = useMutation({
    mutationFn: async () => {
      const { error } = await rawDb.from("hidden_calendar_events").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.setQueryData(["gcal", userId, "hidden"], new Set()),
  });

  const setEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await rawDb.from("calendar_sources").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, enabled }) =>
      qc.setQueryData<{ accounts: CalendarAccount[] }>(["gcal", userId, "status"], (cur) =>
        cur && { accounts: cur.accounts.map((a) => ({ ...a, calendars: a.calendars.map((c) => (c.id === id ? { ...c, enabled } : c)) })) },
      ),
    onSettled: refreshAll,
  });

  const disconnect = useMutation({ mutationFn: (connectionId: string) => call("disconnect", { connectionId }), onSettled: refreshAll });
  const resync = useMutation({ mutationFn: () => call("refresh"), onSettled: refreshAll });

  /**
   * Send the user to Google to connect an account. Web: full-page redirect back to `path`.
   * `contacts` also asks for read-only contacts (Presents import).
   */
  const connect = useCallback(async (opts?: { contacts?: boolean; path?: "settings" | "presents" }) => {
    const path = opts?.path ?? "settings";
    const returnTo = Platform.OS === "web" ? `${window.location.origin}/${path}` : Linking.createURL(path);
    const { url } = await call<{ url: string }>("auth-url", { returnTo, contacts: !!opts?.contacts });
    if (Platform.OS === "web") {
      window.location.assign(url);
      return;
    }
    await WebBrowser.openAuthSessionAsync(url, returnTo);
    await refreshAll();
  }, [refreshAll]);

  return {
    connect,
    hide: (key: string) => hide.mutate(key),
    restoreHidden: () => restoreHidden.mutate(),
    setEnabled: (id: string, enabled: boolean) => setEnabled.mutate({ id, enabled }),
    disconnect: (connectionId: string) => disconnect.mutate(connectionId),
    resync: () => resync.mutate(),
    refreshAll,
    busy: disconnect.isPending || resync.isPending,
  };
}
