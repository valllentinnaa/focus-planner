-- Monthly check-ins: private by default, shared answers only to your people, cheers, meetups, voice notes.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.local'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.local'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.local');
update profiles set display_name = 'Ana' where id = '00000000-0000-4000-8000-00000000000a';
update profiles set display_name = 'Bo' where id = '00000000-0000-4000-8000-00000000000b';

-- A and B share a circle; C is an outsider.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into circles (id, name) values ('30000000-0000-4000-8000-0000000000c1', 'Friends');
reset role;
insert into circle_members (circle_id, user_id) values ('30000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000000b');

-- ======================= A writes a check-in =======================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into month_checkins (id, month, went_well, felt_heavy, try_next, went_well_audio, done_at)
values ('40000000-0000-4000-8000-000000000001', '2026-11-01', 'Shipped', 'Tired', 'Walk daily',
        '00000000-0000-4000-8000-00000000000a/2026-11/went_well.webm', now());
select throws_ok($$ insert into month_checkins (month) values ('2026-11-15') $$, '23514', null, 'month must be the 1st');
select throws_ok($$ update month_checkins set went_well_audio = '00000000-0000-4000-8000-00000000000b/x.webm' $$, '23514', null,
  'voice notes must sit in the owner''s folder');
select is(can_hear_voice('00000000-0000-4000-8000-00000000000a/2026-11/went_well.webm'), true, 'owner hears their own voice note');

-- ======================= private by default =======================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from month_checkins), 0, 'friends cannot read the table');
select is(jsonb_array_length(mates_checkins('2026-11-01')), 0, 'an unshared check-in is invisible to friends');
select is(can_hear_voice('00000000-0000-4000-8000-00000000000a/2026-11/went_well.webm'), false, 'unshared voice note cannot be heard');
select is(toggle_checkin_cheer('40000000-0000-4000-8000-000000000001'), false, 'cannot cheer an unshared check-in');

-- A shares only "what went well"
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
update month_checkins set share_fields = array['went_well'];
select throws_ok($$ update month_checkins set share_fields = array['secrets'] $$, '23514', null, 'only known answers can be shared');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is(mates_checkins('2026-11-01') -> 0 ->> 'went_well', 'Shipped', 'friend sees the shared answer');
select is(mates_checkins('2026-11-01') -> 0 ->> 'felt_heavy', null, 'friend does not see unshared answers');
select is(can_hear_voice('00000000-0000-4000-8000-00000000000a/2026-11/went_well.webm'), true, 'friend hears the shared voice note');
select is(toggle_checkin_cheer('40000000-0000-4000-8000-000000000001'), true, 'friend cheers');
select is((mates_checkins('2026-11-01') -> 0 ->> 'cheers')::int, 1, 'cheer is counted');
select is(toggle_checkin_cheer('40000000-0000-4000-8000-000000000001'), false, 'cheering again takes it back');
select is(toggle_checkin_cheer('40000000-0000-4000-8000-000000000001'), true, 'and again cheers');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(jsonb_array_length(mates_checkins('2026-11-01')), 0, 'outsiders see nothing');
select is(can_hear_voice('00000000-0000-4000-8000-00000000000a/2026-11/went_well.webm'), false, 'outsiders cannot hear voice notes');
select is(toggle_checkin_cheer('40000000-0000-4000-8000-000000000001'), false, 'outsiders cannot cheer');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is(my_checkin_cheers('2026-11-01') ->> 0, 'Bo', 'owner sees who cheered');

-- ======================= do it together =======================
insert into checkin_meetups (id, circle_id, starts_at, place)
values ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-0000000000c1', now() + interval '2 days', 'Cafe');
select is((upcoming_meetups() -> 0 -> 'going' ->> 0), 'Ana', 'host is in');
select throws_ok($$ insert into checkin_meetups (starts_at, link) values (now(), 'javascript:alert(1)') $$, '23514', null, 'only web links');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is(jsonb_array_length(upcoming_meetups()), 1, 'circle member sees the meetup');
select is(toggle_meetup_rsvp('50000000-0000-4000-8000-000000000001'), true, 'member says I''m in');
select is(jsonb_array_length(upcoming_meetups() -> 0 -> 'going'), 2, 'two going');
select throws_ok($$ insert into checkin_meetups (circle_id, starts_at) values ('30000000-0000-4000-8000-0000000000c9', now()) $$, '42501', null,
  'cannot host for a circle you are not in');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(jsonb_array_length(upcoming_meetups()), 0, 'outsiders do not see the meetup');
select is(toggle_meetup_rsvp('50000000-0000-4000-8000-000000000001'), false, 'outsiders cannot join');

select * from finish();
rollback;
