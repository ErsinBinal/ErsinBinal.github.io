-- Faz 3: 6 saatte bir toplanacak AI gundem kayitlari.
-- Supabase SQL Editor'de bir kez calistirin.

create table if not exists public.ai_news_items (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  category text not null check (category in ('finance', 'academic', 'software')),
  title text not null,
  summary text not null,
  body_html text not null,
  primary_source_name text not null,
  primary_source_url text not null,
  source_published_at timestamptz,
  significance text not null default '',
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_news_items_collected_at_idx
  on public.ai_news_items (collected_at desc);

create index if not exists ai_news_items_category_idx
  on public.ai_news_items (category, collected_at desc);

alter table public.ai_news_items enable row level security;

drop policy if exists "AI news is readable" on public.ai_news_items;
create policy "AI news is readable"
on public.ai_news_items
for select
to anon, authenticated
using (true);

drop policy if exists "Admins delete AI news" on public.ai_news_items;
create policy "Admins delete AI news"
on public.ai_news_items
for delete
to authenticated
using (public.is_admin());
