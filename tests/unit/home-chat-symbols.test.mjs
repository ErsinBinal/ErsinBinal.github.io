import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
  new URL('../../assets/js/home/chat-symbols.js', import.meta.url),
  'utf8'
);

function loadShelf() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context, { filename: 'chat-symbols.js' });
  return context.window.ConviviumHome.chatSymbols;
}

test('SMS donemi sembol rafi 24 salt-okunur ASCII ifade sunar', () => {
  const shelf = loadShelf();
  const items = Array.from(shelf.categories, (category) => Array.from(category.items)).flat();

  assert.equal(shelf.categories.length, 3);
  assert.equal(items.length, 24);
  assert.equal(items.some((item) => item.symbol === ':)'), true);
  assert.equal(items.some((item) => item.symbol === ':('), true);
  assert.equal(items.every((item) => /^[\x20-\x7E]+$/.test(item.symbol)), true);
  assert.equal(Object.isFrozen(shelf), true);
  assert.equal(shelf.categories.every((category) => Object.isFrozen(category) && Object.isFrozen(category.items)), true);
});

test('sembol secimi gondermeden imlec konumuna eklenir', () => {
  const shelf = loadShelf();

  assert.deepEqual(
    { ...shelf.insertAtCursor('merhaba ', ':)', 8, 8, 1000) },
    { value: 'merhaba :)', caret: 10 }
  );
  assert.deepEqual(
    { ...shelf.insertAtCursor('abc', ':(', 1, 2, 1000) },
    { value: 'a:(c', caret: 3 }
  );
});

test('sembol ekleme mesaj uzunlugu sinirini asmaz', () => {
  const shelf = loadShelf();
  const result = shelf.insertAtCursor('1234', ':-)', 4, 4, 5);

  assert.deepEqual({ ...result }, { value: '1234:', caret: 5 });
});
