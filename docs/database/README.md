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
5. `/account/auth.html` sayfasindan kendi hesabini olustur.
6. Supabase Dashboard > Authentication > Users ekranindan kendi user id degerini kopyala.
7. SQL Editor'de su komutu calistir:

```sql
update public.profiles
set role = 'admin'
where user_id = '<your-auth-user-id>';
```

8. `/admin/` sayfasindan makale ekleyip `published` durumuna al.
9. `/pages/makaleler.html` sayfasi artik veritabanindaki yayinlanmis makaleleri de okur.

## Mevcut Kuruluma Faz 2 Ekleme

Daha once ilk SQL semasini calistirdiyseniz tum dosyayi tekrar calistirmak yerine:

1. `docs/database/2026-05-12-game-scores.sql` dosyasini SQL Editor'de calistirin.
2. `/games/cyberpunk-logic-game.html` uzerinden giris yapmis bir kullaniciyla skor kaydedin.
3. Skor kaydi basarili olursa oyun `GLOBAL SCOREBOARD` listesini gosterir.

## Mevcut Kuruluma Faz 3 Ekleme

Dashboard, oyun/uygulama erisim kapisi ve uygulama onerisi kayitlari icin:

1. `docs/database/2026-05-18-dashboard-activity.sql` dosyasini SQL Editor'de calistirin.
2. `/account/dashboard.html` sayfasina giris yapmis bir kullaniciyla gidin.
3. Bir oyun bitirin ya da Barista/Bartender/Oracle gibi bir uygulamada sonuc uretin; dashboard son skor ve onerileri gosterir.

## Mevcut Kuruluma Faz 4 Ekleme

Dart Skorbord maclari, iki oyunculu oturum ve detayli ok atisi istatistikleri icin:

1. `docs/database/2026-06-01-dart-skorbord.sql` dosyasini SQL Editor'de calistirin.
2. `/tools/dart-skorbord.html` sayfasinda kirmizi ve mavi oyuncuyu iki farkli hesapla giris yaptirin.
3. Mac tamamlandiginda `/account/dashboard.html` uzerinde Dart Istatistikleri paneli guncellenir.

## Sosyal Sohbet Guncellemesi (2026-07-20)

Arkadaslik, benzersiz `@handle`, engelleme, kalici birebir mesaj ve grup
sohbeti icin mevcut projede su dosyayi SQL Editor'de bir kez calistirin:

`docs/database/2026-07-20-social-chat.sql`

Migration mevcut profillere UUID tabanli cakismasiz bir `gezgin-xxxxxxxx`
handle'i verir. Kullanici bunu sohbet guvertesinden ayirabilir; handle 30 gunde
bir degistirilebilir. Gorunen ad benzersiz olmak zorunda degildir ve kimlik
kontrolunde kullanilmaz.

Ozel mesaj ve grup yazmalari tablo izinleriyle acik degildir: yalniz RPC'ler
uzerinden yapilir ve arkadaslik, engel ve grup uyeligi sunucuda tekrar kontrol
edilir. Migration `chat_messages` tablosunu Supabase Realtime publication'a da
ekler.

## Guvenlik Notlari

- `anonKey` gizli degildir; tarayiciya konabilir.
- `service_role` anahtari asla bu repoya veya tarayiciya konmaz.
- Admin yetkisi JavaScript ile degil, `supabase-schema.sql` icindeki RLS politikalariyla korunur.
- Admin panelindeki HTML icerik alani bilincli olarak serbesttir. Bu alan sadece admin tarafindan yazilmalidir.
- Sohbet icin tarayici tarafindaki buton gizleme bir yetki kontrolu sayilmaz;
  asil kontrol `2026-07-20-social-chat.sql` icindeki RLS ve RPC fonksiyonlaridir.

## Gelecek Plan

- Faz 1: Makaleler, uyelik, admin paneli.
- Faz 2: Oyun skor kayitlari ve global leaderboard.
- Faz 3: Dashboard oturumlari ve uygulama onerileri.
- Faz 4: Dart Skorbord mac ve atis istatistikleri.
- Faz 5: Daha buyuk trafik veya ozel is kurallari gerekirse Cloudflare Workers ya da Supabase Edge Functions.
