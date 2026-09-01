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
  const p = h.detectarProcedencia(body);
  const hs = h.detectarHash(body);

  if (!f && !e && !c && !p && !hs) { d._adapter = 'none'; return d; }

  d._adapter = 'heuristic';
  d._detected = {};
  if (f) { d.freshness.ageSeconds = f.ageSeconds; d._detected.ageSeconds = f; }
  if (e) { d.freshness.isStale = e.isStale;       d._detected.isStale = e; }
  if (c)  { d.quality.confidence = c.confidence;   d._detected.confidence = c; }
  if (p)  { d.provenance.source = p.source;        d._detected.source = p; }
  // Un hash detectado no implica que exista forma de verificarlo.
  // verifiable solo lo pone un adaptador exacto que conozca el endpoint de verificacion.
  if (hs) { d.provenance.hash = hs.hash; d._detected.hash = hs; }
  return d;
}

function normalize(url, body) {
  const a = adapters.find(x => x.matches(url));
  if (a) return a.parse(body);
  return porHeuristica(url, body);
}
function supported() { return adapters.map(a => a.parse({})._adapter); }
module.exports = { normalize, supported, adapters };
