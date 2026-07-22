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


-- =============================================================
-- Kolektif Rituel — bkz. 2026-07-22-kolektif-rituel.sql
-- =============================================================


alter table public.site_events
  drop constraint if exists site_events_event_key_check;

alter table public.site_events
  add constraint site_events_event_key_check check (event_key in (
    'home.view', 'articles.view', 'command.first', 'oracle.ask',
    'game.start', 'login.done', 'offline.node.solved',
    'card.collect'
  ));

create or replace function public.collect_pulse(
  p_date date default (now() at time zone 'utc')::date
)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.site_events
  where event_key = 'card.collect'
    and created_at >= p_date::timestamptz
    and created_at < (p_date + 1)::timestamptz
    and p_date <= (now() at time zone 'utc')::date
    and p_date >= ((now() at time zone 'utc')::date - 30);
$$;

revoke execute on function public.collect_pulse(date) from public;
grant execute on function public.collect_pulse(date) to anon, authenticated;
-- =============================================================
-- Uye sosyal sohbet — bkz. 2026-07-20-social-chat.sql
-- =============================================================

-- Convivium social chat: stable handles, friendships, blocks, DMs and groups.
-- Run once in the Supabase SQL editor. All private writes go through RPCs;
-- RLS remains the final authorization boundary.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists handle_changed_at timestamptz;

update public.profiles
set handle = 'gezgin-' || substr(replace(user_id::text, '-', ''), 1, 8)
where handle is null;

alter table public.profiles alter column handle set not null;
create unique index if not exists profiles_handle_lower_uidx on public.profiles (lower(handle));
alter table public.profiles drop constraint if exists profiles_handle_format_check;
alter table public.profiles add constraint profiles_handle_format_check
  check (handle ~ '^[a-z0-9][a-z0-9_-]{2,23}$');

-- profiles.handle artik NOT NULL oldugu icin yeni auth kullanicisi trigger'i da
-- ayni islemde cakismasiz bir baslangic handle'i uretmelidir.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    user_id, handle, display_name, first_name, last_name,
    terms_accepted_at, terms_version, ai_consent, ai_consent_at
  ) values (
    new.id,
    'gezgin-' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
      concat_ws(' ', nullif(new.raw_user_meta_data->>'first_name', ''), nullif(new.raw_user_meta_data->>'last_name', '')),
      split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    case when (new.raw_user_meta_data->>'terms_accepted')='true' then now() else null end,
    nullif(new.raw_user_meta_data->>'terms_version', ''),
    coalesce((new.raw_user_meta_data->>'ai_consent')='true', false),
    case when (new.raw_user_meta_data->>'ai_consent')='true' then now() else null end
  ) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index if not exists friendships_pair_uidx on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists friendships_recipient_status_idx on public.friendships (recipient_id, status, created_at desc);

create table if not exists public.member_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text check (title is null or char_length(title) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create index if not exists chat_members_user_idx on public.chat_members (user_id, joined_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  message_type text not null default 'text' check (message_type in ('text', 'game_invite', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists chat_messages_thread_created_idx on public.chat_messages (thread_id, created_at desc);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.recipient_id = b) or (f.requester_id = b and f.recipient_id = a))
  );
$$;

create or replace function public.has_block_between(a uuid, b uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.member_blocks x
    where (x.blocker_id = a and x.blocked_id = b) or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

create or replace function public.is_chat_member(p_thread uuid, p_user uuid default auth.uid())
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.chat_members m where m.thread_id = p_thread and m.user_id = p_user);
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.has_block_between(uuid, uuid) from public, anon;
revoke execute on function public.is_chat_member(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.has_block_between(uuid, uuid) to authenticated;
grant execute on function public.is_chat_member(uuid, uuid) to authenticated;

alter table public.friendships enable row level security;
alter table public.member_blocks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists social_friendships_read on public.friendships;
create policy social_friendships_read on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, recipient_id));
drop policy if exists social_blocks_read_own on public.member_blocks;
create policy social_blocks_read_own on public.member_blocks for select to authenticated
  using (blocker_id = auth.uid());
