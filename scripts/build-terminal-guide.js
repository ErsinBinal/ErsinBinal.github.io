// Terminal rehberi ureteci.
//
// Rehber ELLE yazilmaz: komut listesi, alias'lar, sanal dosya sistemi, klavye
// kisayollari ve surum bilgisi KAYNAKTAN cikarilir. Anlati bolumleri bu
// betikte sablon olarak durur; veri her calistirmada tazelenir.
//
// Cikti VARSAYILAN OLARAK DEPO DISINA yazilir — rehber kisisel bir belgedir,
// yayinlanmaz.
//
// Kullanim:
//   npm run docs:terminal                 # ~/Documents/convivium-terminal-rehberi.md
//   npm run docs:terminal -- --out /yol/dosya.md
//   npm run docs:terminal -- --stdout     # ekrana bas

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const protocolSource = read('assets/js/home-protocol.js');
const routeSource = read('assets/js/home/route-commands.js');
const guideSource = read('assets/js/home/guide-commands.js');
const vfsSource = read('assets/js/home/vfs.js');
const swSource = read('service-worker.js');
const indexSource = read('index.html');

// --- Kaynak cikarim yardimcilari ----------------------------------------

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`baslangic isareti yok: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`bitis isareti yok: ${endMarker}`);
  return source.slice(start + startMarker.length, end);
}

// Ust duzey { ... } bloklarini tirnak-farkindalikli ayir.
function topLevelObjects(source) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') { if (depth === 0) start = i; depth += 1; }
    else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) { objects.push(source.slice(start, i + 1)); start = -1; }
    }
  }
  return objects;
}

function parseInlineDefinitions(body) {
  return topLevelObjects(body).flatMap((block) => {
    const command = block.match(/command:\s*'([^']+)'/);
    if (!command) return [];
    // Aciklama tek VEYA cift tirnakli olabilir (icinde kesme isareti varsa
    // cift tirnak kullanilir — or. "Out Run '86i acar").
    const description = block.match(/description:\s*'([^']*)'/)
      || block.match(/description:\s*"([^"]*)"/);
    const aliasBlock = block.match(/aliases:\s*\[([^\]]*)\]/);
    return [{
      command: command[1],
      description: description ? description[1] : '',
      aliases: aliasBlock ? [...aliasBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
    }];
  });
}

// Registry'ler bir factory icinde; gercekten calistirip oku.
function loadRegistry(source, property, filename) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context, { filename });
  return Array.from(context.window.ConviviumHome[property], (entry) => ({
    command: entry.command,
    description: entry.description || '',
    aliases: Array.from(entry.aliases || [])
  }));
}

// --- Veri ----------------------------------------------------------------

const inlineDefinitions = parseInlineDefinitions(
  sourceBetween(protocolSource, 'const commandDefinitions = [', '\n      ];\n\n      const keyboardHelpText')
);
const routeDefinitions = loadRegistry(routeSource, 'routeCommandRegistry', 'route-commands.js');
const guideDefinitions = loadRegistry(guideSource, 'guideCommandRegistry', 'guide-commands.js');

const byCommand = new Map();
for (const definition of [...routeDefinitions, ...guideDefinitions, ...inlineDefinitions]) {
  if (!byCommand.has(definition.command)) byCommand.set(definition.command, definition);
}
const commands = [...byCommand.values()];

const hiddenCommands = [...protocolSource.matchAll(/commandMap\['([^']+)'\]\s*=/g)].map((m) => m[1]);
const parameterPrefixes = [...sourceBetween(
  protocolSource, 'const parameterActions = [', '\n      ];\n\n      // Ham'
).matchAll(/\[\s*'([^']+)'\s*,/g)].map((m) => m[1].trim());

const virtualFs = [...sourceBetween(vfsSource, 'const VIRTUAL_FS = Object.freeze({', '});')
  .matchAll(/'([^']+)':\s*Object\.freeze\(\[([^\]]*)\]\)/g)]
  .map((m) => ({ path: m[1], entries: [...m[2].matchAll(/'([^']+)'/g)].map((e) => e[1]) }));

const keyboardHelp = (protocolSource.match(/const keyboardHelpText = \(\) => '([^']+)'/) || [])[1] || '';
const levels = [...(protocolSource.match(/const levels = \[([^\]]*)\]/) || ['', ''])[1]
  .matchAll(/'([^']+)'/g)].map((m) => m[1]);
const fileLimits = {
  max: (vfsSource.match(/MAX_FILES = (\d+)/) || [])[1],
  name: (vfsSource.match(/MAX_FILE_NAME = (\d+)/) || [])[1],
  content: (vfsSource.match(/MAX_FILE_CONTENT = (\d+)/) || [])[1]
};

const cacheName = (swSource.match(/CACHE_NAME = '([^']+)'/) || [])[1] || '?';
const protocolVersion = (indexSource.match(/home-protocol\.js\?v=(\d+)/) || [])[1] || '?';
const today = new Date().toISOString().slice(0, 10);

const labels = commands.reduce((sum, c) => sum + 1 + c.aliases.length, 0);

// Komutu niyet grubuna esle (help ciktisiyla ayni mantik degil, kaba tasnif).
const missingDescription = commands.filter((c) => !c.description).map((c) => c.command);

// --- Rehber --------------------------------------------------------------

const indexTable = commands
  .slice()
  .sort((a, b) => a.command.localeCompare(b.command, 'tr'))
  .map((c) => `| \`${c.command}\` | ${(c.description || '—').replace(/\|/g, '/')} | ${c.aliases.length ? c.aliases.join(', ') : '—'} |`)
  .join('\n');

