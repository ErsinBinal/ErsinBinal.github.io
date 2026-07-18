import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(
  new URL('../../assets/js/service-worker-register.js', import.meta.url),
  'utf8'
);

function createFixture({ controlled }) {
  let controllerChange;
  let reloads = 0;
  const serviceWorker = {
    controller: controlled ? {} : null,
    addEventListener(type, callback) {
      if (type === 'controllerchange') controllerChange = callback;
    },
    register: async () => ({
      waiting: null,
      addEventListener() {}
    })
  };
  const context = vm.createContext({
    navigator: { serviceWorker },
    document: { getElementById: () => null },
    console,
    window: {
      location: { reload: () => { reloads += 1; } },
      addEventListener() {}
    }
  });
  vm.runInContext(source, context, { filename: 'service-worker-register.js' });
  return {
    controllerChange: () => controllerChange(),
    reloads: () => reloads
  };
}

test('first Service Worker claim does not reload an open first-visit terminal', () => {
  const fixture = createFixture({ controlled: false });
  fixture.controllerChange();
  assert.equal(fixture.reloads(), 0);
});

test('an accepted update reloads once when the page already had a controller', () => {
  const fixture = createFixture({ controlled: true });
  fixture.controllerChange();
  fixture.controllerChange();
  assert.equal(fixture.reloads(), 1);
});
