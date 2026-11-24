// Demo-mode database: a tiny PostgREST-shaped client over AsyncStorage. Only the chain the data
// hooks use is supported (select/eq/gte/lte/order/limit/maybeSingle/single, insert, upsert, update,
// delete), plus the 12W cycle functions (rpc) mirrored from 20261124200000_quarter_cycle_functions.sql.
// It exists so the app can be explored without a Supabase project; never used otherwise.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

type Row = Record<string, unknown>;
type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const PREFIX = "fp.demo.";

const defaultsFor: Record<string, () => Row> = {
  profiles: () => ({ display_name: "", gender: null, onboarded_at: null, show_daily: true, show_food: true, show_presents: true, menu_pages: ["quarter", "clipboard"], show_clipboard: true }),
  weeks: () => ({ focus: "", notes: "", prompt_dismissed: false, focus_task_id: null, focus_done: false }),
  daily_entries: () => ({
    gratitude: "",
    focus: "",
    notes: "",
    day_start: "",
    sleep: "",
    practices: "",
    vitamins: "",
    screen_time: "",
    steps: "",
  }),
  tasks: () => ({ text: "", done: false, area: null, task_date: null, position: 0 }),
  food_weeks: () => ({ notes: "", schedule: ["", "", "", "", "", "", ""] }),
  food_items: () => ({ done: false, position: 0 }),
  quarters: () => ({ theme: "", notes: "" }),
  goals: () => ({ text: "", done: false, is_project: false, position: 0, archived: false, carry_next: false, carried_from: null }),
  goal_steps: () => ({ text: "", done: false, position: 0 }),
  vision_items: () => ({ file_path: null, text: "", position: 0 }),
  clipboard_items: () => ({ text: "", attention: false, position: 0 }),
  people: () => ({ birth_month: null, birth_day: null, birth_year: null, notes: "", source: "manual", external_id: null, linked_user_id: null }),
  wishlist_items: () => ({ link: null, note: "", position: 0 }),
  month_checkins: () => ({ went_well: "", felt_heavy: "", try_next: "", went_well_audio: null, felt_heavy_audio: null, try_next_audio: null, share_fields: [], done_at: null }),
  gift_ideas: () => ({ link: null, status: "idea", given_year: null, file_path: null, file_name: null, file_type: null, position: 0 }),
};

async function load(table: string): Promise<Row[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PREFIX + table)) ?? "[]") as Row[];
  } catch {
    return [];
  }
}
const store = (table: string, rows: Row[]) => AsyncStorage.setItem(PREFIX + table, JSON.stringify(rows));

const stamp = (table: string, row: Row): Row => {
  const now = new Date().toISOString();
  return { id: Crypto.randomUUID(), user_id: DEMO_USER_ID, created_at: now, ...defaultsFor[table]?.(), ...row, updated_at: now };
};

type Filter = (r: Row) => boolean;

class Query implements PromiseLike<Result<unknown>> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private op: { kind: "select" } | { kind: "insert"; rows: Row[] } | { kind: "upsert"; rows: Row[]; conflict: string[] } | { kind: "update"; change: Row } | { kind: "delete" } = { kind: "select" };
  private returning = false;

  constructor(private table: string) {}

  select() { this.returning = true; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
  gte(col: string, val: string) { this.filters.push((r) => String(r[col]) >= val); return this; }
  lte(col: string, val: string) { this.filters.push((r) => String(r[col]) <= val); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  insert(rows: Row | Row[]) { this.op = { kind: "insert", rows: Array.isArray(rows) ? rows : [rows] }; return this; }
  upsert(rows: Row | Row[], o?: { onConflict?: string }) {
    this.op = { kind: "upsert", rows: Array.isArray(rows) ? rows : [rows], conflict: (o?.onConflict ?? "id").split(",") };
    return this;
  }
  update(change: Row) { this.op = { kind: "update", change }; return this; }
  delete() { this.op = { kind: "delete" }; return this; }

  private async run(): Promise<Result<unknown>> {
    let rows = await load(this.table);
    const matches = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[] = [];
    switch (this.op.kind) {
      case "insert":
        out = this.op.rows.map((r) => stamp(this.table, r));
        rows = [...rows, ...out];
        await store(this.table, rows);
        break;
      case "upsert": {
        const conflict = this.op.conflict;
        for (const incoming of this.op.rows) {
          const probe: Row = { user_id: DEMO_USER_ID, ...incoming };
          const idx = rows.findIndex((r) => conflict.every((c) => r[c] === probe[c]));
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...incoming, updated_at: new Date().toISOString() };
            out.push(rows[idx]!);
          } else {
            const created = stamp(this.table, incoming);
            rows.push(created);
            out.push(created);
          }
        }
        await store(this.table, rows);
        break;
      }
      case "update":
        rows = rows.map((r) => (matches(r) ? { ...r, ...this.op.kind === "update" ? this.op.change : {}, updated_at: new Date().toISOString() } : r));
        out = rows.filter(matches);
        await store(this.table, rows);
        break;
      case "delete":
        out = rows.filter(matches);
        await store(this.table, rows.filter((r) => !matches(r)));
        break;
      case "select":
        out = rows.filter(matches);
    }
    for (const o of [...this.orders].reverse())
      out.sort((a, b) => (String(a[o.col]) < String(b[o.col]) ? -1 : String(a[o.col]) > String(b[o.col]) ? 1 : 0) * (o.asc ? 1 : -1));
    if (this.max !== null) out = out.slice(0, this.max);
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    if (this.mode === "single") return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "No rows" } };
    return { data: this.returning || this.op.kind === "select" ? out : null, error: null };
  }

  then<R1 = Result<unknown>, R2 = never>(
    onfulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ) {
    return this.run().then(onfulfilled, onrejected);
  }
}

