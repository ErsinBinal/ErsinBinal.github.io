-- Convivium — ICERIK TURLERI GENISLIYOR + ZIYARETCI YORUMLARI  (2026-09-21)
--
-- Onceki adimda (2026-09-21-icerik-kind.sql) articles tablosu iki tur
-- taniyordu: makale ve not. Simdi kitap ve film degerlendirmeleri geliyor.
--
-- NEDEN YINE AYRI TABLO ACMIYORUZ
--   "Kitaplar" ve "filmler" birer BOLUM degil, ayni omurganin turleri. Ayri
--   tablo acmak dort sorgu, dort RLS seti, dort yayin yolu demekti; kategori
--   menusu de dort kaynagi birlestirmek zorunda kalirdi. Tek kolon + tek
--   indeks ayni isi yapiyor ve /y/<slug>.html hatti hic degismiyor.
--
-- NEDEN meta jsonb, NEDEN AYRI KOLONLAR DEGIL
--   Kitabin yazari var, filmin yonetmeni; notun ikisi de yok. Her tur icin
--   kolon acarsak tablo 12 bos kolonla dolar ve her yeni tur semayi buyutur.
--   Ture ozgu alanlar meta'da durur; omurga sabit kalir. Ayni desen zaten
--   chat_messages.metadata'da var.
--     kitap: {"yazar": "...", "yil": 1978, "puan": 9, "kapak": "/assets/..."}
--     film : {"yonetmen": "...", "yil": 1979, "puan": 10, "afis": "/assets/..."}
--
-- NEDEN YORUMLAR RPC ILE YAZILIYOR
--   Tabloya dogrudan INSERT politikasi verirsek hiz siniri uygulayacak yer
--   kalmaz. bottle_messages ve chat_messages ayni sebeple RPC kullaniyor:
--   RLS son kapi, hiz siniri ve dogrulama RPC'nin icinde.
--
-- GUVENLIDIR: idempotent. Mevcut satirlar 'makale' olarak kalir.
-- NOT: Bu dosyadaki tum CHECK ifadeleri canliya uygulanmadan once gecici
--      tabloda sinandi (hem kabul hem RET yonunde).

-- ============================================================
-- 1) Tur beyaz listesi genisliyor
-- ============================================================

alter table public.articles
  drop constraint if exists articles_kind_check;
alter table public.articles
  add constraint articles_kind_check
  check (kind in ('makale', 'not', 'kitap', 'film'));

-- Baslik kurali: yalniz NOT bassiz olabilir. Kitap ve filmin adi zaten
-- degerlendirmenin konusu — bassiz kitap degerlendirmesi anlamsiz.
alter table public.articles
  drop constraint if exists articles_title_required;
alter table public.articles
  add constraint articles_title_required
  check (kind = 'not' or char_length(btrim(title)) > 0);

-- ============================================================
-- 2) Ture ozgu alanlar
-- ============================================================

alter table public.articles
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- meta bir veri deposu degil, birkac alan. Sinir koymazsak icine makale
-- gomulur ve akis yuku patlar.
alter table public.articles
  drop constraint if exists articles_meta_sane;
alter table public.articles
  add constraint articles_meta_sane
  check (char_length(meta::text) <= 2048);

-- ============================================================
-- 3) Ziyaretci yorumlari
-- ============================================================

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 800),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at);
create index if not exists article_comments_user_idx
  on public.article_comments (user_id, created_at desc);

alter table public.article_comments enable row level security;

-- Okuma: yalniz gorunur yorumlar, yalniz YAYIMLANMIS icerik uzerinde.
-- Taslak bir yazinin yorumlari disari sizmaz.
drop policy if exists "comments_readable" on public.article_comments;
create policy "comments_readable"
on public.article_comments
for select
to anon, authenticated
using (
  status = 'visible'
  and exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  )
);

-- INSERT politikasi YOK: yazma yalnizca post_comment() ile olur (hiz siniri).

-- Kendi yorumunu silme hakki. Yazdigin seyi geri alabilmelisin.
drop policy if exists "comments_delete_own" on public.article_comments;
create policy "comments_delete_own"
on public.article_comments
for delete
to authenticated
using (user_id = auth.uid());

-- Yonetici gizleyebilir (silmek yerine gizlemek: kayit kalir, goruntu gider).
drop policy if exists "comments_admin_update" on public.article_comments;
create policy "comments_admin_update"
on public.article_comments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Yorum yaz: hiz siniri RPC icinde.
create or replace function public.post_comment(p_article uuid, p_body text)
returns public.article_comments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := btrim(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'));
  v_row public.article_comments;
begin
  if v_uid is null then raise exception 'login_required'; end if;
  if char_length(v_clean) < 1 or char_length(v_clean) > 800 then
    raise exception 'body_invalid';
  end if;
  if not exists (
    select 1 from public.articles a
    where a.id = p_article and a.status = 'published'
  ) then
    raise exception 'article_not_found';
  end if;
  -- 10 dakikada 5, gunde 30. Sohbet degil yorum: tempo dusuk olmali.
  if (select count(*) from public.article_comments
      where user_id = v_uid and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limit';
  end if;
  if (select count(*) from public.article_comments
      where user_id = v_uid and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'daily_limit';
  end if;

  insert into public.article_comments (article_id, user_id, body)
    values (p_article, v_uid, v_clean)
    returning * into v_row;
  return v_row;
end;
$$;

-- Yorumlari oku: yazarin gorunen adiyla birlikte.
-- Bu fonksiyon SECURITY DEFINER cunku profiles tablosu disari kapali; yorumun
-- kim tarafindan yazildigini gostermek icin YALNIZ gorunen ad ve handle acilir.
-- E-posta, kimlik, baska hicbir profil alani DONMEZ.
create or replace function public.list_comments(p_article uuid, p_limit integer default 100)
returns table(
  id uuid,
  body text,
  created_at timestamptz,
  author_name text,
  author_handle text,
  is_mine boolean
)
language sql security definer set search_path = public stable as $$
  select
    c.id,
    c.body,
    c.created_at,
    coalesce(nullif(p.display_name, ''), p.handle) as author_name,
    p.handle as author_handle,
    (c.user_id = auth.uid()) as is_mine
  from public.article_comments c
  join public.profiles p on p.user_id = c.user_id
  join public.articles a on a.id = c.article_id
  where c.article_id = p_article
    and c.status = 'visible'
    and a.status = 'published'
  order by c.created_at
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke execute on function public.post_comment(uuid, text) from public, anon;
grant execute on function public.post_comment(uuid, text) to authenticated;
revoke execute on function public.list_comments(uuid, integer) from public;
grant execute on function public.list_comments(uuid, integer) to anon, authenticated;
