/**
 * Convivium - Tuslu telefon sembol rafi
 * Emoji, gorsel ya da marka varligi kullanmayan SMS donemi metin ifadeleri.
 * Katalog salt-okunurdur; secim aktif inputun imlecine eklenir, gonderilmez.
 * (c) 2026 Ersin Binal - https://ersinbinal.github.io
 */
(() => {
  window.ConviviumHome = window.ConviviumHome || {};

  const freezeCategory = (id, label, items) => Object.freeze({
    id,
    label,
    items: Object.freeze(items.map(([symbol, name]) => Object.freeze({ symbol, name })))
  });

  const categories = Object.freeze([
    freezeCategory('temel', 'TEMEL SINYALLER', [
      [':)', 'gulumseme'], [':(', 'uzulme'], [';)', 'goz kirpma'], [':D', 'kahkaha'],
      [':P', 'dil cikarma'], [':O', 'sasirma'], [':/', 'kararsizlik'], [':|', 'ifadesiz']
    ]),
    freezeCategory('tavir', 'TAVIR VE TEPKI', [
      ['^_^', 'mutlu'], ['-_-', 'bezgin'], ['o_O', 'suphe'], ['>_<', 'gerilim'],
      ['XD', 'katila katila gulme'], [':S', 'kafasi karisik'], ['B-)', 'havali'], [':-X', 'sir']
    ]),
    freezeCategory('jest', 'JESTLER', [
      [":'(", 'gozu yasli'], [':-*', 'opucuk'], ['<3', 'kalp'], [':-)', 'klasik gulumseme'],
      [':-(', 'klasik uzulme'], [';-)', 'klasik goz kirpma'], [':-P', 'klasik sakaci'], [':-O', 'klasik sasirma']
    ])
  ]);

  const insertAtCursor = (rawValue, symbol, start, end, maxLength = 1000) => {
    const value = String(rawValue || '');
    const token = String(symbol || '');
    const limit = Math.max(1, Number(maxLength) || 1000);
    const safeStart = Number.isInteger(start) ? Math.max(0, Math.min(start, value.length)) : value.length;
    const safeEnd = Number.isInteger(end) ? Math.max(safeStart, Math.min(end, value.length)) : safeStart;
    const room = Math.max(0, limit - (value.length - (safeEnd - safeStart)));
    const inserted = token.slice(0, room);
    const next = `${value.slice(0, safeStart)}${inserted}${value.slice(safeEnd)}`.slice(0, limit);
    return { value: next, caret: Math.min(safeStart + inserted.length, next.length) };
  };

  window.ConviviumHome.chatSymbols = Object.freeze({ categories, insertAtCursor });
})();
