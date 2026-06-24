-- Bugy/Ped sanal evcil hayvan sistemi (Tamagotchi benzeri bakim dongusu).
-- Kullanici basina TEK pet (user_id primary key). Daha once baseline semayi
-- calistirdiyseniz bu dosyayi Supabase SQL Editor'de bir kez calistirin.
--
-- Tasarim notlari:
--   * Ihtiyaclar 0..100; istemci tarafinda last_care_at uzerinden zaman
--     damgasi farkiyla dusurulur (sunucuda timer/cron yok).
--   * mood_state='feral' = "canavarlasma" (ihmal sonucu). Olum YOK; bakimla
--     normale doner.

create table if not exists public.bugy_pets (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  species text not null default 'clippy',
  name text not null default 'Bugy',
  stage text not null default 'hatchling'
    check (stage in ('egg', 'hatchling', 'juvenile', 'adult')),
  hatched boolean not null default true,
  hunger smallint not null default 80 check (hunger between 0 and 100),
  energy smallint not null default 80 check (energy between 0 and 100),
  hygiene smallint not null default 80 check (hygiene between 0 and 100),
  bond smallint not null default 40 check (bond between 0 and 100),
  mood_state text not null default 'neutral'
    check (mood_state in ('happy', 'neutral', 'grumpy', 'feral')),
  care_points integer not null default 0 check (care_points >= 0),
  born_at timestamptz not null default now(),
  last_care_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bugy_pets enable row level security;

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
