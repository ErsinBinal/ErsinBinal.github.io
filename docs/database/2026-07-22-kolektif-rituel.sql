-- Kolektif Rituel: gunluk kart toplamalarinin site geneli kimliksiz sayimi.
-- 1) site_events whitelist'ine 'card.collect' eklenir (kimlik yine YOK).
-- 2) collect_pulse(): verilen UTC gunundeki toplam collect sayisini doner.
--    Yalniz toplam sayi acilir; satirlar/sayfalar/tarih dagilimlari acilmaz.
-- Calistirma: Supabase SQL Editor'de bu dosyayi calistir.
-- Calistirilana kadar frontend zarif dusur: collect calisir, "frekans"
-- komutu "olcum cevrimdisi" der, bonus verilmez.

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
