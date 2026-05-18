-- Faz 3: Kullanici dashboard'u icin oyun/uygulama oturumu ve oneriler.
-- Daha once baseline semayi calistirdiyseniz bu dosyayi Supabase SQL Editor'de bir kez calistirin.

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

create index if not exists user_app_sessions_user_created_idx
  on public.user_app_sessions (user_id, created_at desc);

create index if not exists user_app_sessions_item_idx
  on public.user_app_sessions (item_type, item_key, created_at desc);

create index if not exists app_recommendations_user_created_idx
  on public.app_recommendations (user_id, created_at desc);

create index if not exists app_recommendations_app_idx
  on public.app_recommendations (app_key, created_at desc);

alter table public.user_app_sessions enable row level security;
alter table public.app_recommendations enable row level security;

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
