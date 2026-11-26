-- Your own birthday, so friends and circle-mates know it automatically.
--
-- Stored on profiles (one row per user, owner-only RLS). Others never read profiles directly:
-- they get birthdays only through mate_birthdays(), and only for people they're connected with
-- or share a circle with. The birth year is shared only if you choose to (default: hidden).
-- People entries linked to a friend read that friend's birthday live — nothing is copied, so a
-- change shows up everywhere at once.

alter table public.profiles
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_day smallint check (birth_day between 1 and 31),
  add column birth_year smallint check (birth_year between 1900 and 2100),
  add column share_birth_year boolean not null default false,
  -- Gentle one-time prompts the user closed ("presents", "wishlist"); kept server-side so they
  -- don't come back on another device.
  add column dismissed_prompts text[] not null default '{}' check (cardinality(dismissed_prompts) <= 20);

alter table public.profiles
  add constraint profiles_birthday_complete check ((birth_month is null) = (birth_day is null)),
  add constraint profiles_birth_year_needs_day check (birth_year is null or birth_month is not null),
  add constraint profiles_birthday_real check (
    birth_month is null
    or birth_day <= case birth_month when 2 then 29 when 4 then 30 when 6 then 30 when 9 then 30 when 11 then 30 else 31 end);

/**
 * Birthdays of everyone you share wishlists with (friends + circle-mates), deduplicated.
 * Both branches hit indexes: connections (PK user_a…, connections_b) and circle_members
 * (circle_members_user, PK circle_id…).
 */
create or replace function public.mate_birthdays()
returns table (user_id uuid, birth_month smallint, birth_day smallint, birth_year smallint)
language sql stable security definer set search_path = public as $$
  with mates as (
    select c.user_b as id from connections c where c.user_a = auth.uid()
    union
    select c.user_a from connections c where c.user_b = auth.uid()
    union
    select b.user_id from circle_members a join circle_members b on b.circle_id = a.circle_id
      where a.user_id = auth.uid() and b.user_id <> auth.uid()
  )
  select p.id, p.birth_month, p.birth_day, case when p.share_birth_year then p.birth_year end
  from mates m join profiles p on p.id = m.id
  where p.birth_month is not null;
$$;
revoke all on function public.mate_birthdays() from public;
grant execute on function public.mate_birthdays() to authenticated;
