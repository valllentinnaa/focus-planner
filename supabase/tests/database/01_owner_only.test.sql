-- Owner-only data: people, gift ideas, wishlist items, gift files. Nobody else can read or write them.
-- Run: npx supabase start && npx supabase test db   (local stack only; everything is rolled back)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.local'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.local');

-- ---------- as A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into people (id, name, birth_month, birth_day) values ('10000000-0000-4000-8000-000000000001', 'Ana', 3, 27);
insert into gift_ideas (person_id, text) values ('10000000-0000-4000-8000-000000000001', 'Lego');
insert into wishlist_items (id, text) values ('20000000-0000-4000-8000-000000000001', 'Book');

select is((select count(*)::int from people), 1, 'A sees own person');
select is((select count(*)::int from gift_ideas), 1, 'A sees own gift idea');
select is((select count(*)::int from wishlist_items), 1, 'A sees own wishlist item');
select throws_ok($$ insert into people (name, birth_month, birth_day) values ('Bad', 2, 31) $$, '23514', null, 'impossible birthday is rejected');
select throws_ok($$ insert into gift_ideas (person_id, text, link) values ('10000000-0000-4000-8000-000000000001', 'x', 'javascript:alert(1)') $$, '23514', null, 'non-http link is rejected');

-- ---------- as B ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

select is((select count(*)::int from people), 0, 'B cannot see A''s people');
select is((select count(*)::int from gift_ideas), 0, 'B cannot see A''s gift ideas');
select is((select count(*)::int from wishlist_items), 0, 'B cannot read A''s wishlist directly');
select throws_ok(
  $$ insert into gift_ideas (person_id, text) values ('10000000-0000-4000-8000-000000000001', 'sneaky') $$,
  'P0001', 'person not found', 'B cannot attach a gift idea to A''s person');
select throws_ok(
  $$ insert into people (user_id, name) values ('00000000-0000-4000-8000-00000000000a', 'planted') $$,
  '42501', null, 'B cannot write rows as A');

update people set name = 'hacked' where id = '10000000-0000-4000-8000-000000000001';
delete from wishlist_items where id = '20000000-0000-4000-8000-000000000001';

-- Gift files: B cannot upload into A's folder.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gift-files', '00000000-0000-4000-8000-00000000000a/x.png') $$,
  '42501', null, 'B cannot upload into A''s gift-files folder');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gift-files', '00000000-0000-4000-8000-00000000000b/x.png') $$,
  'B can upload into own folder');

-- ---------- as anon ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select throws_ok($$ select * from people $$, '42501', null, 'anon has no access to people');
select throws_ok($$ select * from wishlist_items $$, '42501', null, 'anon has no access to wishlist items');

-- ---------- back as owner: B's update/delete did nothing ----------
reset role;
select is((select name from people where id = '10000000-0000-4000-8000-000000000001'), 'Ana', 'B''s update did not touch A''s person');
select is((select count(*)::int from wishlist_items where id = '20000000-0000-4000-8000-000000000001'), 1, 'B''s delete did not touch A''s item');

select * from finish();
rollback;
