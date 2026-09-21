-- Convivium — ICERIK TURU: makale + not  (2026-09-21)
--
-- NEDEN
--   Bugun articles tablosu tek bir sey taniyor: uzun yazi. Uc cumlelik bir not
--   bu semada garip duruyor (title zorunlu, summary bekleniyor), o yuzden hic
--   yazilmiyor. Eksik olan ikinci bir tablo degil, tek bir KOLON: kind.
--
--   Ikinci tablo acmak kolay gorunur ama bedeli buyuk: iki sorgu, iki RLS seti,
--   iki yayin yolu, iki RSS. Alti ay sonra biri guncel biri bayat olur. Tek
--   depo + tur ayrimi ayni isi tek kapiyla yapar.
--
-- NE DEGISIYOR
--   kind  : 'makale' (uzun, islenmis) | 'not' (kisa, ham sinyal)
--   tags  : konu filtreleri icin; bugun konu basliktan tahmin ediliyordu.
--   title : yalniz makale icin zorunlu. Notun basligi olmak zorunda degil —
--           zorunlu tutulursa not yazma surtunmesi geri gelir.
--
-- NE DEGISMIYOR
--   RLS. "Published articles are readable" politikasi tur ayrimi yapmiyor,
--   ikisini de kapsiyor. Yeni politika gerekmiyor — az politika, az yuzey.
--
-- GUVENLIDIR: idempotent. Mevcut satirlarin hepsi 'makale' olur.

alter table public.articles
  add column if not exists kind text not null default 'makale';

alter table public.articles
  add column if not exists tags text[] not null default '{}';

-- Tur beyaz listesi. Istemci ne gonderirse gondersin tanimsiz tur yazilamaz.
alter table public.articles
  drop constraint if exists articles_kind_check;
alter table public.articles
  add constraint articles_kind_check
  check (kind in ('makale', 'not'));

-- Baslik yalniz makalede zorunlu. title kolonu not null oldugu icin bos string
-- zaten gecerliydi; bu kisit "makale bos baslikla yayimlanmasin" der, nota
-- dokunmaz.
alter table public.articles
  drop constraint if exists articles_title_required;
alter table public.articles
  add constraint articles_title_required
  check (kind <> 'makale' or char_length(btrim(title)) > 0);

-- Etiket gurultusunu sinirla: en fazla 6 etiket, toplam uzunluk makul.
--
-- ILK HALI GECERSIZDI. Her etiketi tek tek olcmek icin
--   (select bool_and(char_length(t) between 1 and 24) from unnest(tags) as t)
-- yazilmisti. PostgreSQL CHECK kisiti icinde ALT SORGUYA izin vermez
-- ("cannot use subquery in check constraint") — kisit eklenmedi, bolum patladi.
--
-- Alt sorgusuz karsiligi: array_to_string. Sade bir fonksiyon cagrisi, CHECK
-- icinde gecerli. Tek tek olcmek yerine toplami sinirliyor; amac zaten
-- "etiket alani bir metin deposuna donmesin" idi, o amac karsilaniyor.
-- 6 etiket x ~24 karakter + ayraclar ~= 160.
alter table public.articles
  drop constraint if exists articles_tags_sane;
alter table public.articles
  add constraint articles_tags_sane
  check (
    array_length(tags, 1) is null
    or (array_length(tags, 1) <= 6
        and char_length(array_to_string(tags, ',')) <= 160)
  );

-- Akis sorgusu: tur + yayim durumu + tarih. Mevcut
-- articles_status_published_at_idx tur suzmesini kapsamiyor.
create index if not exists articles_kind_status_published_at_idx
  on public.articles (kind, status, published_at desc);

-- Etiket filtresi icin GIN; tags text[] uzerinde && ve @> kullanilacak.
create index if not exists articles_tags_idx
  on public.articles using gin (tags);
