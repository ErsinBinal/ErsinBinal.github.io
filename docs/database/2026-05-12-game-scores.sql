-- Faz 2: Cyberpunk Logic Game global skor tablosu.
-- Supabase SQL Editor'de bir kez calistirin.

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_key text not null default 'cyberpunk-logic',
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  initials text not null check (initials ~ '^[A-Z]{3}$'),
  score integer not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  trace integer not null default 0 check (trace >= 0 and trace <= 100),
  best_streak integer not null default 0 check (best_streak >= 0),
  created_at timestamptz not null default now()
);

create index if not exists game_scores_leaderboard_idx
  on public.game_scores (game_key, score desc, duration_seconds asc, created_at asc);

create index if not exists game_scores_user_id_idx
  on public.game_scores (user_id);

alter table public.game_scores enable row level security;

drop policy if exists "Game scores are readable" on public.game_scores;
create policy "Game scores are readable"
on public.game_scores
for select
to anon, authenticated
using (true);

drop policy if exists "Signed in users create own game scores" on public.game_scores;
create policy "Signed in users create own game scores"
on public.game_scores
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins delete game scores" on public.game_scores;
create policy "Admins delete game scores"
on public.game_scores
for delete
to authenticated
using (public.is_admin());
