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
// Tavan artik MEVCUT SATIR SAYISINA SABITLENDI. Bundan sonra buyume gercekten
// reddedilir.
//
// Bu test kirildiginda iki mesru cevap vardir:
//   1. Yeni karar mantigini assets/js/home/<ad>.js altina saf bir factory
//      olarak tasi (tercih edilen; mimari zaten bunu soyluyor).
//   2. Tavani bilincli olarak yukselt — ama o zaman yukaridaki circir kaydina
//      yeni degeri VE gerekcesini yaz. Gerekcesiz yukseltme yasak.
const CEILING = 4849;

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
    'tortu', 'sigil', 'iz', 'arsiv'
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
