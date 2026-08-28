import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Z2 IZ + `step` — kararin kare kare kaydi.
//
// EN ONEMLI TEST: sergilenen uygulama, CANLI uygulamayla ayni sonucu vermeli.
// navigator.js rolling DP kullaniyor ve matris tutmuyor; sergi icin ikinci bir
// uygulama yazildi. Ikisi ayrisirsa sergi, makinenin ne yaptigi hakkinda yalan
// soyler — bu yuzden capraz dogrulama burada.

const izSource = await readFile(
  new URL('../../assets/js/home/iz.js', import.meta.url),
  'utf8'
);
const navigatorSource = await readFile(
  new URL('../../assets/js/home/navigator.js', import.meta.url),
  'utf8'
);

function loadIz() {
  const context = vm.createContext({ window: {}, console });
  vm.runInContext(izSource, context, { filename: 'iz.js' });
  return context.window.ConviviumHome.createIz();
}

// navigator.js'teki canli editDistance'i kaynaktan cikar.
function loadLiveEditDistance() {
  const start = navigatorSource.indexOf('const editDistance =');
  assert.notEqual(start, -1, 'editDistance bulunmali');
  const end = navigatorSource.indexOf('\n  };', start) + 5;
  const context = vm.createContext({ Math, Array, String });
  vm.runInContext(`${navigatorSource.slice(start, end)}\nglobalThis.__ed = editDistance;`, context);
  return context.__ed;
}

const PAIRS = [
  ['hepl', 'help'], ['help', 'help'], ['lok', 'look'], ['mpa', 'map'],
  ['card', 'cart'], ['kaz', 'kaz'], ['tabaka', 'tabak'], ['abc', 'abd'],
  ['', ''], ['a', 'b'], ['xy', 'yx'], ['damar', 'damr'], ['iz', 'is'],
  ['h', 'hologram'], ['a', 'abcdef'], ['neden', 'nedne']
];

test('SERGI ile CANLI uygulama ayni mesafeyi veriyor', () => {
  const iz = loadIz();
  const live = loadLiveEditDistance();
  for (const [left, right] of PAIRS) {
    const traced = iz.traceLevenshtein(left, right).sonuc;
    const actual = live(left, right);
    assert.equal(
      traced,
      actual,
      `"${left}" vs "${right}": sergi ${traced}, canli ${actual} — sergi yalan soyluyor`
    );
  }
});

test('erken cikis SAKLANMIYOR, serginin konusu oluyor', () => {
  const iz = loadIz();
  const trace = iz.traceLevenshtein('h', 'hologram');
  assert.equal(trace.budandi, true);
  assert.equal(trace.sonuc, 99);
  assert.equal(trace.matris, null, 'budanan cift icin matris hesaplanmamali');
  assert.match(iz.render(trace), /BUDANDI/);
  assert.match(iz.render(trace), /hic hesaplamadi/);
});

test('matris ve geri izleme yolu tutarli', () => {
  const iz = loadIz();
  const trace = iz.traceLevenshtein('hepl', 'help');
  assert.equal(trace.matris.length, 5, 'satir = sol uzunluk + 1');
  assert.equal(trace.matris[0].length, 5, 'sutun = sag uzunluk + 1');
  assert.equal(trace.matris[4][4], trace.sonuc, 'sag alt kose sonuc olmali');
  assert.ok(trace.yol.length > 0, 'yol bos olmamali');
  // Yol sag alt koseden baslar ve sol ust koseye kadar iner.
  const last = trace.yol[trace.yol.length - 1];
  assert.equal(last.i, 4);
  assert.equal(last.j, 4);
});

test('her hucre karesi kendi gerekcesini tasiyor', () => {
  const iz = loadIz();
  const trace = iz.traceLevenshtein('hepl', 'help');
  assert.equal(trace.kareler.length, 16, '4x4 = 16 hucre hesaplanmali');
  for (const frame of trace.kareler) {
    assert.equal(frame.op, 'hucre');
    assert.ok(['esit', 'degistir', 'sil', 'ekle'].includes(frame.secilen));
    // vm realm dizisi host dizisiyle referans-esit degil; Array.from ile kopyala.
    const etkenler = Array.from(frame.why, (w) => w.etken);
    assert.deepEqual(etkenler, ['harfler', 'degistir', 'sil', 'ekle']);
    // Secilen secenek gercekten en kucuk olmali.
    const secenekler = Array.from(frame.why).slice(1).map((w) => w.katki);
    assert.equal(frame.delta.deger, Math.min(...secenekler), 'secilen deger en kucuk olmali');
  }
});

test('iz deterministik: ayni girdi ayni hash', () => {
  const a = loadIz();
  const b = loadIz();
  for (const [left, right] of PAIRS) {
    assert.equal(
      a.hash(a.traceLevenshtein(left, right)),
      b.hash(b.traceLevenshtein(left, right))
    );
  }
});

test('farkli girdi farkli hash', () => {
  const iz = loadIz();
  const hashes = new Set(PAIRS.map(([l, r]) => iz.hash(iz.traceLevenshtein(l, r))));
  assert.ok(hashes.size >= PAIRS.length - 2, 'hash carpismasi olmamali');
});

test('oneri izi navigator gerekcesini oldugu gibi tasiyor', () => {
  const iz = loadIz();
  const suggestions = [
    { value: 'help', score: 729, why: [{ etken: 'yazim mesafesi', deger: '1 harf', katki: 420 }] },
    { value: 'map', score: 300, why: [{ etken: 'komut oneki', deger: 'ma', katki: 300 }] }
  ];
  const trace = iz.traceSuggest('hepl', suggestions);
  assert.equal(trace.tur, 'nav-why');
  assert.equal(trace.sonuc, 'help');
  assert.equal(trace.kareler.length, 2);
  assert.deepEqual(Array.from(trace.kareler[0].why), suggestions[0].why);
  assert.match(iz.render(trace), /yazim mesafesi/);
});

test('bos oneri listesi cokmuyor', () => {
  const iz = loadIz();
  const trace = iz.traceSuggest('zzz', []);
  assert.equal(trace.sonuc, null);
  assert.match(iz.render(trace), /aday uretilmedi/);
});

test('modul saf: DOM, ag ve zaman kullanmiyor', () => {
  assert.doesNotMatch(izSource, /document\./);
  assert.doesNotMatch(izSource, /fetch\(/);
  assert.doesNotMatch(izSource, /localStorage/);
  assert.doesNotMatch(izSource, /Date\.now|new Date/);
  assert.doesNotMatch(izSource, /Math\.random/);
});

test('iz nesnesi dondurulmus', () => {
  const iz = loadIz();
  const trace = iz.traceLevenshtein('hepl', 'help');
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.kareler));
});

test('step YAN ETKI URETMIYOR — kaynak sozlesmesi', async () => {
  const protocolSource = await readFile(
    new URL('../../assets/js/home-protocol.js', import.meta.url),
    'utf8'
  );
  const start = protocolSource.indexOf('const stepCommand =');
  assert.notEqual(start, -1, 'stepCommand bulunmali');
  const end = protocolSource.indexOf('\n      const clearCommandSuggestions', start);
  const body = protocolSource.slice(start, end);

  // step yalnizca OKUR: durum yazmaz, adres yazmaz, rota degistirmez.
  for (const forbidden of ['writeAddress', 'persist(', 'award(', 'location.href', 'runCommand(']) {
    assert.ok(!body.includes(forbidden), `step ${forbidden} cagirmamali`);
  }
});
