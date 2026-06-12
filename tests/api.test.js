/* Schnelltest des Bestenlisten-Endpunkts: node tests/api.test.js
   Nutzt den In-Memory-Adapter (FRUTTI_MEMORY_DB=1), keine echte DB nötig. */

process.env.FRUTTI_MEMORY_DB = '1';
delete process.env.POSTGRES_URL;
delete process.env.POSTGRES_PRISMA_URL;
delete process.env.DATABASE_URL;

const assert = require('assert');
const handler = require('../api/highscores.js');

function mockRes() {
  return {
    code: 200,
    body: null,
    headers: {},
    status(c) { this.code = c; return this; },
    json(o) { this.body = o; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

async function call(method, body) {
  const res = mockRes();
  await handler({ method, body }, res);
  return res;
}

(async () => {
  // 1) Leere Liste am Anfang
  {
    const res = await call('GET');
    assert.strictEqual(res.code, 200);
    assert.strictEqual(res.body.online, true);
    assert.deepStrictEqual(res.body.scores, []);
  }

  // 2) Punktestand eintragen
  {
    const res = await call('POST', { name: 'Patrick', score: 140 });
    assert.strictEqual(res.code, 200);
    assert.strictEqual(res.body.ok, true);
  }

  // 3) Niedrigerer Wert überschreibt den besten nicht
  {
    await call('POST', { name: 'Patrick', score: 50 });
    const res = await call('GET');
    assert.deepStrictEqual(res.body.scores, [{ name: 'Patrick', score: 140 }]);
  }

  // 4) Höherer Wert schon; Sortierung absteigend
  {
    await call('POST', { name: 'Heidi', score: 300 });
    await call('POST', { name: 'Patrick', score: 200 });
    const res = await call('GET');
    assert.deepStrictEqual(res.body.scores, [
      { name: 'Heidi', score: 300 },
      { name: 'Patrick', score: 200 },
    ]);
  }

  // 5) Ungültige Eingaben werden abgelehnt
  for (const bad of [
    { name: '', score: 100 },
    { name: 'X', score: 0 },
    { name: 'X', score: -5 },
    { name: 'X', score: 'abc' },
    { name: 'X', score: 99999999 },
  ]) {
    const res = await call('POST', bad);
    assert.strictEqual(res.code, 400, `sollte abgelehnt werden: ${JSON.stringify(bad)}`);
  }

  // 6) Name wird gekürzt (max. 16 Zeichen) und JSON-String-Body akzeptiert
  {
    await call('POST', JSON.stringify({ name: 'EinSehrSehrLangerName', score: 10 }));
    const res = await call('GET');
    assert.ok(res.body.scores.some(s => s.name === 'EinSehrSehrLange'));
  }

  // 7) Unbekannte Methode
  {
    const res = await call('DELETE');
    assert.strictEqual(res.code, 405);
  }

  console.log('✅ Alle API-Tests bestanden.');
})().catch(e => { console.error(e); process.exit(1); });
