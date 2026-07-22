-- Ruya Gunlugu: dunun kimliksiz olay AGREGATLARI (yalniz event_key + toplam).
-- Satir, sayfa, zaman dagilimi veya kimlik ACILMAZ. Frontend bu sayilari
-- gunun seed'iyle deterministik "ruya" metnine dokur.
-- Calistirma: Supabase SQL Editor'de bu dosyayi calistir.
-- Calistirilana kadar "dream" komutu seed-only soluk ruya uretir (hata yok).

create or replace function public.dream_stats(p_date date)
returns table(event_key text, total integer)
language sql
security definer
set search_path = public
stable
as $$
  select se.event_key, count(*)::integer as total
  from public.site_events se
  where se.created_at >= p_date::timestamptz
    and se.created_at < (p_date + 1)::timestamptz
    and p_date < (now() at time zone 'utc')::date
    and p_date >= ((now() at time zone 'utc')::date - 30)
  group by se.event_key
  order by total desc;
$$;

revoke execute on function public.dream_stats(date) from public;
grant execute on function public.dream_stats(date) to anon, authenticated;
