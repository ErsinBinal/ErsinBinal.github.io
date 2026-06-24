-- 2026-06-24 Guvenlik sertlestirme (Supabase advisor uyarilarina gore)
-- Uygulandi: production (airmhxfgtslsgrdhvfin), apply_migration ile.

-- 1) set_updated_at: search_path sabitle (function_search_path_mutable)
alter function public.set_updated_at() set search_path = public;

-- 2) handle_new_user: yalniz trigger; RPC ile cagrilamasin
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 3) is_admin: yalniz authenticated (RLS icin). anon + varsayilan PUBLIC iznini kaldir.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Kasitli birakilanlar (advisor WARN olarak gosterir, by-design):
--   * is_admin() authenticated tarafindan cagrilabilir -> RLS politikalari icin gerekli.
--   * dart_leaderboard() anon/authenticated -> herkese acik liderlik tablosu.
-- Dashboard'dan elle yapilacak: Auth > Leaked Password Protection (HaveIBeenPwned) acik.
