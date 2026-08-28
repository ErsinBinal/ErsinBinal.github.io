(() => {
  'use strict';

  // SIGIL — adres bir enstrumandir.
  //
  // Kazi Evi, Madde 1: IZ TASINMAZ, YENIDEN TURETILIR.
  // Adres iciligi TASIMAZ; yalnizca {tur, girdi} tasir ve alici cihaz ciktiyi
  // YENIDEN HESAPLAR. Sunucuda depolama yok, link ~40 bayt, dogrulama alicida.
  // Determinizm boylece bir kisit olmaktan cikip paylasim altyapisi olur.
  //
  // Bicim:  #iz=<base64url( TLV govde || FNV-1a 32-bit muhur )>
  //
  // Bu modul SAFTIR: DOM yok, ag yok, location yok. Adresi yazmak ve okumak
  // protocol callback'lerinin isi.

  const root = window.ConviviumHome = window.ConviviumHome || {};

  const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  // --- Yuk tipleri ---------------------------------------------------------
  // Tag bir bayttir ve ASLA yeniden kullanilmaz: eski adresler calismaya devam
  // etmeli. Yeni tur eklemek yeni bir tag almak demektir.
  const KIND = deepFreeze({
    kaz: 1,       // bir tortu karotu   -> girdi: commit sha
    tabaka: 2,    // eralar gorunumu    -> girdi yok
    damar: 3,     // damarlar gorunumu  -> girdi yok
    neden: 4,     // oneri gerekcesi    -> girdi: sorgu metni
    taban: 5      // taban kaya         -> girdi yok
  });
  const KIND_BY_TAG = deepFreeze(
    Object.fromEntries(Object.entries(KIND).map(([name, tag]) => [tag, name]))
  );

  const SCHEMA_VERSION = 1;

  // --- Bayt yardimcilari ---------------------------------------------------

  const utf8 = (text) => {
    const out = [];
    for (const char of String(text)) {
      const code = char.codePointAt(0);
      if (code < 0x80) out.push(code);
      else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0x10000) {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        out.push(
          0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)
        );
      }
    }
    return out;
  };

  const fromUtf8 = (bytes) => {
    let out = '';
    for (let i = 0; i < bytes.length;) {
      const b = bytes[i];
      let code;
      let size;
      if (b < 0x80) { code = b; size = 1; }
      else if ((b & 0xe0) === 0xc0) { code = b & 0x1f; size = 2; }
      else if ((b & 0xf0) === 0xe0) { code = b & 0x0f; size = 3; }
      else { code = b & 0x07; size = 4; }
      if (i + size > bytes.length) return null;
      for (let k = 1; k < size; k += 1) {
        if ((bytes[i + k] & 0xc0) !== 0x80) return null;
        code = (code << 6) | (bytes[i + k] & 0x3f);
      }
      out += String.fromCodePoint(code);
      i += size;
    }
    return out;
  };

  // LEB128 degisken uzunluklu tamsayi — kisa degerler tek bayt.
  const writeVarint = (out, value) => {
    let n = value >>> 0;
    do {
      let byte = n & 0x7f;
      n >>>= 7;
      if (n) byte |= 0x80;
      out.push(byte);
    } while (n);
  };

  const readVarint = (bytes, cursor) => {
    let result = 0;
    let shift = 0;
    let index = cursor;
    while (index < bytes.length) {
      const byte = bytes[index];
      index += 1;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return { value: result >>> 0, next: index };
      shift += 7;
      if (shift > 28) return null;
    }
    return null;
  };

  // FNV-1a 32 bit. Kriptografik degil ve oyle sunulmuyor: amaci bozulmus
  // adresi REDDETMEK, saldirganı durdurmak degil.
  const FNV_OFFSET = 0x811c9dc5;
  const FNV_PRIME = 0x01000193;
  const fnv1a = (bytes) => {
    let hash = FNV_OFFSET;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }
    return hash >>> 0;
  };

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const B64_INDEX = Object.fromEntries(Array.from(B64, (c, i) => [c, i]));

  // Base64url, RFC 4648 §5, dolgusuz.
  const toBase64Url = (bytes) => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = bytes[i + 1];
      const b2 = bytes[i + 2];
      out += B64[b0 >> 2];
      out += B64[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
      if (b1 === undefined) break;
      out += B64[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
      if (b2 === undefined) break;
      out += B64[b2 & 63];
    }
    return out;
  };

  const fromBase64Url = (text) => {
    const clean = String(text || '');
    if (!/^[A-Za-z0-9\-_]*$/.test(clean)) return null;
    const bytes = [];
    for (let i = 0; i < clean.length; i += 4) {
      const c0 = B64_INDEX[clean[i]];
      const c1 = B64_INDEX[clean[i + 1]];
      if (c0 === undefined || c1 === undefined) return null;
      bytes.push((c0 << 2) | (c1 >> 4));
      const c2 = B64_INDEX[clean[i + 2]];
      if (c2 === undefined) break;
      bytes.push(((c1 & 15) << 4) | (c2 >> 2));
      const c3 = B64_INDEX[clean[i + 3]];
      if (c3 === undefined) break;
      bytes.push(((c2 & 3) << 6) | c3);
    }
    return bytes;
  };

  // --- Gorunur muhur -------------------------------------------------------
  // 32 bitlik muhur, karistirilmasi zor bir alfabeyle 6 haneye iner.
  // I/O/0/1 yok: elle kopyalanan bir seyde en sik karisan karakterler.
  const SEAL_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const sealText = (hash) => {
    let value = hash >>> 0;
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      out = SEAL_ALPHABET[value % 32] + out;
      value = Math.floor(value / 32);
    }
    return out;
  };

  // Drunken Bishop (OpenSSH randomart). Muhur baytlari uzerinde yurur; her
  // bayt LSB'den 4 adet 2-bit hamle verir. Gorsel bir parmak izidir:
  // iki farkli adres birbirine benzemez, ayni adres her zaman ayni desendir.
  const BISHOP_CHARS = ' .o+=*B0X@%&#/^';
  const randomart = (bytes) => {
    const W = 17;
    const H = 9;
    const board = new Array(W * H).fill(0);
    let x = Math.floor(W / 2);
    let y = Math.floor(H / 2);
    for (const byte of bytes) {
      for (let i = 0; i < 4; i += 1) {
        const move = (byte >> (2 * i)) & 3;
        x += (move & 1) ? 1 : -1;
        y += (move & 2) ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
        y = Math.max(0, Math.min(H - 1, y));
        const cell = y * W + x;
        if (board[cell] < BISHOP_CHARS.length - 1) board[cell] += 1;
      }
    }
    const start = Math.floor(H / 2) * W + Math.floor(W / 2);
    const end = y * W + x;
    const lines = [`+${'-'.repeat(W)}+`];
    for (let row = 0; row < H; row += 1) {
      let line = '|';
      for (let col = 0; col < W; col += 1) {
        const cell = row * W + col;
        if (cell === start) line += 'S';
        else if (cell === end) line += 'E';
        else line += BISHOP_CHARS[board[cell]];
      }
      lines.push(`${line}|`);
    }
    lines.push(`+${'-'.repeat(W)}+`);
    return lines.join('\n');
  };

  root.createSigil = function createSigil() {
    // --- Kodlama -----------------------------------------------------------
    // Kanonik govde: [surum][tag][girdi uzunlugu][girdi baytlari]
    // Alan sirasi SABIT — ayni yuk her zaman ayni baytlari verir (D1).
    const bodyBytes = (kind, input) => {
      const tag = KIND[kind];
      if (!tag) return null;
      const body = [];
      writeVarint(body, SCHEMA_VERSION);
      body.push(tag);
      const payload = utf8(input == null ? '' : String(input));
      writeVarint(body, payload.length);
      for (const byte of payload) body.push(byte);
      return body;
    };

    const encode = (kind, input = '') => {
      const body = bodyBytes(kind, input);
      if (!body) return null;
      const hash = fnv1a(body);
      const sealed = body.concat([
        (hash >>> 24) & 0xff, (hash >>> 16) & 0xff, (hash >>> 8) & 0xff, hash & 0xff
      ]);
      return toBase64Url(sealed);
    };

    const decode = (text) => {
      const bytes = fromBase64Url(text);
      if (!bytes || bytes.length < 7) return null;

      const body = bytes.slice(0, bytes.length - 4);
      const tail = bytes.slice(bytes.length - 4);
      const expected = ((tail[0] << 24) | (tail[1] << 16) | (tail[2] << 8) | tail[3]) >>> 0;
      // Muhur tutmuyorsa adres BOZULMUS demektir; sessizce yanlis sey acmaktansa
      // acikca reddedilir.
      if (fnv1a(body) !== expected) return null;

      const version = readVarint(body, 0);
      if (!version || version.value !== SCHEMA_VERSION) return null;
      const tag = body[version.next];
      const kind = KIND_BY_TAG[tag];
      if (!kind) return null;
      const length = readVarint(body, version.next + 1);
      if (!length) return null;
      const start = length.next;
      if (start + length.value !== body.length) return null;
      const input = fromUtf8(body.slice(start, start + length.value));
      if (input === null) return null;

      return Object.freeze({ kind, input, seal: sealText(expected), hash: expected });
    };

    const seal = (kind, input = '') => {
      const body = bodyBytes(kind, input);
      return body ? sealText(fnv1a(body)) : null;
    };

    const art = (kind, input = '') => {
      const body = bodyBytes(kind, input);
      if (!body) return null;
      const hash = fnv1a(body);
      return randomart([
        (hash >>> 24) & 0xff, (hash >>> 16) & 0xff, (hash >>> 8) & 0xff, hash & 0xff
      ]);
    };

    return deepFreeze({
      kinds: Object.freeze(Object.keys(KIND)),
      encode,
      decode,
      seal,
      art,
      // Test ve ileriki dilimler icin.
      _fnv1a: fnv1a,
      _sealText: sealText,
      _randomart: randomart
    });
  };
})();
