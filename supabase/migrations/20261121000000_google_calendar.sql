-- Google Calendar (read-only) — connected accounts, which calendars to show, and events the user
-- removed from the planner. Events themselves are never stored: they are fetched live from Google
-- by the `google-calendar` edge function.

-- ---------- connected Google accounts ----------
-- Holds the (encrypted) refresh token, so the client gets NO access at all: RLS is on with no
-- policies, and every grant is revoked. Only the edge function (service role) reads or writes it.
create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_sub text not null,
  email text not null default '',
  -- AES-256-GCM ciphertext (base64 "iv.ciphertext"), key held only in the function's secrets.
  refresh_token_enc text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_sub)
);
create trigger google_connections_updated_at before update on public.google_connections
  for each row execute function public.set_updated_at();
alter table public.google_connections enable row level security;
alter table public.google_connections force row level security;
revoke all on public.google_connections from anon, authenticated;

-- ---------- calendars of each account (user picks which ones show) ----------
create table public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  connection_id uuid not null references public.google_connections (id) on delete cascade,
  calendar_id text not null,
  summary text not null default '',
  color text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, calendar_id)
);
create index calendar_sources_user on public.calendar_sources (user_id);
create trigger calendar_sources_updated_at before update on public.calendar_sources
  for each row execute function public.set_updated_at();
alter table public.calendar_sources enable row level security;
alter table public.calendar_sources force row level security;
-- The client may read its calendars and flip `enabled`; rows are created/removed by the function.
create policy "calendar_sources owner select" on public.calendar_sources for select to authenticated using (user_id = auth.uid());
create policy "calendar_sources owner update" on public.calendar_sources for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.calendar_sources from anon;
revoke insert, delete on public.calendar_sources from authenticated;
revoke update on public.calendar_sources from authenticated;
grant update (enabled) on public.calendar_sources to authenticated;

-- ---------- events removed from the planner (hidden here only, untouched in Google) ----------
create table public.hidden_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- "<calendar_id>|<event instance id>": a recurring event hides one occurrence at a time.
  event_key text not null check (char_length(event_key) <= 1200),
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);
alter table public.hidden_calendar_events enable row level security;
alter table public.hidden_calendar_events force row level security;
create policy "hidden_calendar_events owner select" on public.hidden_calendar_events for select to authenticated using (user_id = auth.uid());
create policy "hidden_calendar_events owner insert" on public.hidden_calendar_events for insert to authenticated with check (user_id = auth.uid());
create policy "hidden_calendar_events owner delete" on public.hidden_calendar_events for delete to authenticated using (user_id = auth.uid());
revoke all on public.hidden_calendar_events from anon;
