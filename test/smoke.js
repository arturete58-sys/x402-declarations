const t = require('../src');
let fallos = 0;
const check = (nombre, cond) => {
  console.log((cond ? 'ok   ' : 'FALLO') + '  ' + nombre);
  if (!cond) fallos++;
};

check('exporta las funciones', ['normalize','buildRequest','isUsable','call']
  .every(k => typeof t[k] === 'function'));
check('ocho adaptadores', t.supported().length === 8);

const k = t.normalize('https://kronossignals.com/x',
  { cache_age_seconds: 120, cached: true, up_prob_calibrated: 0.42,
    directional_edge: { established: false, n: 1000 },
    disclaimer: 'regenerated every ~20 min' });
check('kronos: edad en segundos', k.freshness.ageSeconds === 120);
check('kronos: umbral desde prosa', k.freshness.declaredMaxSeconds === 1200);
check('kronos: established=false', k.quality.established === false);

const h = t.normalize('https://tick.hugen.tokyo/x',
  { quality_state: 'stale', fresh_sources: 0, stale_sources: 6, quote_age_ms: 1140535 });
check('hugen: ms convertidos a s', h.freshness.ageSeconds === 1141);
check('hugen: detecta stale', h.freshness.isStale === true);
check('hugen: no usable', t.isUsable(h, { maxAgeSeconds: 60 }).usable === false && t.isUsable(h, { maxAgeSeconds: 60 }).providerAtFault === true);

const desconocido = t.normalize('https://nadie.example/x', { a: 1 });
check('url desconocida no rompe', desconocido._adapter === 'none' && desconocido._raw.a === 1);

const req = t.buildRequest({ properties: { input: { properties: {
  method: { const: 'POST' },
  body: { required: ['w'], properties: { w: { enum: ['24h','7d'] } } } } } } });
check('buildRequest usa enum', req.ready === true && req.body.w === '24h');

const ex1 = t.extractResult('', { tool_name:'x', result:{ schema:'s', items:[1,2,3], count:3 } }, { expect:'array' });
check('extractResult desenvuelve result.items', JSON.stringify(ex1.value) === '[1,2,3]');
const ex2 = t.extractResult('', { a:1 }, { expect:'array' });
check('extractResult devuelve el cuerpo si no hay envoltorio', ex2.wrapped === false);

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo correcto');
process.exit(fallos ? 1 : 0);
