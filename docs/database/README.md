# Convivium Supabase Kurulumu

Bu repo GitHub Pages uzerinde calistigi icin kendi icinde backend veya gizli server anahtari calistiramaz. Mimari bu yuzden:

1. GitHub Pages: statik HTML/CSS/JS on yuz.
2. Supabase Auth: uyelik, giris, oturum.
3. Supabase Postgres: makaleler ve profil rolleri.
4. Row Level Security: tarayicidan gelen isteklerin gercek yetki kontrolu.

## Ilk Kurulum

1. Supabase'de yeni bir proje olustur.
2. `docs/database/supabase-schema.sql` dosyasini Supabase SQL Editor'de calistir.
3. Supabase Project Settings > API ekranindan su iki bilgiyi al:
   - Project URL
   - anon public key
4. `assets/js/supabase-config.js` dosyasindaki `url` ve `anonKey` alanlarini doldur.
5. `auth.html` sayfasindan kendi hesabini olustur.
6. Supabase Dashboard > Authentication > Users ekranindan kendi user id degerini kopyala.
7. SQL Editor'de su komutu calistir:

```sql
update public.profiles
set role = 'admin'
where user_id = '<your-auth-user-id>';
```

8. `admin.html` sayfasindan makale ekleyip `published` durumuna al.
9. `makaleler.html` sayfasi artik veritabanindaki yayinlanmis makaleleri de okur.

## Mevcut Kuruluma Faz 2 Ekleme

Daha once ilk SQL semasini calistirdiyseniz tum dosyayi tekrar calistirmak yerine:

1. `docs/database/2026-05-12-game-scores.sql` dosyasini SQL Editor'de calistirin.
2. `cyberpunk-logic-game.html` uzerinden giris yapmis bir kullaniciyla skor kaydedin.
3. Skor kaydi basarili olursa oyun `GLOBAL SCOREBOARD` listesini gosterir.

## Mevcut Kuruluma Faz 3 AI Gundem Ekleme

1. `docs/database/2026-05-12-ai-news.sql` dosyasini SQL Editor'de calistirin.
2. GitHub repo ayarlarinda `Settings > Secrets and variables > Actions` bolumune gidin.
3. `Secrets` altina sunlari ekleyin:
   - `OPENAI_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. `Variables` altina opsiyonel olarak sunlari ekleyebilirsiniz:
   - `SUPABASE_URL` = Supabase proje URL'i
   - `OPENAI_NEWS_MODEL` = varsayilan `gpt-5.5`
5. `.github/workflows/ai-news-digest.yml` workflow'u 6 saatte bir calisir. Elle test etmek icin GitHub Actions ekranindan `Run workflow` kullanin.

Not: `SUPABASE_SERVICE_ROLE_KEY` gizlidir. Tarayiciya, HTML'e veya public JS dosyasina yazilmaz.

## Guvenlik Notlari

- `anonKey` gizli degildir; tarayiciya konabilir.
- `service_role` anahtari asla bu repoya veya tarayiciya konmaz.
- Admin yetkisi JavaScript ile degil, `supabase-schema.sql` icindeki RLS politikalariyla korunur.
- Admin panelindeki HTML icerik alani bilincli olarak serbesttir. Bu alan sadece admin tarafindan yazilmalidir.

## Gelecek Plan

- Faz 1: Makaleler, uyelik, admin paneli.
- Faz 2: Oyun skor kayitlari ve global leaderboard.
- Faz 3: Birincil kaynaklardan AI gundem otomasyonu.
- Faz 4: Dosya/gorsel yukleme icin Supabase Storage ve RLS.
- Faz 5: Daha buyuk trafik veya ozel is kurallari gerekirse Cloudflare Workers ya da Supabase Edge Functions.
