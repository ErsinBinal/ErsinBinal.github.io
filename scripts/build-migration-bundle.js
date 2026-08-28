// Bekleyen Supabase migration'larini TEK bir dosyada, DOGRU SIRADA birlestirir.
//
// Neden gerekli: migration'lar aylardir bekliyor ve aralarinda sessiz bir
// bagimlilik tuzagi var — kolektif-rituel `site_events` tablosunu ALTER
// ediyor, o tablo ise ayri ve "opsiyonel" bir migration'da yaratiliyor.
// Yanlis sirada calistirilirsa hata verir ve yarim uygulanmis sema birakir.
//
// Cikti idempotenttir: hepsi `if not exists` / `drop ... if exists` deseni
// kullanir, yeniden calistirmak guvenlidir.
//
// Kullanim:
//   npm run build:migration            # docs/database/PENDING.sql uret
//   npm run build:migration -- --check # sira ve idempotentligi dogrula

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const DB = path.join(root, 'docs', 'database');
const OUT = path.join(DB, 'PENDING.sql');

// SIRA ONEMLI. Her satir: [dosya, neden bu sirada].
const ORDER = [
  ['2026-07-02-site-events.sql',
    'Once bu: kolektif-rituel bu tabloyu ALTER ediyor. Ana semada yok, ayri tutuluyor.'],
  ['2026-07-17-shards.sql',
    'world_state.shards kolonu. Ana semadaki world_state tablosuna dayanir.'],
  ['2026-07-22-ruya-gunlugu.sql',
    'Yalniz fonksiyon; bagimliligi yok.'],
  ['2026-07-22-kolektif-rituel.sql',
    'site_events tablosunu ALTER eder — yukaridaki ilk adim kosmus olmali.'],
  ['2026-07-17-bottles.sql',
    'Kendi tablosunu yaratir; auth.users disinda bagimliligi yok.'],
  ['2026-07-22-finger-hediye.sql',
    'profiles kolonlari + RPC. Ana semadaki profiles tablosuna dayanir.'],
  ['2026-07-20-social-chat.sql',
    'En buyugu: 5 tablo, RLS ve RPC. En sona konur, digerlerine dayanmaz.']
];

const files = ORDER.map(([name, why]) => {
  const full = path.join(DB, name);
  if (!fs.existsSync(full)) {
    console.error(`build-migration-bundle: dosya yok: ${name}`);
    process.exit(1);
  }
  return { name, why, sql: fs.readFileSync(full, 'utf8').trim() };
});

// --- Idempotentlik denetimi ---------------------------------------------
// Korumasiz bir CREATE, ikinci calistirmada patlar ve yarim sema birakir.
const problems = [];
for (const file of files) {
  const lines = file.sql.split('\n');
  lines.forEach((line, index) => {
    const create = line.match(/^\s*create\s+(table|index|type|policy|trigger)\s+/i);
    if (!create) return;
    if (/if not exists/i.test(line)) return;
    // policy/trigger icin drop-before-create deseni kabul edilir.
    const previous = lines.slice(Math.max(0, index - 3), index).join('\n');
    if (/drop\s+(policy|trigger)\s+if\s+exists/i.test(previous)) return;
    problems.push(`${file.name}:${index + 1}  korumasiz create ${create[1]}`);
  });
}

if (process.argv.includes('--check')) {
  console.log(`sira: ${files.length} migration`);
  files.forEach((file, i) => console.log(`  ${i + 1}. ${file.name}`));
  if (problems.length) {
    console.error('\nIDEMPOTENT DEGIL:');
    problems.forEach((problem) => console.error(`  - ${problem}`));
    process.exit(1);
  }
  console.log('\nHepsi idempotent: yeniden calistirmak guvenli.');
  process.exit(0);
}

if (problems.length) {
  console.error('build-migration-bundle: idempotent olmayan ifade var, paket uretilmedi:');
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}

const header = `-- Convivium — BEKLEYEN SUPABASE MIGRATION'LARI (tek paket)
--
-- URETILMIS DOSYA. Elle duzenleme; kaynak dosyalar docs/database/ altinda.
-- Yeniden uretmek icin: npm run build:migration
--
-- NASIL CALISTIRILIR
--   1. Supabase panelinde projeyi ac
--   2. SQL Editor > New query
--   3. Bu dosyanin TAMAMINI yapistir
--   4. Run
--
-- GUVENLIDIR: hepsi idempotent (if not exists / drop-before-create).
-- Yeniden calistirmak veri kaybetmez, zaten uygulanmis adimlari atlar.
--
-- SIRA ONEMLI ve bu dosyada dogru kurulmustur. Ozellikle:
--   site_events ONCE gelir; kolektif-rituel onu ALTER eder.
--
-- Calistirdiktan sonra en alttaki DOGRULAMA sorgusu neyin kuruldugunu listeler.

`;

const body = files.map((file, index) => [
  '',
  '-- ============================================================',
  `-- ${index + 1}/${files.length}  ${file.name}`,
  `-- ${file.why}`,
  '-- ============================================================',
  '',
  file.sql,
  ''
].join('\n')).join('\n');

const verify = `
-- ============================================================
-- DOGRULAMA — bunu calistirdiktan sonra ayrica kos
-- ============================================================
-- Beklenen: asagidaki satirlarin hepsi 'VAR' demeli.

select 'tablo: bottle_messages' as ne,
       case when to_regclass('public.bottle_messages') is null then 'YOK' else 'VAR' end as durum
union all select 'tablo: friendships',
       case when to_regclass('public.friendships') is null then 'YOK' else 'VAR' end
union all select 'tablo: chat_threads',
       case when to_regclass('public.chat_threads') is null then 'YOK' else 'VAR' end
union all select 'tablo: chat_messages',
       case when to_regclass('public.chat_messages') is null then 'YOK' else 'VAR' end
union all select 'tablo: member_blocks',
       case when to_regclass('public.member_blocks') is null then 'YOK' else 'VAR' end
union all select 'tablo: site_events',
       case when to_regclass('public.site_events') is null then 'YOK' else 'VAR' end
union all select 'kolon: world_state.shards',
       case when exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='world_state' and column_name='shards')
            then 'VAR' else 'YOK' end
union all select 'rpc: throw_bottle',
       case when to_regprocedure('public.throw_bottle(text,uuid)') is null then 'YOK' else 'VAR' end
union all select 'rpc: finger_profile',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='finger_profile')
            then 'VAR' else 'YOK' end
union all select 'rpc: gift_card',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='gift_card')
            then 'VAR' else 'YOK' end
union all select 'rpc: collect_pulse',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='collect_pulse')
            then 'VAR' else 'YOK' end
union all select 'rpc: dream_stats',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='dream_stats')
            then 'VAR' else 'YOK' end;
`;

fs.writeFileSync(OUT, header + body + verify);
console.log(`docs/database/PENDING.sql yazildi: ${files.length} migration, ${Math.round(fs.statSync(OUT).size / 1024)} KB`);
files.forEach((file, i) => console.log(`  ${i + 1}. ${file.name}`));
console.log('\nSupabase panelinde SQL Editor > New query > yapistir > Run.');
