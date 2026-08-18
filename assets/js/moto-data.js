/**
 * Demir At Terazisi - garaj verisi
 *
 * VERI SOZLESMESI (bozulursa tum turetilmis metrikler yanlislanir):
 *  - weight.kg  : DAIMA kerb/yas agirlik (tum sivilar dolu). Kuru agirlik girilmez.
 *  - power.hp   : uretici beyani, AB (EU) homologasyon degeri.
 *  - torque.nm  : uretici beyani.
 *  - estimated  : uretici o degeri yayimlamiyorsa true (arayuzde rozetle gorunur).
 *
 * Her satir dogrulanmis kaynagi tasir; kaynaksiz satir eklenmez.
 */
(() => {
  const CLASSES = Object.freeze([
    Object.freeze({ key: 'naked', label: 'Naked', blurb: 'Çıplak gövde, dik sürüş, açıkta motor.' }),
    Object.freeze({ key: 'cruiser', label: 'Cruiser', blurb: 'Uzun aks, alçak sele, düşük devirde tork.' }),
    Object.freeze({ key: 'bobber', label: 'Bobber', blurb: 'Tek sele, kesik çizgi, gereksiz her şey sökülmüş.' }),
    Object.freeze({ key: 'adventure', label: 'Adventure', blurb: 'Yüksek süspansiyon, büyük ön tekerlek, yol dışı niyet.' }),
    Object.freeze({ key: 'scrambler', label: 'Scrambler', blurb: 'Yüksek egzoz, düz sele, şehirle toprak arası.' })
  ]);

  const GARAGE = [
    {
      id: 'yamaha-mt-09',
      brand: 'Yamaha',
      model: 'MT-09',
      year: 2024,
      class: 'naked',
      engine: { cc: 890, cylinders: 3, layout: 'sirali 3' },
      power: { hp: 117.3, kw: 87.5, rpm: 10000, estimated: false },
      torque: { nm: 93, rpm: 7000 },
      weight: { kg: 193, kind: 'kerb' },
      chassis: { wheelbase: 1430, seatHeight: 825, frontWheel: 17, tank: 14 },
      source: 'Yamaha AB teknik foyu / Wikipedia MT-09',
      note: 'Görselde SP donanımı; veri satırı standart MT-09.'
    },
    {
      id: 'cfmoto-700clx',
      brand: 'CFMoto',
      model: '700CL-X Heritage',
      year: 2024,
      class: 'naked',
      engine: { cc: 693, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 74.8, kw: 55, rpm: 8500, estimated: false },
      torque: { nm: 68, rpm: 6500 },
      weight: { kg: 196, kind: 'kerb' },
      chassis: { wheelbase: 1420, seatHeight: 800, frontWheel: 18, tank: 13 },
      source: 'CFMoto teknik foyu / motorcyclespecs'
    },
    {
      id: 'harley-davidson-fat-boy-114',
      brand: 'Harley-Davidson',
      model: 'Fat Boy 114',
      year: 2024,
      class: 'cruiser',
      engine: { cc: 1868, cylinders: 2, layout: 'V-twin' },
      power: { hp: 94, kw: 70, rpm: null, estimated: true },
      torque: { nm: 161, rpm: 3000 },
      weight: { kg: 317, kind: 'kerb' },
      chassis: { wheelbase: 1665, seatHeight: 675, frontWheel: 18, tank: 18.9 },
      source: 'Harley-Davidson 2024 teknik foyu (119 lb-ft / 699 lb)',
      note: 'Harley, Milwaukee-Eight motorlar için beygir yayımlamaz; değer bağımsız ölçümlerden tahminidir.'
    },
    {
      id: 'kawasaki-vulcan-s',
      brand: 'Kawasaki',
      model: 'Vulcan S',
      year: 2025,
      class: 'cruiser',
      engine: { cc: 649, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 61, kw: 44.9, rpm: 7500, estimated: false },
      torque: { nm: 62.8, rpm: 6600 },
      weight: { kg: 229, kind: 'kerb' },
      chassis: { wheelbase: 1575, seatHeight: 705, frontWheel: 18, tank: 14 },
      source: 'Kawasaki AB teknik foyu'
    },
    {
      id: 'triumph-bonneville-bobber',
      brand: 'Triumph',
      model: 'Bonneville Bobber',
      year: 2024,
      class: 'bobber',
      engine: { cc: 1200, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 76.9, kw: 57.4, rpm: 6100, estimated: false },
      torque: { nm: 106, rpm: 4000 },
      weight: { kg: 251, kind: 'kerb' },
      chassis: { wheelbase: 1500, seatHeight: 690, frontWheel: 16, tank: 12 },
      source: 'Triumph resmi teknik foyu'
    },
    {
      id: 'royal-enfield-shotgun-650',
      brand: 'Royal Enfield',
      model: 'Shotgun 650',
      year: 2024,
      class: 'bobber',
      engine: { cc: 648, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 47, kw: 34.6, rpm: 7250, estimated: false },
      torque: { nm: 52.3, rpm: 5650 },
      weight: { kg: 240, kind: 'kerb' },
      chassis: { wheelbase: 1465, seatHeight: 795, frontWheel: 18, tank: 13.8 },
      source: 'Royal Enfield teknik foyu (PDF)'
    },
    {
      id: 'bmw-r-1300-gs',
      brand: 'BMW',
      model: 'R 1300 GS',
      year: 2024,
      class: 'adventure',
      engine: { cc: 1300, cylinders: 2, layout: 'boxer 2' },
      power: { hp: 145, kw: 107, rpm: 7750, estimated: false },
      torque: { nm: 149, rpm: 6500 },
      weight: { kg: 237, kind: 'kerb' },
      chassis: { wheelbase: 1518, seatHeight: 850, frontWheel: 19, tank: 19 },
      source: 'BMW Motorrad teknik foyu'
    },
    {
      id: 'suzuki-v-strom-800de',
      brand: 'Suzuki',
      model: 'V-Strom 800DE',
      year: 2025,
      class: 'adventure',
      engine: { cc: 776, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 84, kw: 62, rpm: 8500, estimated: false },
      torque: { nm: 78, rpm: 6800 },
      weight: { kg: 230, kind: 'kerb' },
      chassis: { wheelbase: 1570, seatHeight: 855, frontWheel: 21, tank: 20 },
      source: 'Suzuki 2025 teknik foyu'
    },
    {
      id: 'honda-cl500',
      brand: 'Honda',
      model: 'CL500',
      year: 2024,
      class: 'scrambler',
      engine: { cc: 471, cylinders: 2, layout: 'paralel 2' },
      power: { hp: 46.2, kw: 34, rpm: 8500, estimated: false },
      torque: { nm: 43.4, rpm: 6250 },
      weight: { kg: 192, kind: 'kerb' },
      chassis: { wheelbase: 1485, seatHeight: 790, frontWheel: 19, tank: 12 },
      source: 'Honda AB teknik foyu'
    },
    {
      id: 'triumph-scrambler-400x',
      brand: 'Triumph',
      model: 'Scrambler 400 X',
      year: 2024,
      class: 'scrambler',
      engine: { cc: 398, cylinders: 1, layout: 'tek silindir' },
      power: { hp: 39.5, kw: 29.4, rpm: 8000, estimated: false },
      torque: { nm: 37.5, rpm: 6500 },
      weight: { kg: 179, kind: 'kerb' },
      chassis: { wheelbase: 1418, seatHeight: 835, frontWheel: 19, tank: 13 },
      source: 'Triumph resmi teknik foyu'
    }
  ];

  const deepFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  };

  window.ConviviumMoto = window.ConviviumMoto || {};
  window.ConviviumMoto.CLASSES = CLASSES;
  window.ConviviumMoto.GARAGE = deepFreeze(GARAGE);
  window.ConviviumMoto.DATA_VERSION = 'v1 · 2026-08';
  window.ConviviumMoto.frameUrl = (id) => `/assets/img/moto/${id}.webp`;
})();
