// Mirrors supabase/migrations. Regenerate once a project exists:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

type Table<Row extends object, Required extends keyof Row, Omitted extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Partial<Row>, Omitted> & Pick<Row, Required>;
  Update: Omit<Partial<Row>, Omitted>;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  display_name: string;
  show_daily: boolean;
  show_food: boolean;
  show_presents: boolean;
  menu_pages: string[];
  gender: string | null;
  onboarded_at: string | null;
  show_clipboard: boolean;
  daily_layout?: unknown;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_year?: number | null;
  share_birth_year?: boolean;
  dismissed_prompts?: string[];
  /** { work: "sky", … } — swatch names; see lib/area-colors. */
  area_colors?: unknown;
  show_area_colors?: boolean;
} & Timestamps;

export type WeekRow = {
  id: string;
  user_id: string;
  week_start: string;
  focus: string;
  notes: string;
  prompt_dismissed: boolean;
  focus_task_id?: string | null;
  focus_done?: boolean;
} & Timestamps;

export type DailyEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  gratitude: string;
  focus: string;
  notes: string;
  day_start: string;
  sleep: string;
  practices: string;
  vitamins: string;
  screen_time: string;
  steps: string;
  focus_done?: boolean;
  /** Answers to your own Daily journal fields: { [fieldId]: text }. */
  custom?: unknown;
} & Timestamps;

export type TaskArea = "personal" | "work" | "development";

export type TaskRow = {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  week_start: string;
  area: TaskArea | null;
  task_date: string | null;
  /** "HH:MM[:SS]" — only on a task that's on a day. */
  task_time?: string | null;
  /** A "times a week" habit placed on this day from the Week page; ticking it counts for the habit. */
  habit_id?: string | null;
  position: number;
} & Timestamps;

export type FoodWeekRow = {
  id: string;
  user_id: string;
  week_start: string;
  notes: string;
  schedule: Json;
} & Timestamps;

export type FoodItemRow = {
  id: string;
  user_id: string;
  week_start: string;
  list: "shopping" | "cooking";
  text: string;
  done: boolean;
  position: number;
  /** Cooking list only: the day of the week it's planned for. */
  cook_date?: string | null;
  /** Cooking list only: the time on that day ("19:00:00"). */
  cook_time?: string | null;
} & Timestamps;

export type PersonRow = {
  id: string;
  user_id: string;
  name: string;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
  notes: string;
  source: "manual" | "google" | "device" | "file";
  external_id: string | null;
  linked_user_id: string | null;
} & Timestamps;

export type GiftIdeaRow = {
  id: string;
  user_id: string;
  person_id: string;
  text: string;
  link: string | null;
  status: "idea" | "bought" | "given";
  given_year: number | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  position: number;
} & Timestamps;

export type WishlistItemRow = {
  id: string;
  user_id: string;
  text: string;
  link: string | null;
  note: string;
  position: number;
} & Timestamps;

/** iPhone share key: users see only when it was made / last used, never the hash. */
export type ShareTokenRow = { user_id: string; created_at: string; last_used_at: string | null };

export type EntitlementRow = { user_id: string; plan: "free" | "pro"; comped: boolean; updated_at: string };

export type ClipboardItemRow = {
  id: string;
  user_id: string;
  text: string;
  attention: boolean;
  position: number;
  /** Voice note in the private clipboard-voice bucket: "<user id>/<uuid>.<ext>". */
  audio_path?: string | null;
  audio_seconds?: number | null;
  /** Image in the private clipboard-images bucket: "<user id>/<uuid>.<ext>". */
  image_path?: string | null;
} & Timestamps;

export type VisionItemRow = {
  id: string;
  user_id: string;
  quarter_id: string;
  kind: "image" | "text";
  /** Image in the private vision-board bucket: "<user id>/<uuid>.<ext>". */
  file_path: string | null;
  text: string;
  position: number;
} & Timestamps;

