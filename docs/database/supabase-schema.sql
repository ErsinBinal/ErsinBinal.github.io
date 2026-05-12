-- Convivium database baseline for Supabase/Postgres.
-- Run this file in the Supabase SQL Editor after creating the project.
-- Then create a user from auth.html and promote yourself with:
-- update public.profiles set role = 'admin' where user_id = '<your-auth-user-id>';

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
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

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc);

create index if not exists articles_author_id_idx
  on public.articles (author_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
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
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

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

grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;

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
