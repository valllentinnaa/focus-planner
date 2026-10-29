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
} & Timestamps;

export type WeekRow = {
  id: string;
  user_id: string;
  week_start: string;
  focus: string;
  personal: string;
  work: string;
  development: string;
  notes: string;
  days: Json;
  prompt_dismissed: boolean;
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
  items: Json;
} & Timestamps;

export type MonthItemRow = {
  id: string;
  user_id: string;
  item_date: string;
  text: string;
  done: boolean;
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
} & Timestamps;

export type QuarterRow = {
  id: string;
  user_id: string;
  start_date: string;
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
} & Timestamps;

export type GoalStepRow = {
  id: string;
  user_id: string;
  goal_id: string;
  text: string;
  done: boolean;
  position: number;
} & Timestamps;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      weeks: Table<WeekRow, "week_start">;
      daily_entries: Table<DailyEntryRow, "entry_date">;
      month_items: Table<MonthItemRow, "item_date">;
      food_weeks: Table<FoodWeekRow, "week_start">;
      food_items: Table<FoodItemRow, "week_start" | "list" | "text">;
      quarters: Table<QuarterRow, "start_date">;
      goals: Table<GoalRow, "quarter_id" | "area">;
      goal_steps: Table<GoalStepRow, "goal_id">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
