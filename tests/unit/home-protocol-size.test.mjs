import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Kazi Evi, Faz 0.5 — monolit tavani.
//
// home-protocol.js park edilmis bir monolittir. Toplu bolunmesi PLANLI DEGIL,
// ama BUYUMESI de serbest degil: yeni karar mantigi assets/js/home/<ad>.js
// altinda saf bir factory olarak yazilir, protocol yalniz orkestrasyon ve
// yan etki tasir.
//
// Bu test bir kalite hedefi degil, bir KAPI: tavan asilirsa dilim yayinlanmaz.
// Tavani yukseltmek bilincli bir karardir ve bu satiri degistirmeyi gerektirir.
const CEILING = 4860;

test('home-protocol.js satir tavanini asmiyor', async () => {
  const source = await readFile(
    new URL('../../assets/js/home-protocol.js', import.meta.url),
    'utf8'
  );
  const lines = source.split('\n').length;

  assert.ok(
    lines <= CEILING,
    `home-protocol.js ${lines} satir; tavan ${CEILING}. ` +
    'Yeni karar mantigini assets/js/home/<ad>.js altina saf bir factory olarak tasi, ' +
    'ya da tavani bilincli olarak yukselt.'
  );
});

test('yeni home modulleri factory desenini korur', async () => {
  // D3: her modul window.ConviviumHome.create<Ad>(deps) fabrikasi tanimlar.
  const modules = ['navigator', 'vfs', 'world', 'economy', 'shop', 'ruins', 'net'];
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