const fsTree = virtualFs
  .map((dir) => `${dir.path.padEnd(10)} → ${dir.entries.length ? dir.entries.join(' · ') : '(bos)'}`)
  .join('\n');

const guide = `# Convivium Terminal — Kendin İçin Rehber

Üretim tarihi: ${today} · Sürüm: \`${cacheName}\`, protocol \`v${protocolVersion}\`

> Bu belge \`npm run docs:terminal\` ile **koddan üretildi.** Elle düzenleme —
> komut eklediğinde betiği tekrar çalıştır, kendini yeniden yazar.
> Depoda değil; git görmüyor.

**${commands.length} komut · ${labels} etiket (komut + alias) · ${parameterPrefixes.length} parametreli önek**

---

## 1. Bir dakikada: terminal nedir, nasıl açılır

Ana sayfadaki **\`TERMİNALİ AÇ\`** düğmesi (ya da sağ alttaki \`CMD\`, ya da
klavyeden \`?\` veya \`Ctrl+K\`).

Açılınca bir boot dizisi akar. **\`OK: terminal ready\`** yazana kadar komutlar
işlenmez — sık düşülen tuzak bu.

Kapatmak: \`Esc\` ya da \`exit\`.

---

## 2. Kaybolduğunda: bu 5 komut yeter

| Komut | Ne yapar |
|---|---|
| \`help\` | 12 satırlık pusula: niyet grupları + nerede olduğun + sıradaki hedef |
| \`help all\` | **${commands.length} komutun tamamı**, canlı kayıttan üretilir |
| \`man <komut>\` | Tek bir komutun kılavuzu |
| \`look\` | Bulunduğun odayı tasvir eder |
| \`journal\` | Görev kütüğü: ilerleme, izler, sıradaki hedef |

\`find <kelime>\` komut ve rota arasında arar.

---

## 3. Terminal nasıl "düşünür"

Bunu bilmek ${commands.length} komutu ezberlemekten daha çok işine yarar.

**Kanonik komut vs. alias.** Her komutun bir kanonik adı ve bazen düzinelerce
alias'ı var. \`harita\` yazarsan çalışır ama öneride \`map\` gösterilir.

**Öneriler.** En fazla 3 öneri çıkar:
- Yazarken input **kendiliğinden değişmez**
- \`Tab\` aktif öneriyi alır
- Fare/dokunmatik seçim sadece doldurur, çalıştırmaz
- Ok tuşuyla **açıkça** seçilen öneri \`Enter\` ile çalışır
- Yazım hatasında ilk \`Enter\` düzeltir, ikinci \`Enter\` çalıştırır

**\`neden\`** öneri motorunun kararını döker:

\`\`\`
neden hepl
→ 1. help  [duzelt] toplam 729
     yazim mesafesi: 1 harf     -> +420
     bulundugun baglam: sira 12 -> +209
     cekirdek komut: sira 1     -> +100
\`\`\`

Katkıların toplamı skora **eşittir**; eşit değilse bu bir hatadır.

---

## 4. Sanal dünya: odalar ve dosya sistemi

\`cd\` ile gezdiğin şey sayfa değil, terminalin kendi dünyası.
Kökte \`ls\` yapınca görünenler:

\`\`\`
${fsTree}
\`\`\`

**Kök listede görünmeyen ama var olan odalar:** \`/core\` ve \`/atlas\`
(mühürlü), \`/ruins\` ve \`/net\` (modüller çalışma anında mount eder).
\`cd ruins\` ve \`cd net\` çalışır.

**Odalarda ne yaparsın:** \`look\` → \`examine <nesne>\` → \`take <nesne>\` →
\`inventory\` → \`use <nesne> on <hedef>\` → \`unlock <eşik>\`

**\`/home\` gerçek bir dosya sistemi.** En fazla ${fileLimits.max} dosya,
ad ${fileLimits.name} karakter, içerik ${fileLimits.content} karakter —
hepsi \`localStorage\`'da:

\`\`\`
touch notlar.txt
echo "bir sey" > notlar.txt
echo "ekleme" >> notlar.txt
cat notlar.txt
rm notlar.txt
\`\`\`

---

## 5. \`/net\` — ağ keşif bulmacası

\`cd net\` ile girilir. Komutlar: \`nmap\` (tara) · \`connect <ip>\` ·
\`pass <deneme>\` · \`hint\` · \`wake <mac>\` · \`download <dosya>\` ·
\`disconnect\`.

Bağlıyken \`ls\`/\`cd\`/\`cat\` **cihazın** dosyalarını gösterir, senin
\`/home\`'unu değil.

Cihazların online olması deterministik: \`hash(cihaz + 10dk penceresi)\`.
Her tarama farklı görünür ama rastgele değil. Kasa her zaman kapalı başlar,
yalnız \`wake\` ile açılır.

---

## 6. TORTU — sitenin kendi jeolojisi

Uydurma değil: deponun gerçek git geçmişinden kazılır.

| Komut | İş |
|---|---|
| \`kaz\` | Günün karotu — herkes aynı tabakayı kazar |
| \`kaz 42\` | 42. derinlik (1 = en eski) |
| \`kaz <sha>\` | Belirli commit |
| \`tabaka\` | Eralar — PELT ile **commit indeksinde** bulunur |
| \`damar\` | Birlikte değişen dosya kümeleri (Jaccard + Louvain) |
| \`taban\` | Sitenin üstünde durduğu zemin |

---

## 7. Kabuk özellikleri

Bu gerçek bir kabuk. \`shell\` kılavuzu verir.

\`\`\`
help | grep oyun          pipe
fortune | cowsay

echo "not" > dosya.txt    yönlendirme (üzerine yaz)
echo "ek" >> dosya.txt    ekle

export AD=deger           değişken
echo $AD
env
unset AD

history                   numaralı geçmiş
!42                       42 numaralı komutu tekrar çalıştır

alias ll look             kişisel kısayol
unalias ll
\`\`\`

Kişisel alias tam eşleşirse, registry alias'ıyla çakışsa bile \`Enter\`'da
**seninki** önce çalışır.

---

## 8. Klavye kısayolları

\`\`\`
${keyboardHelp}
\`\`\`

---

## 9. Erişim seviyeleri

${levels.map((l, i) => `${i + 1}. \`${l}\``).join(' → ')}

