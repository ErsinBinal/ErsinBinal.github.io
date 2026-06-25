# Convivium — Mimari ve Akış Haritası

Bu klasör, sitenin **yaşayan** mimari/akış dokümantasyonudur. Diyagramlar
[Mermaid](https://mermaid.js.org/) ile yazılmıştır; GitHub bunları otomatik
çizer. Kod değiştikçe burayı da güncelleyin — amaç, hem makro (sitenin tümü)
hem mikro (tek akış) seviyede neyin nasıl bağlandığını ve **yarım kalan
alanları** tek bakışta görmektir.

Durum renkleri: 🟩 tamamlandı · 🟨 yarım/iyileştirilebilir · ⬜ planlanan.

---

## 1. Makro — Site Haritası ve Dış Servisler

```mermaid
flowchart TD
  user([Ziyaretçi]) --> index[index.html\nAna sayfa]

  index --> auth[account/auth.html\nÜyelik + Onaylar]
  index --> oracle[oracle/index.html\nOracle terminal]
  index --> games[games/*\nOyunlar]
  index --> tools[tools/*\nAraçlar: dart, barista, bugy-studio]
  index --> pages[pages/*\nMakaleler, Özgeçmiş]

  auth --> legal[legal/*\nKVKK + Kullanım Koşulları]
  auth --> dash[account/dashboard.html\nProfil + Bugy + Skorlar]
  auth --> admin[admin/index.html\nİçerik yönetimi]

  dash --> worker
  oracle --> worker
  subgraph CF[Cloudflare]
    worker[oracle Worker\n/oracle · /enrich-profile]
    cfai[(Cloudflare AI\nözetleme)]
  end
  worker --> cfai

  worker --> tavily[(Tavily\narama)]
  worker --> cse[(Google CSE\narama)]
  worker --> gemini[(Gemini\ngrounding)]

  auth --> sb
  dash --> sb
  admin --> sb
  subgraph SB[Supabase]
    sbauth[(Auth)]
    profiles[(profiles)]
    articles[(articles)]
    scores[(game_scores / dart_*)]
    bugy[(bugy_pet)]
  end
  sb[Supabase JS] --> sbauth & profiles & articles & scores & bugy

  class index,auth,dash,legal,oracle,worker,cfai,tavily,sb,sbauth,profiles done
  class admin,articles,games,tools,scores,bugy,cse,gemini partial
  classDef done fill:#0a3a1a,stroke:#0f0,color:#dfffe0
  classDef partial fill:#3a360a,stroke:#cc0,color:#fff7cf
  classDef planned fill:#222,stroke:#777,color:#ccc
```

> Not: durum renkleri örnek olarak işaretlendi — gerçek duruma göre güncelle.

---

## 2. Mikro — Üyelik + Onay Akışı

```mermaid
sequenceDiagram
  actor U as Kullanıcı
  participant A as auth.html / auth.js
  participant SC as supabase-client.js
  participant SA as Supabase Auth
  participant TR as handle_new_user (trigger)
  participant P as profiles

  U->>A: Ad, Soyad, e-posta, şifre + onaylar
  A->>A: Zorunlu onay işaretli mi? (yoksa dur)
  A->>SC: signUp(..., {termsAccepted, aiConsent})
  SC->>SA: auth.signUp(metadata: terms_*, ai_consent)
  SA-->>TR: yeni kullanıcı (insert)
  TR->>P: profil satırı + onay zaman damgaları
  SA-->>U: e-posta doğrulama (açıksa)
```

---

## 3. Mikro — Profil Zenginleştirme (AI Araştırma) Akışı

```mermaid
flowchart TD
  start([Dashboard açıldı]) --> hasName{Ad-Soyad var\nve profil boş?}
  hasName -- hayır --> done1[Sadece mevcut profili göster]
  hasName -- evet --> consent{ai_consent\nverilmiş mi?}

  consent -- hayır --> ask[KVKK rıza iste\n'Açık rıza ver' butonu]
  ask --> grant[upsertProfile ai_consent=true]
  grant --> run

  consent -- evet --> run[/enrich-profile çağrısı/]
  run --> prov{Sağlayıcı\nsırayla}
  prov --> tavily[Tavily] --> sum[CF AI özetler]
  prov --> cse[Google CSE] --> sum
  prov --> gem[Gemini grounding] --> res
  sum --> res{Sonuç}

  res -- bilgi bulundu --> card[Kart: 'doğrula' notu + alanlar]
  res -- bulunamadı --> none[İnternette güvenilir bilgi yok]
  res -- hiç çalışmadı --> unavail[Şu an yapılamadı, tekrar dene]

  card --> confirm{Kullanıcı 'doğru, ekle' dedi mi?}
  confirm -- evet --> save[upsertProfile profession/education/department]
  save --> bugyUse[Bugy diyaloglarında kullanılır]
  confirm -- hayır --> dismiss[Kaydedilmez]

  class start,hasName,consent,run,tavily,sum,card,confirm,save,bugyUse done
  class cse,gem,ask,grant partial
  classDef done fill:#0a3a1a,stroke:#0f0,color:#dfffe0
  classDef partial fill:#3a360a,stroke:#cc0,color:#fff7cf
```

---

## 4. Durum Tablosu (yarım kalan / izlenecek alanlar)

| Alan | Durum | Not |
|------|-------|-----|
| Üyelik + Ad/Soyad + onaylar | 🟩 | Canlı |
| KVKK / Kullanım Koşulları metinleri | 🟨 | Taslak; hukukçu incelemesi önerilir |
| Profil zenginleştirme (Tavily) | 🟩 | Canlı, test edildi |
| Google CSE sağlayıcısı | 🟨 | Kod hazır; anahtar girilmedi |
| Gemini sağlayıcı | 🟨 | Yedek; ücretsiz kota sınırlı |
| Eski üyeler için onay ekranı | ⬜ | Henüz yok |
| Otomatik akış testleri (smoke/E2E) | 🟩 | `tests/` + `.github/workflows/flow-check.yml` |

---

## 5. Otomatik Akış Kontrolü

Kurulu (bkz. [tests/README.md](../../tests/README.md)):

- `tests/smoke/smoke.mjs` — dış uçları yoklar (worker `/enrich-profile` ve
  `/oracle`, sayfa 200'leri, Supabase erişimi). `npm run test:smoke`.
- `tests/e2e/` — Playwright ile gerçek tarayıcı akışı (sayfa yüklemeleri, üyelik
  onay akışı, hukuki bağlantılar; tam kayıt akışı `RUN_SIGNUP=1` ile opsiyonel).
- `.github/workflows/flow-check.yml` — `workflow_dispatch` ile **elle tetikle**;
  E2E raporu artifact olarak yüklenir. (İleride `schedule`/cron eklenebilir.)

Bu diyagramları güncel tutmak için: bir akış/sayfa eklediğinde ilgili Mermaid
bloğuna düğümü ekle ve durum tablosunu güncelle.
