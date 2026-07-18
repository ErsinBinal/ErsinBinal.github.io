# ADR-001 — HTTP Güvenlik Header'ları ve Hosting

- Durum: **Kabul edildi**
- Tarih: 18 Temmuz 2026
- Kapsam: Statik site yanıtları; Oracle Worker bu kararın dışında kendi
  header/CORS sözleşmesini korur.

## Bağlam

Site GitHub Pages üzerinde çalışıyor. HTML içindeki CSP meta etiketleri kaynak
yükleme politikasını uygulayabiliyor; fakat bütün HTTP güvenlik kontrollerinin
yerini tutmuyor. Özellikle `frame-ancestors` meta CSP içinde desteklenmez ve
clickjacking sınırı için response header gerekir.

18 Temmuz 2026 canlı yanıt gözleminde GitHub Pages ana sayfada HSTS sağladı;
ancak `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` ve
`Permissions-Policy` yanıt header'ları bulunmadı. Cloudflare'a özgü `_headers`
dosyası GitHub Pages tarafından yorumlanmadığından mevcut hostta gerçek bir
koruma sağlamaz.

Cloudflare Pages statik varlıklarda `_headers` dosyasını uygular. Pages
Functions tarafından üretilen yanıtlarda ise `_headers` uygulanmaz; aynı
header'ların Function `Response` nesnesinde ayrıca kurulması gerekir.

Kaynaklar:

- [Cloudflare Pages — Headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [MDN — CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

## Karar

1. **Şimdilik GitHub Pages korunacak.** Hosting, domain, deploy veya DNS
   değişikliği Faz B2 içinde yapılmayacak.
2. Mevcut hostta uygulanabilir taban güvenlik katmanı, 27 HTML'in tamamındaki
   sayfa-özel meta CSP ve CI'daki site-integrity doğrulayıcısıdır.
3. Harici npm scriptleri tam semver ile sabitlenecek. Faz B2 tabanı Supabase
   için `@supabase/supabase-js@2.110.7` sürümüdür.
4. Root'a yanıltıcı bir `_headers` dosyası eklenmeyecek. Gerçek HTTP header
   gereksinimi önceliklendirildiğinde önerilen hedef Cloudflare Pages'tir;
   geçiş ayrıca kullanıcı onayı ve preview doğrulamasıyla yapılacaktır.
5. Cloudflare Pages'e geçilirse ilk güvenli header tabanı aşağıdaki gibi
   değerlendirilir; route-özel CSP eşitliği kanıtlanmadan meta CSP'ler
   kaldırılmaz.

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), geolocation=(), microphone=()
  Content-Security-Policy: frame-ancestors 'none';
```

## Sonuçlar ve açık borç

- B2, hosting taşımadan CSP kapsamını ve CDN tekrarlanabilirliğini kapatır.
- GitHub Pages'te meta CSP'nin desteklemediği `frame-ancestors`, CSP
  report-only ve diğer response header kontrolleri açık platform sınırı olarak
  kalır.
- Mevcut inline script/style blokları nedeniyle birçok sayfada
  `'unsafe-inline'` sürer. Bunların kaldırılması B2 değil, oyun/terminal
  modülerleştirme dilimlerinin işidir.
- Cloudflare Pages'e geçiş yeni framework gerektirmez; statik yapı ve ayrı
  Oracle Worker korunabilir.

## Geçiş kapıları

Hosting geçişi istenirse aşağıdaki sıra tek tek doğrulanmalıdır:

1. Production domainine dokunmadan Cloudflare Pages preview projesi oluştur.
2. Yayın artifact'ını açık allowlist ile üret; repo içindeki test, doküman ve
   Worker kaynaklarının yanlışlıkla public artifact'a girmediğini doğrula.
3. 27 HTML, özel `404.html`, canonical URL'ler, Supabase auth/realtime, Oracle
   Worker bağlantısı ve Service Worker scope/update akışını preview'da test et.
4. `_headers` politikalarını ekle; sayfa bazlı CSP'lerle çakışma ve tarayıcı
   konsol ihlallerini kontrol et.
5. Cache ve header smoke testleri geçtikten sonra domain geçişi için ayrıca
   kullanıcı onayı al.
6. Rollback için GitHub Pages yayınını ve önceki DNS değerlerini geçiş
   tamamlanana kadar koru.

## Yeniden değerlendirme tetikleyicileri

- Clickjacking koruması veya CSP raporlama zorunlu hale gelirse,
- özel domain Cloudflare DNS'e taşınırsa,
- response header denetimi yayın kabul kapısı yapılırsa,
- GitHub Pages'in desteklediği header özellikleri değişirse.
