-- Convivium database baseline for Supabase/Postgres.
-- Run this file in the Supabase SQL Editor after creating the project.
-- Then create a user from auth.html and promote yourself with:
-- update public.profiles set role = 'admin' where user_id = '<your-auth-user-id>';

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  profession text,
  education text,
  department text,
  terms_accepted_at timestamptz,
  terms_version text,
  ai_consent boolean not null default false,
  ai_consent_at timestamptz,
  role text not null default 'reader' check (role in ('reader', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  author_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.user_app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_key text not null,
  item_type text not null default 'app' check (item_type in ('game', 'app')),
  item_title text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  app_key text not null,
  app_title text not null,
  recommendation_title text not null,
  recommendation_summary text not null default '',
  recommendation_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc);

create index if not exists articles_author_id_idx
  on public.articles (author_id);

create index if not exists game_scores_leaderboard_idx
  on public.game_scores (game_key, score desc, duration_seconds asc, created_at asc);

create index if not exists game_scores_user_id_idx
  on public.game_scores (user_id);

create index if not exists user_app_sessions_user_created_idx
  on public.user_app_sessions (user_id, created_at desc);

create index if not exists user_app_sessions_item_idx
  on public.user_app_sessions (item_type, item_key, created_at desc);

create index if not exists app_recommendations_user_created_idx
  on public.app_recommendations (user_id, created_at desc);

create index if not exists app_recommendations_app_idx
  on public.app_recommendations (app_key, created_at desc);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id, display_name, first_name, last_name,
    terms_accepted_at, terms_version, ai_consent, ai_consent_at
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      concat_ws(' ', nullif(new.raw_user_meta_data->>'first_name', ''), nullif(new.raw_user_meta_data->>'last_name', '')),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    case when (new.raw_user_meta_data->>'terms_accepted') = 'true' then now() else null end,
    nullif(new.raw_user_meta_data->>'terms_version', ''),
    coalesce((new.raw_user_meta_data->>'ai_consent') = 'true', false),
    case when (new.raw_user_meta_data->>'ai_consent') = 'true' then now() else null end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- handle_new_user yalniz trigger olarak calismali; RPC ile cagrilmasini engelle.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- is_admin yalniz authenticated tarafindan calistirilir (RLS politikalari icin).
-- anon'a/PUBLIC'e acmak gereksiz; varsayilan PUBLIC iznini de kaldir.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.game_scores enable row level security;
alter table public.user_app_sessions enable row level security;
alter table public.app_recommendations enable row level security;
alter table public.dart_matches enable row level security;
alter table public.dart_throws enable row level security;

drop policy if exists "Profiles visible to self and admins" on public.profiles;
create policy "Profiles visible to self and admins"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Kullanici kendi profilini guncelleyebilir (upsertProfile icin), ancak kendi
-- role'unu degistiremez: WITH CHECK role'un mevcut degerle ayni kalmasini sart kosar.
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and role = (select p.role from public.profiles p where p.user_id = auth.uid())
);

-- Kullanici kendi profil satirini ekleyebilir (yalniz reader olarak).
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid() and role = 'reader');

drop policy if exists "Published articles are readable" on public.articles;
create policy "Published articles are readable"
on public.articles
for select
to anon, authenticated
using (
  status = 'published'
  and (published_at is null or published_at <= now())
);

drop policy if exists "Authors and admins can read managed articles" on public.articles;
create policy "Authors and admins can read managed articles"
on public.articles
for select
to authenticated
using (author_id = auth.uid() or public.is_admin());

drop policy if exists "Admins create articles" on public.articles;
create policy "Admins create articles"
on public.articles
for insert
to authenticated
with check (public.is_admin() and author_id = auth.uid());

drop policy if exists "Admins update articles" on public.articles;
create policy "Admins update articles"
on public.articles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete articles" on public.articles;
create policy "Admins delete articles"
on public.articles
for delete
to authenticated
using (public.is_admin());

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