drop policy if exists social_threads_read_member on public.chat_threads;
create policy social_threads_read_member on public.chat_threads for select to authenticated
  using (public.is_chat_member(id));
drop policy if exists social_members_read_thread on public.chat_members;
create policy social_members_read_thread on public.chat_members for select to authenticated
  using (public.is_chat_member(thread_id));
drop policy if exists social_messages_read_thread on public.chat_messages;
create policy social_messages_read_thread on public.chat_messages for select to authenticated
  using (public.is_chat_member(thread_id) and not public.has_block_between(auth.uid(), sender_id));

create or replace function public.claim_handle(p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare v_handle text := lower(trim(coalesce(p_handle, ''))); v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'Giris gerekli.'; end if;
  if v_handle !~ '^[a-z0-9][a-z0-9_-]{2,23}$' then
    raise exception 'Kullanici adi 3-24 karakter olmali; harf, rakam, _ ve - kullanilabilir.';
  end if;
  if v_handle in ('admin','moderator','system','support','convivium','oracle','bugy','everyone','here') then
    raise exception 'Bu kullanici adi ayrilmis.';
  end if;
  select handle_changed_at into v_last from public.profiles where user_id = auth.uid();
  if v_last is not null and v_last > now() - interval '30 days' then
    raise exception 'Kullanici adi 30 gunde bir degistirilebilir.';
  end if;
  update public.profiles set handle = v_handle, handle_changed_at = now(), updated_at = now()
  where user_id = auth.uid();
  if not found then raise exception 'Profil bulunamadi.'; end if;
  return v_handle;
exception when unique_violation then raise exception 'Bu kullanici adi alinmis.';
end;
$$;

create or replace function public.search_members(p_query text, p_limit integer default 12)
returns table(user_id uuid, handle text, display_name text, is_friend boolean, request_status text)
language sql security definer stable set search_path = public as $$
  select p.user_id, p.handle, coalesce(nullif(p.display_name,''), p.handle),
    public.are_friends(auth.uid(), p.user_id),
    (select f.status from public.friendships f
      where (f.requester_id = auth.uid() and f.recipient_id = p.user_id)
         or (f.recipient_id = auth.uid() and f.requester_id = p.user_id) limit 1)
  from public.profiles p
  where auth.uid() is not null and p.user_id <> auth.uid()
    and char_length(trim(coalesce(p_query,''))) >= 2
    and not public.has_block_between(auth.uid(), p.user_id)
    and (p.handle ilike '%' || left(trim(coalesce(p_query,'')), 40) || '%'
      or coalesce(p.display_name,'') ilike '%' || left(trim(coalesce(p_query,'')), 40) || '%')
  order by (p.handle = lower(trim(coalesce(p_query,'')))) desc, p.handle
  limit greatest(1, least(coalesce(p_limit,12), 30));
$$;

create or replace function public.get_social_snapshot()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) from public.profiles p where p.user_id=auth.uid()),
    'friends', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by p.handle)
      from public.friendships f join public.profiles p on p.user_id = case when f.requester_id=auth.uid() then f.recipient_id else f.requester_id end
      where f.status='accepted' and auth.uid() in (f.requester_id,f.recipient_id)), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.user_id=f.requester_id where f.recipient_id=auth.uid() and f.status='pending'), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('friendship_id',f.id,'user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by f.created_at desc)
      from public.friendships f join public.profiles p on p.user_id=f.recipient_id where f.requester_id=auth.uid() and f.status='pending'), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle)) order by p.handle)
      from public.member_blocks b join public.profiles p on p.user_id=b.blocked_id where b.blocker_id=auth.uid()), '[]'::jsonb)
  );
$$;