\`level\` ile bak. \`manifest\` · \`clues\` · \`unlock hidden\` · \`badge\`
ilerleme komutları.

**Kayıtta görünmeyen komut:** ${hiddenCommands.map((c) => `\`${c}\``).join(', ')}.
8 saniye içinde iki gezgin aynı kelimeyi yazarsa rezonans tetiklenir.
Bilerek \`help all\` indeksinde yok.

---

## 10. Parametre alan komutlar

Bu ${parameterPrefixes.length} önek "kelime + boşluk + argüman" biçiminde çalışır:

\`\`\`
${parameterPrefixes.join(' · ')}
\`\`\`

---

## 11. Tam dizin — ${commands.length} komut

| Komut | Açıklama | Alias |
|---|---|---|
${indexTable}

---

## Notlar

- \`help all\` her zaman bu tablodan güncel: canlı kayıttan üretilir.
  Bu belge \`${cacheName}\` anına ait bir fotoğraf.
- Gizli komutlar (${hiddenCommands.join(', ')}) dizinde bilerek yok.
${missingDescription.length
  ? `- **Açıklaması eksik komut:** ${missingDescription.map((c) => `\`${c}\``).join(', ')} — kayıtta \`description\` alanı boş.`
  : '- Bütün komutların açıklaması dolu.'}
`;

// --- Yazim ---------------------------------------------------------------

if (process.argv.includes('--stdout')) {
  process.stdout.write(guide);
  process.exit(0);
}

const outIndex = process.argv.indexOf('--out');
const outPath = outIndex !== -1 && process.argv[outIndex + 1]
  ? path.resolve(process.argv[outIndex + 1])
  : path.join(os.homedir(), 'Documents', 'convivium-terminal-rehberi.md');

// Rehber kisisel bir belgedir; depoya yazilmasi kaza olur.
if (outPath.startsWith(root + path.sep)) {
  console.error('build-terminal-guide: cikti depo icine yazilamaz.');
  console.error(`  ${outPath}`);
  console.error('  Rehber yayinlanmaz. --out ile depo disinda bir yol ver.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, guide);

console.log(`Terminal rehberi yazildi: ${outPath}`);
console.log(`  ${commands.length} komut · ${labels} etiket · ${parameterPrefixes.length} parametreli onek`);
console.log(`  surum ${cacheName} / protocol v${protocolVersion}`);
if (missingDescription.length) {
  console.log(`  UYARI: aciklamasi eksik komut: ${missingDescription.join(', ')}`);
}
