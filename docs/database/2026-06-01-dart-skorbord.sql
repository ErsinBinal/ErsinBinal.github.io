-- Faz 4: Dart Skorbord maclari ve detayli atis istatistikleri.
-- Supabase SQL Editor'de bir kez calistirin.

create table if not exists public.dart_matches (
  id uuid primary key default gen_random_uuid(),
  red_user_id uuid not null references auth.users(id) on delete cascade,
  blue_user_id uuid not null references auth.users(id) on delete cascade,
  winner_user_id uuid references auth.users(id) on delete set null,
  winner_slot text check (winner_slot in ('RED', 'BLUE')),
  start_score integer not null default 501 check (start_score > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  red_final_score integer not null default 501 check (red_final_score >= 0),
  blue_final_score integer not null default 501 check (blue_final_score >= 0),
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  summary jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dart_matches_distinct_players check (red_user_id <> blue_user_id),
  constraint dart_matches_winner_participant check (
    winner_user_id is null
    or winner_user_id = red_user_id
    or winner_user_id = blue_user_id
  )
);

create table if not exists public.dart_throws (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.dart_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_slot text not null check (player_slot in ('RED', 'BLUE')),
  turn_number integer not null check (turn_number > 0),
  dart_number integer not null check (dart_number between 1 and 3),
  dart_value integer not null check (dart_value between 0 and 60),
  turn_total integer not null default 0 check (turn_total >= 0),
  remaining_score integer not null check (remaining_score >= 0),
  is_bust boolean not null default false,
  is_winning_throw boolean not null default false,
  thrown_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (match_id, player_slot, turn_number, dart_number)
);

create index if not exists dart_matches_red_user_created_idx
  on public.dart_matches (red_user_id, created_at desc);

create index if not exists dart_matches_blue_user_created_idx
  on public.dart_matches (blue_user_id, created_at desc);

create index if not exists dart_matches_winner_created_idx
  on public.dart_matches (winner_user_id, created_at desc);

create index if not exists dart_throws_match_turn_idx
  on public.dart_throws (match_id, turn_number, dart_number);

create index if not exists dart_throws_user_created_idx
  on public.dart_throws (user_id, created_at desc);

alter table public.dart_matches enable row level security;
alter table public.dart_throws enable row level security;

drop policy if exists "Dart participants read matches" on public.dart_matches;
create policy "Dart participants read matches"
on public.dart_matches
for select
to authenticated
using (red_user_id = auth.uid() or blue_user_id = auth.uid() or public.is_admin());

drop policy if exists "Dart participants create matches" on public.dart_matches;
create policy "Dart participants create matches"
on public.dart_matches
for insert
to authenticated
with check (red_user_id = auth.uid() or blue_user_id = auth.uid());

drop policy if exists "Dart participants update matches" on public.dart_matches;
create policy "Dart participants update matches"
on public.dart_matches
for update
to authenticated
using (red_user_id = auth.uid() or blue_user_id = auth.uid() or public.is_admin())
with check (red_user_id = auth.uid() or blue_user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins delete dart matches" on public.dart_matches;
create policy "Admins delete dart matches"
on public.dart_matches
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Dart participants read throws" on public.dart_throws;
create policy "Dart participants read throws"
on public.dart_throws
for select
to authenticated
using (
  exists (
    select 1
    from public.dart_matches m
    where m.id = dart_throws.match_id
      and (m.red_user_id = auth.uid() or m.blue_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Dart players create own throws" on public.dart_throws;
create policy "Dart players create own throws"
on public.dart_throws
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.dart_matches m
    where m.id = dart_throws.match_id
      and (
        (dart_throws.player_slot = 'RED' and m.red_user_id = auth.uid())
        or (dart_throws.player_slot = 'BLUE' and m.blue_user_id = auth.uid())
      )
  )
);

drop policy if exists "Admins delete dart throws" on public.dart_throws;
create policy "Admins delete dart throws"
on public.dart_throws
for delete
to authenticated
using (public.is_admin());
