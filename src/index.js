const { empty, coverage } = require('./schema');
const adapters = [
  require('./adapters/truthbear'),
  require('./adapters/kronos'),
  require('./adapters/ottoai'),
  require('./adapters/apitoll'),
  require('./adapters/hugen'),
];

/** Normaliza la respuesta de un vendedor x402 al esquema comun. */
function normalize(url, body) {
  const a = adapters.find(x => x.matches(url));
  if (!a) { const d = empty(); d._adapter = 'none'; d._raw = body; return d; }
  return a.parse(body);
}

function supported() { return adapters.map(a => a.parse({})._adapter); }

module.exports = { normalize, coverage, supported, empty };

/**
 * Decide si un dato es utilizable segun lo que el propio vendedor declara.
 * No juzga la calidad: comprueba coherencia con la declaracion.
 */
function isUsable(d, opts = {}) {
  const maxAge = opts.maxAgeSeconds ?? null;
  const requireEstablished = opts.requireEstablished ?? false;
  const reasons = [];

  if (d.freshness.isStale === true) reasons.push('provider declares data as stale');
  if (maxAge !== null && d.freshness.ageSeconds !== null && d.freshness.ageSeconds > maxAge)
    reasons.push(`age ${d.freshness.ageSeconds}s exceeds caller limit ${maxAge}s`);
  if (d.freshness.declaredMaxSeconds !== null && d.freshness.ageSeconds !== null
      && d.freshness.ageSeconds > d.freshness.declaredMaxSeconds)
    reasons.push('age exceeds provider own declared maximum');
  if (requireEstablished && d.quality.established === false)
    reasons.push('provider states the metric is not statistically established');

  return { usable: reasons.length === 0, reasons };
}
module.exports.isUsable = isUsable;
