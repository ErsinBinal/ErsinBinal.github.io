// ZAR — 5. boyut ile 4. boyut arasindaki zar.
//
// Anayasa Madde 6/3: uretilen sey siteye ancak DIFF ile gecer.
// Madde 6/4: uretec kendi elegini, anayasasini ya da yayin ritualini uretemez.
//
// Bu script o iki maddeyi MEKANIK hale getirir: gece uretiminden sonra
// calisma agacinda degisen dosyalari izinli listeyle karsilastirir. Liste
// disinda tek dosya bile degistiyse ZAR KAPANIR ve is duser.
//
// Neden ayri bir script: kural YAML icinde gomulu kalirsa test edilemez.
// Burada durdugu icin `node scripts/filiz-zar.js --kendini-dene` ile
// kapinin gercekten kapandigi kanitlanabilir.

const { execSync } = require('child_process');

// Gece uretimi YALNIZ bunlari yazabilir. Uretecin cikti dosyasi ve baska
// hicbir sey. Elek (scripts/build-filiz.js), anayasa (docs/), yayin ritueli
// (scripts/publish-slice.js) ve testler bilerek DISARIDA.
const IZINLI = [
  'assets/data/filiz.json'
];

const izinli = (file) => IZINLI.includes(file);

const degisenler = () => execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.slice(3).trim())
  .filter(Boolean);

// Kapinin gercekten kapandigini kanitla: uydurma bir ihlal ver, reddetmeli.
if (process.argv.includes('--kendini-dene')) {
  const sahte = ['assets/data/filiz.json', 'scripts/build-filiz.js'];
  const ihlal = sahte.filter((f) => !izinli(f));
  if (ihlal.length !== 1 || ihlal[0] !== 'scripts/build-filiz.js') {
    console.error('ZAR KENDINI DENEDI VE GECTI — kapi bozuk.');
    process.exit(1);
  }
  console.log('zar: kendini denedi, kapandi (uretec kendi elegini yazamaz).');
  process.exit(0);
}

const files = degisenler();

if (!files.length) {
  console.log('zar: degisiklik yok, aciklacak bir sey yok.');
  process.exit(78);   // notrr cikis: is basarili ama PR acilmayacak
}

const ihlal = files.filter((file) => !izinli(file));
if (ihlal.length) {
  console.error('ZAR KAPANDI — uretim izinli alanin disina cikti:');
  ihlal.forEach((file) => console.error(`  ${file}`));
  console.error('');
  console.error('Madde 6/4: uretec kendi elegini, anayasasini ya da yayin');
  console.error('ritualini uretemez. Bu bir hata degil, bir SINIR.');
  process.exit(1);
}

console.log('zar: gecti. Degisen dosyalar izinli alanda:');
files.forEach((file) => console.log(`  ${file}`));