create or replace function public.send_friend_request(p_handle text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_id uuid; v_status text;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null then raise exception 'Uye bulunamadi.'; end if;
  if v_target=auth.uid() then raise exception 'Kendine davet gonderemezsin.'; end if;
  if public.has_block_between(auth.uid(),v_target) then raise exception 'Bu uye ile baglanti kurulamiyor.'; end if;
  if (select count(*) from public.friendships where requester_id=auth.uid() and status='pending') >= 20 then raise exception 'En fazla 20 bekleyen davet olabilir.'; end if;
  if (select count(*) from public.friendships where requester_id=auth.uid() and created_at > now()-interval '10 minutes') >= 5 then raise exception 'Cok hizli davet gonderiyorsun; biraz bekle.'; end if;
  select id,status into v_id,v_status from public.friendships where (requester_id=auth.uid() and recipient_id=v_target) or (requester_id=v_target and recipient_id=auth.uid());
  if v_id is not null and v_status='declined' then
    update public.friendships set requester_id=auth.uid(),recipient_id=v_target,status='pending',responded_at=null,created_at=now(),updated_at=now() where id=v_id;
    return v_id;
  end if;
  if v_id is not null then raise exception 'Bu uye icin zaten bir arkadaslik kaydi var.'; end if;
  insert into public.friendships(requester_id,recipient_id) values(auth.uid(),v_target) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_friend_request(p_request uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships where id=p_request and requester_id=auth.uid() and status='pending';
  return found;
end;
$$;

create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.friendships set status=case when p_accept then 'accepted' else 'declined' end, responded_at=now(), updated_at=now()
  where id=p_request and recipient_id=auth.uid() and status='pending';
  if not found then raise exception 'Bekleyen davet bulunamadi.'; end if;
  return true;
end;
$$;

create or replace function public.remove_friend(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  delete from public.friendships where status='accepted' and ((requester_id=auth.uid() and recipient_id=v_target) or (recipient_id=auth.uid() and requester_id=v_target));
  return found;
end;
$$;

create or replace function public.block_member(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null or v_target=auth.uid() then raise exception 'Uye bulunamadi.'; end if;
  insert into public.member_blocks(blocker_id,blocked_id) values(auth.uid(),v_target) on conflict do nothing;
  delete from public.friendships where (requester_id=auth.uid() and recipient_id=v_target) or (recipient_id=auth.uid() and requester_id=v_target);
  delete from public.chat_threads t where t.kind='direct'
    and public.is_chat_member(t.id,auth.uid()) and public.is_chat_member(t.id,v_target);
  return true;
end;
$$;

create or replace function public.unblock_member(p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  delete from public.member_blocks where blocker_id=auth.uid() and blocked_id=v_target;
  return found;
end;
$$;

create or replace function public.open_direct_chat(p_handle text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_thread uuid;
begin
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if v_target is null or not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then
    raise exception 'Ozel sohbet yalniz engellenmemis arkadaslar arasinda acilir.';
  end if;
  select t.id into v_thread from public.chat_threads t
  where t.kind='direct' and public.is_chat_member(t.id,auth.uid()) and public.is_chat_member(t.id,v_target)
    and (select count(*) from public.chat_members m where m.thread_id=t.id)=2 limit 1;
  if v_thread is null then
    insert into public.chat_threads(kind,owner_id) values('direct',auth.uid()) returning id into v_thread;
    insert into public.chat_members(thread_id,user_id,role) values(v_thread,auth.uid(),'owner'),(v_thread,v_target,'member');
  end if;
  return v_thread;
end;
$$;

create or replace function public.create_group_chat(p_title text, p_handles text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_thread uuid; v_handle text; v_target uuid; v_count integer := 0;
begin
  if char_length(trim(coalesce(p_title,''))) not between 1 and 60 then raise exception 'Grup adi 1-60 karakter olmali.'; end if;
  if cardinality(coalesce(p_handles,'{}')) > 29 then raise exception 'Bir grup en fazla 30 uye olabilir.'; end if;
  if (select count(*) from public.chat_threads where owner_id=auth.uid() and kind='group' and created_at>now()-interval '1 hour') >= 5 then raise exception 'Saatte en fazla 5 grup kurulabilir.'; end if;
  insert into public.chat_threads(kind,title,owner_id) values('group',trim(p_title),auth.uid()) returning id into v_thread;
  insert into public.chat_members(thread_id,user_id,role) values(v_thread,auth.uid(),'owner');
  foreach v_handle in array coalesce(p_handles,'{}') loop
    select user_id into v_target from public.profiles where lower(handle)=lower(trim(v_handle));
    if v_target is null or not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then
      raise exception 'Gruba yalniz engellenmemis arkadaslar eklenebilir: %', v_handle;
    end if;
    insert into public.chat_members(thread_id,user_id) values(v_thread,v_target) on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  if v_count < 1 then raise exception 'Grup icin en az bir arkadas sec.'; end if;
  return v_thread;
end;
$$;

create or replace function public.manage_group_member(p_thread uuid, p_handle text, p_action text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_role text;
begin
  select role into v_role from public.chat_members where thread_id=p_thread and user_id=auth.uid();
  if v_role not in ('owner','admin') or not exists(select 1 from public.chat_threads where id=p_thread and kind='group') then raise exception 'Grup yoneticisi yetkisi gerekli.'; end if;
  select user_id into v_target from public.profiles where lower(handle)=lower(trim(p_handle));
  if p_action='add' then
    if not public.are_friends(auth.uid(),v_target) or public.has_block_between(auth.uid(),v_target) then raise exception 'Yalniz arkadaslarini ekleyebilirsin.'; end if;
    if (select count(*) from public.chat_members where thread_id=p_thread) >= 30 then raise exception 'Grup 30 uye sinirinda.'; end if;
    insert into public.chat_members(thread_id,user_id) values(p_thread,v_target) on conflict do nothing;
  elsif p_action='remove' then
    delete from public.chat_members where thread_id=p_thread and user_id=v_target and role<>'owner';
  else raise exception 'Gecersiz grup islemi.'; end if;
  update public.chat_threads set updated_at=now() where id=p_thread;
  return true;
end;
$$;

create or replace function public.leave_group_chat(p_thread uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from public.chat_members where thread_id=p_thread and user_id=auth.uid() and role='owner') then raise exception 'Grup sahibi once sahipligi devretmeli veya grubu silmeli.'; end if;
  delete from public.chat_members where thread_id=p_thread and user_id=auth.uid();
  return found;
end;
$$;

create or replace function public.transfer_group_owner(p_thread uuid, p_handle text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_target uuid;
begin
  if not exists(select 1 from public.chat_members where thread_id=p_thread and user_id=auth.uid() and role='owner') then raise exception 'Yalniz grup sahibi devredebilir.'; end if;
  select p.user_id into v_target from public.profiles p join public.chat_members m on m.user_id=p.user_id and m.thread_id=p_thread where lower(p.handle)=lower(trim(p_handle));
  if v_target is null or v_target=auth.uid() then raise exception 'Yeni sahip grup uyesi olmali.'; end if;
  update public.chat_members set role='member' where thread_id=p_thread and user_id=auth.uid();
  update public.chat_members set role='owner' where thread_id=p_thread and user_id=v_target;
  update public.chat_threads set owner_id=v_target,updated_at=now() where id=p_thread and kind='group';
  return true;
end;
$$;

create or replace function public.delete_group_chat(p_thread uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.chat_threads where id=p_thread and kind='group' and owner_id=auth.uid();
  return found;
end;
$$;

create or replace function public.list_chat_threads()
returns table(id uuid, kind text, title text, members jsonb, last_body text, last_at timestamptz)
language sql security definer stable set search_path = public as $$
  select t.id,t.kind,
    case when t.kind='group' then t.title else (select coalesce(nullif(p.display_name,''),p.handle) from public.chat_members x join public.profiles p on p.user_id=x.user_id where x.thread_id=t.id and x.user_id<>auth.uid() limit 1) end,
    (select jsonb_agg(jsonb_build_object('user_id',p.user_id,'handle',p.handle,'display_name',coalesce(nullif(p.display_name,''),p.handle),'role',m.role) order by p.handle) from public.chat_members m join public.profiles p on p.user_id=m.user_id where m.thread_id=t.id),
    lm.body,lm.created_at
  from public.chat_threads t
  left join lateral (select body,created_at from public.chat_messages z where z.thread_id=t.id and z.deleted_at is null and not public.has_block_between(auth.uid(),z.sender_id) order by z.created_at desc limit 1) lm on true
  where public.is_chat_member(t.id)
  order by coalesce(lm.created_at,t.created_at) desc;
$$;

create or replace function public.list_chat_messages(p_thread uuid, p_limit integer default 60)
returns table(id uuid, thread_id uuid, sender_id uuid, sender_handle text, sender_name text, body text, message_type text, metadata jsonb, created_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_chat_member(p_thread) then raise exception 'Sohbet erisimi yok.'; end if;
  return query select m.id,m.thread_id,m.sender_id,p.handle,coalesce(nullif(p.display_name,''),p.handle),m.body,m.message_type,m.metadata,m.created_at
  from public.chat_messages m join public.profiles p on p.user_id=m.sender_id
  where m.thread_id=p_thread and m.deleted_at is null and not public.has_block_between(auth.uid(),m.sender_id)
  order by m.created_at desc limit greatest(1,least(coalesce(p_limit,60),100));
end;
$$;

create or replace function public.send_chat_message(p_thread uuid, p_body text, p_type text default 'text', p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_other uuid; v_clean text := regexp_replace(trim(coalesce(p_body,'')), '[[:cntrl:]]', ' ', 'g');
begin
  if not public.is_chat_member(p_thread) then raise exception 'Sohbet erisimi yok.'; end if;
  if char_length(v_clean) not between 1 and 1000 then raise exception 'Mesaj 1-1000 karakter olmali.'; end if;
  if p_type not in ('text','game_invite') then raise exception 'Gecersiz mesaj turu.'; end if;
  if pg_column_size(coalesce(p_metadata,'{}'::jsonb)) > 4096 then raise exception 'Mesaj ek verisi cok buyuk.'; end if;
  if (select count(*) from public.chat_messages where sender_id=auth.uid() and created_at>now()-interval '10 seconds') >= 8 then raise exception 'Cok hizli mesaj gonderiyorsun; biraz bekle.'; end if;
  if exists(select 1 from public.chat_threads where id=p_thread and kind='direct') then
    select user_id into v_other from public.chat_members where thread_id=p_thread and user_id<>auth.uid() limit 1;
    if not public.are_friends(auth.uid(),v_other) or public.has_block_between(auth.uid(),v_other) then raise exception 'Ozel mesaj icin engelsiz arkadaslik gerekli.'; end if;
  end if;
  insert into public.chat_messages(thread_id,sender_id,body,message_type,metadata) values(p_thread,auth.uid(),v_clean,p_type,coalesce(p_metadata,'{}')) returning id into v_id;
  update public.chat_threads set updated_at=now() where id=p_thread;
  return v_id;
end;
$$;

revoke all on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages from anon;
revoke insert, update, delete on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages from authenticated;
grant select on public.friendships, public.member_blocks, public.chat_threads, public.chat_members, public.chat_messages to authenticated;
revoke execute on function public.claim_handle(text), public.search_members(text,integer), public.get_social_snapshot(),
  public.send_friend_request(text), public.respond_friend_request(uuid,boolean), public.remove_friend(text),
  public.cancel_friend_request(uuid), public.block_member(text), public.unblock_member(text),
  public.open_direct_chat(text), public.create_group_chat(text,text[]), public.manage_group_member(uuid,text,text),
  public.leave_group_chat(uuid), public.transfer_group_owner(uuid,text), public.delete_group_chat(uuid),
  public.list_chat_threads(), public.list_chat_messages(uuid,integer), public.send_chat_message(uuid,text,text,jsonb)
  from public, anon;
grant execute on function public.claim_handle(text), public.search_members(text,integer), public.get_social_snapshot(),
  public.send_friend_request(text), public.respond_friend_request(uuid,boolean), public.remove_friend(text),
  public.cancel_friend_request(uuid),
  public.block_member(text), public.unblock_member(text), public.open_direct_chat(text), public.create_group_chat(text,text[]),
  public.manage_group_member(uuid,text,text), public.leave_group_chat(uuid), public.transfer_group_owner(uuid,text),
  public.delete_group_chat(uuid), public.list_chat_threads(),
  public.list_chat_messages(uuid,integer), public.send_chat_message(uuid,text,text,jsonb) to authenticated;

-- Realtime delivery still honors the subscriber's RLS policies.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
