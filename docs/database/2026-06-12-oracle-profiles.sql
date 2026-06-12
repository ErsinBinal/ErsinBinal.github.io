-- Faz 5: Oracle kullanici profilleri — biriken eksen puanlari ve okuma gecmisi.
-- Supabase SQL Editor'de bir kez calistirin.

create table if not exists public.oracle_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  reading_count integer not null default 0 check (reading_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  refused_count  integer not null default 0 check (refused_count  >= 0),
  axis_scores    jsonb not null default '{}'::jsonb,
  accepted_axes  jsonb not null default '{}'::jsonb,
  refused_axes   jsonb not null default '{}'::jsonb,
  dominant_axis  text,
  last_reading_at timestamptz,
  updated_at     timestamptz not null default now()
);

alter table public.oracle_profiles enable row level security;

create policy "oracle_profiles_select_own"
  on public.oracle_profiles for select
  using (auth.uid() = user_id);

create policy "oracle_profiles_insert_own"
  on public.oracle_profiles for insert
  with check (auth.uid() = user_id);

create policy "oracle_profiles_update_own"
  on public.oracle_profiles for update
  using (auth.uid() = user_id);

-- app_recommendations icin oracle okumalarini hizli cekmek icin indeks
create index if not exists app_recommendations_oracle_idx
  on public.app_recommendations (user_id, app_key, created_at desc)
  where app_key = 'oracle';