drop policy if exists "Users read own app sessions" on public.user_app_sessions;
create policy "Users read own app sessions"
on public.user_app_sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users create own app sessions" on public.user_app_sessions;
create policy "Users create own app sessions"
on public.user_app_sessions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins delete app sessions" on public.user_app_sessions;
create policy "Admins delete app sessions"
on public.user_app_sessions
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Users read own app recommendations" on public.app_recommendations;
create policy "Users read own app recommendations"
on public.app_recommendations
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users create own app recommendations" on public.app_recommendations;
create policy "Users create own app recommendations"
on public.app_recommendations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins delete app recommendations" on public.app_recommendations;
create policy "Admins delete app recommendations"
on public.app_recommendations
for delete
to authenticated
using (public.is_admin());

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

-- =====================================================================
-- ARG / oyun durumu tablolari
-- (Onceden yalniz canli DB'de vardi; 2026-06-26'da semaya eklendi. Tanimlar
--  canli veritabanindan birebir cikarildi.)
-- =====================================================================

-- Bugy evcil hayvan durumu (kullanici basina bir kayit).
create table if not exists public.bugy_pets (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  species text not null default 'clippy',
  name text not null default 'Bugy',
  stage text not null default 'hatchling' check (stage in ('egg', 'hatchling', 'juvenile', 'adult')),
  hatched boolean not null default true,
  hunger smallint not null default 80 check (hunger >= 0 and hunger <= 100),
  energy smallint not null default 80 check (energy >= 0 and energy <= 100),
  hygiene smallint not null default 80 check (hygiene >= 0 and hygiene <= 100),
  bond smallint not null default 40 check (bond >= 0 and bond <= 100),
  mood_state text not null default 'neutral' check (mood_state in ('happy', 'neutral', 'grumpy', 'feral')),
  care_points integer not null default 0 check (care_points >= 0),
  born_at timestamptz not null default now(),
  last_care_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Gunluk sinyal (ARG): tek satir/gun, herkese acik okuma; yalniz admin yazar.
create table if not exists public.daily_signal (
  signal_date date primary key,
  body text not null,
  created_at timestamptz not null default now()
);

-- Oracle profil/istatistikleri (kullanici basina).
create table if not exists public.oracle_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reading_count integer not null default 0 check (reading_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  refused_count integer not null default 0 check (refused_count >= 0),
  axis_scores jsonb not null default '{}'::jsonb,
  accepted_axes jsonb not null default '{}'::jsonb,
  refused_axes jsonb not null default '{}'::jsonb,
  dominant_axis text,
  last_reading_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Duvar yazilari (ARG): herkese acik okuma, kendi kaydini ekleme.
create table if not exists public.wall_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room text not null default '/' check (char_length(room) <= 64),
  body text not null check (char_length(body) >= 1 and char_length(body) <= 280),
  created_at timestamptz not null default now()
);
create index if not exists wall_marks_room_created_idx on public.wall_marks (room, created_at desc);

-- Dunya durumu (ARG ilerleme): kilit/envanter/kesif/seviye.
create table if not exists public.world_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unlocked text[] not null default '{}'::text[],
  inventory text[] not null default '{}'::text[],
  discovered text[] not null default '{}'::text[],
  level integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.bugy_pets enable row level security;
alter table public.daily_signal enable row level security;
alter table public.oracle_profiles enable row level security;
alter table public.wall_marks enable row level security;
alter table public.world_state enable row level security;

-- bugy_pets politikalari
drop policy if exists "Users read own bugy" on public.bugy_pets;
create policy "Users read own bugy"
on public.bugy_pets
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users create own bugy" on public.bugy_pets;
create policy "Users create own bugy"
on public.bugy_pets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own bugy" on public.bugy_pets;
create policy "Users update own bugy"
on public.bugy_pets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins delete bugy" on public.bugy_pets;
create policy "Admins delete bugy"
on public.bugy_pets
for delete
to authenticated
using (public.is_admin());

-- daily_signal politikalari (roller PUBLIC)
drop policy if exists "daily_signal_select_public" on public.daily_signal;
create policy "daily_signal_select_public"
on public.daily_signal
for select
using (true);

drop policy if exists "daily_signal_admin_write" on public.daily_signal;
create policy "daily_signal_admin_write"
on public.daily_signal
for all
using (public.is_admin())
with check (public.is_admin());

-- oracle_profiles politikalari (roller PUBLIC)
drop policy if exists "oracle_profiles_select_own" on public.oracle_profiles;
create policy "oracle_profiles_select_own"
on public.oracle_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "oracle_profiles_insert_own" on public.oracle_profiles;
create policy "oracle_profiles_insert_own"
on public.oracle_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "oracle_profiles_update_own" on public.oracle_profiles;
create policy "oracle_profiles_update_own"
on public.oracle_profiles
for update
using (auth.uid() = user_id);

-- wall_marks politikalari (roller PUBLIC)
drop policy if exists "wall_marks_select_public" on public.wall_marks;
create policy "wall_marks_select_public"
on public.wall_marks
for select
using (true);

drop policy if exists "wall_marks_insert_own" on public.wall_marks;
create policy "wall_marks_insert_own"
on public.wall_marks
for insert
with check (auth.uid() = user_id);

drop policy if exists "wall_marks_delete_own_or_admin" on public.wall_marks;
create policy "wall_marks_delete_own_or_admin"
on public.wall_marks
for delete
using (auth.uid() = user_id or public.is_admin());

-- world_state politikalari (roller PUBLIC)
drop policy if exists "world_state_select_own" on public.world_state;
create policy "world_state_select_own"
on public.world_state
for select
using (auth.uid() = user_id);

drop policy if exists "world_state_insert_own" on public.world_state;
create policy "world_state_insert_own"
on public.world_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "world_state_update_own" on public.world_state;
create policy "world_state_update_own"
on public.world_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================
-- Sisedeki mesaj (bottle_messages) — bkz. 2026-07-17-bottles.sql
-- =============================================================


create table if not exists public.bottle_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  status text not null default 'afloat' check (status in ('afloat', 'caught')),
  catcher_id uuid references auth.users(id) on delete set null,
  caught_at timestamptz,
  reply_to uuid references public.bottle_messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bottle_messages_afloat_idx
  on public.bottle_messages (status, created_at);
create index if not exists bottle_messages_sender_idx
  on public.bottle_messages (sender_id, created_at desc);

alter table public.bottle_messages enable row level security;

-- Okuma: yalnizca kendi gonderdigin ya da yakaladigin siseler.
drop policy if exists "bottle_select_own" on public.bottle_messages;
create policy "bottle_select_own"
on public.bottle_messages
for select
using (auth.uid() = sender_id or auth.uid() = catcher_id);

-- Insert/update politikasi YOK: yazma yalnizca asagidaki RPC'lerle olur.

-- Sise at: gunluk limit (24 saatte 3) RPC icinde uygulanir.
create or replace function public.throw_bottle(p_body text, p_reply_to uuid default null)
returns public.bottle_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_count integer;
  v_row public.bottle_messages;
begin
  if v_uid is null then
    raise exception 'login_required';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 280 then
    raise exception 'body_invalid';
  end if;
  select count(*) into v_count
    from public.bottle_messages
    where sender_id = v_uid
      and created_at > now() - interval '24 hours';
  if v_count >= 3 then
    raise exception 'daily_limit';
  end if;
  if p_reply_to is not null and not exists (
    select 1 from public.bottle_messages
    where id = p_reply_to and catcher_id = v_uid
  ) then
    raise exception 'reply_not_allowed';
  end if;
  insert into public.bottle_messages (sender_id, body, reply_to)
    values (v_uid, v_body, p_reply_to)
    returning * into v_row;
  return v_row;
end;
$$;

-- Sise yakala: kendi atmadigin rastgele bir afloat sise (guvenli update).
create or replace function public.catch_bottle()
returns public.bottle_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.bottle_messages;
begin
  if v_uid is null then
    raise exception 'login_required';
  end if;
  update public.bottle_messages
    set status = 'caught', catcher_id = v_uid, caught_at = now()
    where id = (
      select id from public.bottle_messages
      where status = 'afloat' and sender_id <> v_uid
      order by random()
      limit 1
      for update skip locked
    )
    returning * into v_row;
  return v_row; -- sise yoksa null doner; frontend zarifce anlatir.
end;
$$;

revoke execute on function public.throw_bottle(text, uuid) from public, anon;
revoke execute on function public.catch_bottle() from public, anon;
grant execute on function public.throw_bottle(text, uuid) to authenticated;
grant execute on function public.catch_bottle() to authenticated;

-- =============================================================
-- Signal Shards ekonomisi — bkz. 2026-07-17-shards.sql
-- =============================================================

alter table public.world_state
  add column if not exists shards integer not null default 0;
