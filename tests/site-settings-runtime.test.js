const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

(async () => {
  const script = fs.readFileSync('./js/site-settings.js', 'utf8');
  const documentStub = {
    head: {
      appendChild() {},
      querySelector() { return null; }
    },
    documentElement: {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    body: null
  };

  const context = {
    window: {
      QCVApp: { firebaseConfig: { databaseURL: 'https://example.com' } }
    },
    document: documentStub,
    fetch: async () => ({
      ok: true,
      json: async () => ({})
    }),
    console
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(true, 'site-settings.js should not crash when document.body is unavailable');
})();
