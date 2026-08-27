const { empty } = require('./schema');
const adapters = [
  require('./adapters/truthbear'),
  require('./adapters/kronos'),
  require('./adapters/ottoai'),
  require('./adapters/apitoll'),
  require('./adapters/hugen'),
  require('./adapters/lumi'),
  require('./adapters/netintel'),
  require('./adapters/liveprobe'),
];
const h = require('./heuristic');

/**
 * Sin adaptador exacto, intenta deteccion por patron.
 * Lo detectado va marcado como heuristic y NUNCA se presenta
 * como declaracion literal del proveedor.
 */
function porHeuristica(url, body) {
  const d = empty();
  d._raw = body;
  const f = h.detectarFrescura(body);
  const e = h.detectarEstado(body);
  const c = h.detectarConfianza(body);

  if (!f && !e && !c) { d._adapter = 'none'; return d; }

  d._adapter = 'heuristic';
  d._detected = {};
  if (f) { d.freshness.ageSeconds = f.ageSeconds; d._detected.ageSeconds = f; }
  if (e) { d.freshness.isStale = e.isStale;       d._detected.isStale = e; }
  if (c) { d.quality.confidence = c.confidence;   d._detected.confidence = c; }
  return d;
}

function normalize(url, body) {
  const a = adapters.find(x => x.matches(url));
  if (a) return a.parse(body);
  return porHeuristica(url, body);
}
function supported() { return adapters.map(a => a.parse({})._adapter); }
module.exports = { normalize, supported, adapters };
