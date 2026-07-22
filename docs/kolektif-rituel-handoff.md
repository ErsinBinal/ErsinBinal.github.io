# Kolektif Rituel — Ürün Handoff

Son güncelleme: 22 Temmuz 2026 (ilk yayın)
Durum: **CANLIYA ALINDI; SQL kullanıcı aksiyonu bekliyor.**
Sıra: Kullanıcının onayladığı 3 ürünlük kuyruğun 1. maddesi
(2: Rüya Günlüğü × Ruins, 3: finger + kart hediyesi).

## Ürün

Günlük sinyal kartı toplamaları site genelinde kimliksiz sayılır. Gün içinde
toplam `collect` sayısı eşiği (5) aşarsa, o gün kartını toplamış her gezgin
BİR KEZ +2 shard "frekans eşiği" bonusu alır. `frekans` komutu (alias:
frequency/kolektif/nabiz) günün nabzını ASCII barla gösterir; eşik anında
kısa fırtına dokunuşu (ses + konsol + koruyucu sinyali) oynar.

## Mimari

- `assets/js/home/ritual-pulse.js` — createRitualPulse(deps): karar saf,
  yan etkiler callback (ev deseni). Eşik 5, bonus +2 modül sabiti.
- Sayım: `site_events`'e yeni `card.collect` anahtarı (kimliksiz, oturumda 1)
  + `collect_pulse(date)` RPC'si (security definer; YALNIZ toplam sayı döner,
  satır/dağılım açılmaz; 30 günlük tarih korkuluğu).
- Claim durumu `convivium.ritual.claim` (localStorage, gün damgası).
- collect çıktısına eşik satırları eklenir; `frekans`/report da hak teslim eder
  (eşik sonrası collect etmiş ama bonusu almamış gezgin için).

## KULLANICI AKSİYONU

`docs/database/2026-07-22-kolektif-rituel.sql` Supabase SQL Editor'de
çalıştırılmalı (whitelist güncellemesi + RPC). Çalıştırılana kadar:
collect normal çalışır, `frekans` "ölçüm çevrimdışı" der, bonus verilmez —
hata yok.

## Doğrulama kaydı (2026-07-22)

- Unit: home-ritual-pulse 6/6 (tek-claim, eşik/kartsız/geçersiz sayım
  redleri, çevrimdışı zarafet, bar çizimi). Komut-uzayı snapshot'ı bilinçli
  güncellendi: 133 komut / 593 etiket / 549 anahtar (+frekans ve 3 alias;
  çakışma yok). Toplam 88/88 + Worker 12/12 + integrity.
- Headless: frekans/nabiz çıktısı, RPC-yok zarafeti, collect bozulmadı,
  help-all indeksinde frekans mevcut; sıfır page error.
- Yayın paketi: ritual-pulse v1, home-protocol v87, supabase-client v38,
  SW v213.
