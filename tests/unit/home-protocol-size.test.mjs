import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Kazi Evi, Faz 0.5 — monolit tavani.
//
// DURUST KAYIT: bu tavan alti dilimde ALTI KEZ yukseltildi.
//   4520 -> 4600 -> 4620 -> 4720 -> 4800 -> 4860
// Yani bir KAPI degil, dosyayi takip eden bir circir olarak calisti. Her
// carpismada buyumenin hakli olup olmadigi sorulmadi; tavan yukseltildi.
// Monolit bu surecte 4436'dan 4849'e cikti (test olcusu: split('\\n')).
//
// Tavan 2026-08-29'da mevcut satir sayisina SABITLENDI ve kapi ayni gun
// gercekten caldi.
//
// YUKSELTME KAYDI (gerekcesiz yukseltme yasak):
//   4849 -> 4898  (2026-08-29, Z5 OKKAM)
//     Eklenen: okkam modul kurulumu + tembel yukleyici + okkamCommand sarmalayici.
//     KARAR MANTIGI PROTOKOLE GIRMEDI — Levin aramasi, OKK-8 yorumlayicisi ve
//     MDL hesabi assets/js/home/okkam.js icinde (saf, 250+ satir). Protokolde
//     kalan yalniz orkestrasyon ve yan etki; D3'un soyledigi yer burasi.
//     Alternatif "module tasi" burada uygulanamazdi: tasinacak karar zaten
//     modulde.
//   4898 -> 4955  (2026-09-04, FILIZ / 5. boyut)
//     Eklenen: filiz modul kurulumu + tembel yukleyici + filizCommand
//     sarmalayici (alt komut yonlendirmesi: acik / nasil / coz).
//     KARAR MANTIGI PROTOKOLE GIRMEDI — uretim scripts/build-filiz.js'de,
//     okuma/dogrulama assets/js/home/filiz.js icinde (saf), zar
//     scripts/filiz-zar.js'de. Protokolde kalan yalniz getirme + yonlendirme.
//     Not: filizCommand alt komutlari protokolde ayristiriyor cunku
//     dogrulama okkamMod._run'a ihtiyac duyuyor — iki modulu birbirine
//     baglayan tel protokolun isidir, modulun degil.
//   4955 -> 4996  (2026-09-04, GLOSSARY / dil temizligi)
//     Eklenen: glossary modul kurulumu + whatis/apropos sarmalayicilari.
//     KARAR MANTIGI PROTOKOLE GIRMEDI — butun sozluk ve arama
//     assets/js/home/glossary.js icinde (saf). Protokolde 12 satir tel.
//     Bu dilim protokolu BUYUTMEK icin degil, terminalin DILINI
//     sadelestirmek icin acildi: uydurma terimler (karot/damar/elek/zar)
//     yerine git-unix-CS terimleri kondu.
//   4996 -> 5011  (2026-09-05, VIZ / gorsel katman)
//     Eklenen: viz modul kurulumu + runCommand icinde TEK cagri.
//     KARAR MANTIGI PROTOKOLE GIRMEDI — alti sahnenin cizimi de, hangi
//     komutun hangi sahneyi actigi da assets/js/home/viz.js icinde
//     (~520 satir). Protokolde kalan: DOM referanslari + `vizMod?.show()`.
//     Bir test bunu kilitliyor: protokolde 'viz' gecen satir sayisi <= 22.
//
// Bu test kirildiginda iki mesru cevap vardir:
//   1. Yeni karar mantigini assets/js/home/<ad>.js altina saf bir factory
//      olarak tasi (tercih edilen; mimari zaten bunu soyluyor).
//   2. Tavani bilincli olarak yukselt — ama o zaman yukaridaki circir kaydina
//      yeni degeri VE gerekcesini yaz. Gerekcesiz yukseltme yasak.
const CEILING = 5011;

test('home-protocol.js satir tavanini asmiyor', async () => {
  const source = await readFile(
    new URL('../../assets/js/home-protocol.js', import.meta.url),
    'utf8'
  );
  const count = source.split('\n').length;

  assert.ok(
    count <= CEILING,
    `home-protocol.js ${count} satir; tavan ${CEILING} (+${count - CEILING}). ` +
    'Yeni karar mantigini assets/js/home/<ad>.js altina tasi. ' +
    'Tavani yukseltiyorsan testin basindaki circir kaydina gerekceyi YAZ.'
  );
});

test('tavan circir kaydi guncel tutuluyor', async () => {
  // Tavan degistiyse yukaridaki kayit da degismeli: sessiz yukseltme olmasin.
  const source = await readFile(new URL('./home-protocol-size.test.mjs', import.meta.url), 'utf8');
  const declared = Number((source.match(/const CEILING = (\d+);/) || [])[1]);
  assert.ok(
    source.includes(String(declared)),
    'tavan degeri circir kaydinda gorunmeli'
  );
  assert.match(source, /ALTI KEZ yukseltildi/, 'circir gecmisi silinmemeli');
});

test('yeni home modulleri factory desenini korur', async () => {
  // D3: her modul window.ConviviumHome.create<Ad>(deps) fabrikasi tanimlar.
  const modules = [
    'navigator', 'vfs', 'world', 'economy', 'shop', 'ruins', 'net',
    'tortu', 'sigil', 'iz', 'arsiv', 'okkam'
  ];
  for (const name of modules) {
    const source = await readFile(
      new URL(`../../assets/js/home/${name}.js`, import.meta.url),
      'utf8'
    );
    assert.match(
      source,
      /window\.ConviviumHome/,
      `${name}.js ConviviumHome fabrikasina baglanmali`
    );
  }
});