export type WishlistShareRow = { user_id: string; token: string; created_at: string };

export type QuarterRow = {
  id: string;
  user_id: string;
  start_date: string;
  theme: string;
  notes: string;
} & Timestamps;

export type GoalRow = {
  id: string;
  user_id: string;
  quarter_id: string;
  area: "personal" | "work" | "development" | "habits";
  text: string;
  done: boolean;
  is_project: boolean;
  position: number;
  /** Unfinished goal that was brought into a later cycle or let go — no longer offered. */
  archived?: boolean;
  /** Copy into the next 12W cycle when it starts (used for habits). */
  carry_next?: boolean;
  /** The earlier goal this one was copied from (brought in, or a habit carried forward). */
  carried_from?: string | null;
  /** Habits: chosen weekdays as a bitmask (Mon = 1 … Sun = 64); null = not "chosen days". */
  habit_days?: number | null;
  /** Habits: N times (1–7) per habit_period, any days. Both null = every day. */
  habit_per_week?: number | null;
  /** Habits: what N counts over — "week" (default), "month" or "cycle" (the 12 weeks). */
  habit_period?: "week" | "month" | "cycle" | null;
} & Timestamps;

/** A repeating daily item that isn't a 12W goal (Vitamins). habit_days null = every day. */
export type RoutineRow = {
  id: string;
  user_id: string;
  kind: "vitamin";
  text: string;
  habit_days?: number | null;
  position: number;
  archived_at?: string | null;
} & Timestamps;
export type RoutineCheckRow = { id: string; user_id: string; routine_id: string; day: string; created_at: string; updated_at: string };

/** A habit ticked off on a day (one per habit per day). */
export type HabitCheckRow = { id: string; user_id: string; goal_id: string; day: string; created_at: string; updated_at: string };

export type GoalStepRow = {
  id: string;
  user_id: string;
  goal_id: string;
  text: string;
  done: boolean;
  position: number;
} & Timestamps;

export type MonthCheckinRow = {
  id: string;
  user_id: string;
  /** First day of the month (yyyy-MM-01). */
  month: string;
  went_well: string;
  felt_heavy: string;
  try_next: string;
  went_well_audio: string | null;
  felt_heavy_audio: string | null;
  try_next_audio: string | null;
  /** Which answers friends may see. Empty = private (the default). */
  share_fields: string[];
  done_at: string | null;
} & Timestamps;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      weeks: Table<WeekRow, "week_start">;
      daily_entries: Table<DailyEntryRow, "entry_date">;
      tasks: Table<TaskRow, "week_start">;
      food_weeks: Table<FoodWeekRow, "week_start">;
      food_items: Table<FoodItemRow, "week_start" | "list" | "text">;
      quarters: Table<QuarterRow, "start_date">;
      goals: Table<GoalRow, "quarter_id" | "area">;
      goal_steps: Table<GoalStepRow, "goal_id">;
      habit_checks: Table<HabitCheckRow, "goal_id" | "day">;
      routines: Table<RoutineRow, "kind" | "text">;
      routine_checks: Table<RoutineCheckRow, "routine_id" | "day">;
      people: Table<PersonRow, "name">;
      gift_ideas: Table<GiftIdeaRow, "person_id" | "text">;
      wishlist_items: Table<WishlistItemRow, "text">;
      clipboard_items: Table<ClipboardItemRow, never>;
      /** Read-only for users; written by the server. */
      share_tokens: Table<ShareTokenRow, "user_id">;
      entitlements: Table<EntitlementRow, "user_id" | "plan", "updated_at" | "comped">;
      vision_items: Table<VisionItemRow, "quarter_id" | "kind">;
      month_checkins: Table<MonthCheckinRow, "month">;
    };
    Views: Record<string, never>;
    Functions: {
      create_share_token: { Args: Record<string, never>; Returns: string };
      revoke_share_token: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