// ---------- 12W cycle functions (same rules as the SQL versions) ----------
const fail = (message: string): Result<null> => ({ data: null, error: { message } });
const norm = (t: unknown) => String(t ?? "").trim().toLowerCase();
const byStart = (a: Row, b: Row) => (String(a.start_date) < String(b.start_date) ? 1 : -1);

async function copyGoal(goals: Row[], steps: Row[], g: Row, quarterId: string, position: number) {
  const copy = stamp("goals", {
    quarter_id: quarterId, area: g.area, text: String(g.text).trim(), is_project: g.is_project,
    carry_next: g.carry_next ?? false, position, carried_from: g.id,
  });
  goals.push(copy);
  if (g.is_project) {
    steps
      .filter((st) => st.goal_id === g.id && !st.done && String(st.text).trim())
      .sort((a, b) => Number(a.position) - Number(b.position))
      .forEach((st, i) => steps.push(stamp("goal_steps", { goal_id: copy.id, text: String(st.text).trim(), position: i })));
  }
  return copy.id as string;
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<Result<unknown>> {
  const quarters = await load("quarters");
  const goals = await load("goals");
  const steps = await load("goal_steps");
  const current = [...quarters].sort(byStart)[0];
  const save = async () => {
    await store("quarters", quarters);
    await store("goals", goals);
    await store("goal_steps", steps);
  };

  if (fn === "start_next_quarter") {
    const start = String(args.p_start);
    const carry = new Set((args.p_carry as string[] | undefined) ?? []);
    if (current && start <= String(current.start_date)) return fail(`The next cycle must start after ${current.start_date}`);
    const next = stamp("quarters", { start_date: start });
    quarters.push(next);
    if (current) {
      const picked = goals
        .filter((g) => g.quarter_id === current.id && String(g.text).trim() && !g.archived)
        .filter((g) => (g.area === "habits" && g.carry_next) || (carry.has(String(g.id)) && !g.done))
        .sort((a, b) => String(a.area).localeCompare(String(b.area)) || Number(a.position) - Number(b.position));
      for (const g of picked) {
        await copyGoal(goals, steps, g, String(next.id), goals.filter((x) => x.quarter_id === next.id && x.area === g.area).length);
        g.archived = true;
      }
    }
    await save();
    return { data: next, error: null };
  }

  const g = goals.find((x) => x.id === args.p_goal);
  if (!g) return fail("Goal not found");
  const sameOpenElsewhere = (x: Row) =>
    x.quarter_id !== current?.id && !x.done && !x.archived && x.area === g.area && norm(x.text) === norm(g.text);

  if (fn === "bring_in_goal") {
    if (g.archived) return fail("Already brought in or let go");
    if (!current || g.quarter_id === current.id) return fail("Goal is already in the current cycle");
    const id = await copyGoal(goals, steps, g, String(current.id), goals.filter((x) => x.quarter_id === current.id && x.area === g.area).length);
    goals.filter(sameOpenElsewhere).forEach((x) => (x.archived = true));
    await save();
    return { data: id, error: null };
  }
  if (fn === "let_go_goal") {
    goals.filter(sameOpenElsewhere).forEach((x) => (x.archived = true));
    await save();
    return { data: null, error: null };
  }
  return fail(`Unknown function ${fn}`);
}

export function createFakeDb() {
  return { from: (table: string) => new Query(table), rpc };
}

export async function clearDemoData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(keys);
}
