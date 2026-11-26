-- Your birthday: visible to friends/circle-mates only, year only if you choose.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.local'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.local'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.local');
-- A and B are connected; C is a stranger.
insert into connections (user_a, user_b) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select throws_ok($$ update profiles set birth_month = 2, birth_day = 30 where id = auth.uid() $$, '23514', null, 'impossible date rejected');
select throws_ok($$ update profiles set birth_month = 3 where id = auth.uid() $$, '23514', null, 'month without day rejected');
update profiles set birth_month = 3, birth_day = 27, birth_year = 1990 where id = auth.uid();

-- B (friend) sees the day, not the year
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from profiles where id = '00000000-0000-4000-8000-00000000000a'), 0, 'friends cannot read the profile row itself');
select is((select birth_day from mate_birthdays() where user_id = '00000000-0000-4000-8000-00000000000a'), 27::smallint, 'friend sees the birthday');
select is((select birth_year from mate_birthdays() where user_id = '00000000-0000-4000-8000-00000000000a'), null, 'year hidden by default');

-- A shares the year
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
update profiles set share_birth_year = true where id = auth.uid();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select birth_year from mate_birthdays() where user_id = '00000000-0000-4000-8000-00000000000a'), 1990::smallint, 'year shown once shared');

-- C (stranger) sees nothing
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is((select count(*)::int from mate_birthdays()), 0, 'strangers see no birthdays');

reset role;
set local role anon;
select throws_ok($$ select * from mate_birthdays() $$, '42501', null, 'signed-out visitors cannot call it');

select * from finish();
rollback;
