-- Gizlilik-dostu olcum tablosu (PO-6) — 2026-07-02
-- Supabase SQL Editor'de BIR KEZ calistir. Calistirilana kadar frontend
-- recordSiteEvent sessizce no-op yapar (deneyim bozulmaz).
--
-- Ilkeler:
--   * Kimlik yok: user_id / IP / user-agent SAKLANMAZ.
--   * Anon rolu yalnizca INSERT yapabilir; SELECT/UPDATE/DELETE yapamaz
--     (veri disari sizamaz, silinip sisirilemez).
--   * Olay adlari whitelist'lidir (CHECK) — istemci ne gonderirse gondersin
--     tanimsiz olay yazilamaz.

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  event_key text not null check (event_key in (
    'home.view', 'articles.view', 'command.first', 'oracle.ask',
    'game.start', 'login.done', 'offline.node.solved'
  )),
  page text not null default '' check (char_length(page) <= 80),
  created_at timestamptz not null default now()
);

alter table public.site_events enable row level security;

-- Anon + giris yapmis herkes olay YAZABILIR (kimliksiz sayac).
drop policy if exists "site_events_insert_all" on public.site_events;
create policy "site_events_insert_all"
  on public.site_events for insert
  to anon, authenticated
  with check (true);

-- Okuma politikasi YOK -> anon/authenticated SELECT edemez.
-- Sayilari Supabase Dashboard'da (service role) su sorgularla oku:
--
--   -- gunluk ozet
--   select date_trunc('day', created_at) as gun, event_key, count(*)
--   from public.site_events
--   group by 1, 2 order by 1 desc, 3 desc;
--
--   -- oyunlara gore baslama sayisi
--   select page, count(*) from public.site_events
--   where event_key = 'game.start' group by 1 order by 2 desc;
--
-- Buyume kontrolu (istege bagli): 90 gunden eski kayitlari sil.
--   delete from public.site_events where created_at < now() - interval '90 days';
