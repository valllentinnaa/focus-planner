-- Sharing: wishlist links, claims (hidden from the owner), circles, profile links / connections.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.local'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.local'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.local');
update profiles set display_name = 'Ana' where id = '00000000-0000-4000-8000-00000000000a';

-- Scratch space to carry tokens between roles (rolled back at the end).
create table public._t (k text primary key, v text);
grant all on public._t to anon, authenticated;

-- ======================= wishlist share link =======================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into wishlist_items (id, text, position) values
  ('20000000-0000-4000-8000-000000000001', 'Book', 0),
  ('20000000-0000-4000-8000-000000000002', 'Scarf', 1);

select throws_ok($$ insert into wishlist_shares (user_id, token) values (auth.uid(), repeat('a', 32)) $$, '42501', null,
  'the client cannot choose its own share token');
insert into wishlist_shares (user_id) values (auth.uid());
insert into _t select 'share', token from wishlist_shares;
select ok((select v ~ '^[0-9a-f]{32}$' from _t where k = 'share'), 'share token is 32 hex chars');

-- anon visitor
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(get_shared_wishlist(repeat('0', 32)), null, 'unknown token returns nothing');
select is(get_shared_wishlist('not-a-token'), null, 'malformed token returns nothing');
select is(get_shared_wishlist((select v from _t where k = 'share')) ->> 'owner', 'Ana', 'visitor sees the owner''s name');
select is(jsonb_array_length(get_shared_wishlist((select v from _t where k = 'share')) -> 'items'), 2, 'visitor sees both items');
select throws_ok($$ select * from wishlist_claims $$, '42501', null, 'visitors cannot read claims');

select is(claim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000001', repeat('k', 40)), true, 'visitor claims an item');
select is(claim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000001', repeat('z', 40)), false, 'a second claim on the same item fails');
select is(claim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000002', 'short'), false, 'too-short claim key is refused');
select is((get_shared_wishlist((select v from _t where k = 'share')) -> 'items' -> 0 ->> 'claimed')::boolean, true, 'visitors see the item as claimed');
select is(unclaim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000001', repeat('z', 40)), false, 'wrong key cannot undo a claim');

-- owner opens their own link: claims stay hidden
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is((get_shared_wishlist((select v from _t where k = 'share')) ->> 'is_owner')::boolean, true, 'owner is recognised');
select is((get_shared_wishlist((select v from _t where k = 'share')) -> 'items' -> 0 ->> 'claimed')::boolean, false, 'owner never sees claims');
select throws_ok($$ select * from wishlist_claims $$, '42501', null, 'owner cannot read the claims table');
select is(claim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000002', repeat('o', 40)), false, 'owner cannot claim (and so probe) own items');

-- visitor undoes with the right key
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(unclaim_wishlist_item((select v from _t where k = 'share'), '20000000-0000-4000-8000-000000000001', repeat('k', 40)), true, 'right key undoes the claim');

-- turning the link off kills it
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
delete from wishlist_shares;
select is(get_shared_wishlist((select v from _t where k = 'share')), null, 'old link stops working after turning it off');

-- ======================= circles =======================
insert into circles (id, name) values ('30000000-0000-4000-8000-000000000001', 'Family');
select is((select count(*)::int from circle_members where circle_id = '30000000-0000-4000-8000-000000000001'), 1, 'creator is a member');
select is(jsonb_array_length(my_circles()), 1, 'creator sees the circle');
insert into _t values ('invite', my_circles() -> 0 ->> 'invite_token');
select ok((select v ~ '^[0-9a-f]{32}$' from _t where k = 'invite'), 'owner sees the invite token');
select throws_ok($$ select invite_token from circles $$, '42501', null, 'invite token is not readable from the table');

-- B: outsider, then joins
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from circles), 0, 'outsider cannot see the circle');
select is(circle_wishlist('00000000-0000-4000-8000-00000000000a'), null, 'outsider cannot see A''s wishlist');
select throws_ok($$ insert into circle_members (circle_id, user_id) values ('30000000-0000-4000-8000-000000000001', auth.uid()) $$, '42501', null,
  'cannot join without the invite');
select is(join_circle(repeat('0', 32)), null, 'a wrong invite joins nothing');
select is(join_circle((select v from _t where k = 'invite')), '30000000-0000-4000-8000-000000000001'::uuid, 'B joins with the invite');
select is(my_circles() -> 0 ->> 'invite_token', null, 'members who aren''t the owner don''t get the invite token');
select is(jsonb_array_length(circle_wishlist('00000000-0000-4000-8000-00000000000a') -> 'items'), 2, 'member sees A''s wishlist');
select is(circle_claim('20000000-0000-4000-8000-000000000002'), true, 'member claims an item');
select is((circle_wishlist('00000000-0000-4000-8000-00000000000a') -> 'items' -> 1 ->> 'mine')::boolean, true, 'member sees it as theirs');
delete from circle_members where user_id = '00000000-0000-4000-8000-00000000000a';
select is((select count(*)::int from circle_members where user_id = '00000000-0000-4000-8000-00000000000a'), 1, 'a member cannot remove someone else');
select is(reset_circle_invite('30000000-0000-4000-8000-000000000001'), null, 'only the owner can reset the invite');

-- A: never sees the claim; resets the invite
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is(circle_wishlist('00000000-0000-4000-8000-00000000000a'), null, 'you cannot view your own list as a circle-mate');
select ok(reset_circle_invite('30000000-0000-4000-8000-000000000001') is not null, 'owner resets the invite');

-- C: old invite no longer works
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(join_circle((select v from _t where k = 'invite')), null, 'old invite stops working after reset');
select is(circle_claim('20000000-0000-4000-8000-000000000001'), false, 'non-member cannot claim');

-- B leaves → loses access
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
delete from circle_members where user_id = auth.uid();
select is(circle_wishlist('00000000-0000-4000-8000-00000000000a'), null, 'after leaving, the wishlist is gone');

-- ======================= profile link / connections =======================
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
insert into profile_links (user_id) values (auth.uid());
insert into _t select 'profile', token from profile_links;

reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(profile_preview((select v from _t where k = 'profile')) ->> 'name', 'Ana', 'anyone with the link sees who invited them');
select throws_ok($$ select connect_with((select v from _t where k = 'profile')) $$, '42501', null, 'signed-out visitors cannot connect');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(connect_with((select v from _t where k = 'profile')), true, 'C connects with A');
select is(jsonb_array_length(my_connections()), 1, 'C sees the connection');
select is(jsonb_array_length(circle_wishlist('00000000-0000-4000-8000-00000000000a') -> 'items'), 2, 'connected people see each other''s wishlists');
select throws_ok($$ insert into connections values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000c') $$, '42501', null,
  'connections cannot be inserted directly');
delete from connections;
select is(circle_wishlist('00000000-0000-4000-8000-00000000000a'), null, 'after disconnecting, the wishlist is gone');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is(connect_with((select v from _t where k = 'profile')), false, 'you cannot connect with yourself');

select * from finish();
rollback;
