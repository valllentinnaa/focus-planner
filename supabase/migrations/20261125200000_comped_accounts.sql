-- Comped accounts: full Pro access, never billed. The email list lives in a table no user can
-- read or write (RLS on, no policies); add emails from the SQL Editor only.
-- Accounts that already exist get Pro right away; ones that sign up later get it at sign-up.

alter table public.entitlements add column if not exists comped boolean not null default false;
comment on column public.entitlements.comped is
  'Free Pro, never billed. Payment webhooks must never downgrade or charge a comped row.';

create table if not exists public.comped_emails (
  email text primary key check (email = lower(email) and email like '%@%'),
  note text,
  created_at timestamptz not null default now()
);
alter table public.comped_emails enable row level security;
revoke all on public.comped_emails from anon, authenticated;

-- Give Pro to every account whose email is on the list (safe to run any number of times).
create or replace function public.apply_comped_emails() returns void
language sql security definer set search_path = '' as $$
  insert into public.entitlements (user_id, plan, comped, updated_at)
  select u.id, 'pro', true, now()
  from auth.users u join public.comped_emails c on c.email = lower(u.email)
  on conflict (user_id) do update set plan = 'pro', comped = true, updated_at = now();
$$;
revoke all on function public.apply_comped_emails() from public, anon, authenticated;

create or replace function public.comped_emails_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.apply_comped_emails(); return null; end $$;
drop trigger if exists comped_emails_changed on public.comped_emails;
create trigger comped_emails_changed after insert or update on public.comped_emails
  for each statement execute function public.comped_emails_changed();

-- New sign-ups whose email is on the list.
create or replace function public.comp_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.comped_emails c where c.email = lower(new.email)) then
    insert into public.entitlements (user_id, plan, comped) values (new.id, 'pro', true)
    on conflict (user_id) do update set plan = 'pro', comped = true, updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists comp_new_user on auth.users;
create trigger comp_new_user after insert on auth.users
  for each row execute function public.comp_new_user();
