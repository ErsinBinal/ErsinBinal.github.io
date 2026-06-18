-- Dart leaderboard: kullanicilar-arasi siralama.
-- dart_matches RLS katilimciya kisitli oldugu icin, gizliligi koruyan bir
-- SECURITY DEFINER fonksiyon yalnizca TOPLAMLARI (+ goruntu adi) dondurur;
-- ham mac satirlari aciga cikmaz.
-- Supabase SQL Editor'de bir kez calistirin.

create or replace function public.dart_leaderboard(p_mode text default 'all', p_limit int default 200)
returns table (
  user_id uuid,
  display_name text,
  matches bigint,
  wins bigint,
  losses bigint,
  win_pct numeric,
  avg_three_dart numeric,
  best_high int
)
language sql
stable
security definer
set search_path = public
as $$
  with parts as (
    select m.mode, m.winner_slot, m.summary, p.uid, p.slot
    from public.dart_matches m
    cross join lateral (
      values (m.red_user_id, 'RED'::text), (m.blue_user_id, 'BLUE'::text)
    ) as p(uid, slot)
    where m.status = 'completed'
      and p.uid is not null
      and (p_mode = 'all' or m.mode = p_mode)
  ),
  rows as (
    select
      uid as user_id,
      (winner_slot = slot) as won,
      (winner_slot is null) as draw,
      mode,
      nullif((summary->'players'->slot->>'average'), '')::numeric as three_dart,
      coalesce(nullif((summary->'players'->slot->>'highestTurn'), '')::int, 0) as high
    from parts
  )
  select
    r.user_id,
    coalesce(pr.display_name, 'Oyuncu') as display_name,
    count(*) as matches,
    count(*) filter (where r.won) as wins,
    count(*) filter (where not r.won and not r.draw) as losses,
    round(100.0 * count(*) filter (where r.won) / nullif(count(*) filter (where not r.draw), 0), 0) as win_pct,
    round(avg(r.three_dart) filter (where r.mode = 'x01' and r.three_dart > 0), 1) as avg_three_dart,
    max(r.high) as best_high
  from rows r
  left join public.profiles pr on pr.user_id = r.user_id
  group by r.user_id, pr.display_name
  order by wins desc, win_pct desc nulls last, avg_three_dart desc nulls last, matches desc
  limit p_limit;
$$;

grant execute on function public.dart_leaderboard(text, int) to authenticated, anon;
