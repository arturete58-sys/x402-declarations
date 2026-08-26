const { empty } = require('../schema');
const matches = (url) => /kronossignals/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'kronos@1.0';
  d._raw = body;
  if (!body) return d;

  if (body.cache_age_seconds !== undefined) d.freshness.ageSeconds = Number(body.cache_age_seconds);
  else if (body.as_of_age_seconds !== undefined) d.freshness.ageSeconds = Number(body.as_of_age_seconds);
  if (body.stale !== undefined) d.freshness.isStale = Boolean(body.stale);
  d.freshness.basis = body.cached ? 'cache' : 'live';
  // "regenerated every ~20 min" en el disclaimer
  if (typeof body.disclaimer === 'string') {
    const m = body.disclaimer.match(/every\s*~?(\d+)\s*min/i);
    if (m) d.freshness.declaredMaxSeconds = Number(m[1]) * 60;
  }

  // Prefiere la probabilidad calibrada sobre la cruda: es la autoritativa
  if (body.up_prob_calibrated !== undefined) d.quality.confidence = Number(body.up_prob_calibrated);
  else if (body.forecast && body.forecast.confidence !== undefined) d.quality.confidence = Number(body.forecast.confidence);

  const edge = body.directional_edge;
  if (edge) {
    d.quality.established = Boolean(edge.established);
    d.quality.sampleSize = edge.n !== undefined ? Number(edge.n) : null;
  }
  if (body.direction_note) d.quality.note = body.direction_note;
  if (body.calibration && body.calibration.n_total) d.quality.sampleSize = Number(body.calibration.n_total);

  // Endpoint de precio: declara fuentes con ponderacion y confianza cualitativa
  if (Array.isArray(body.sources) && body.sources.length) {
    const incluidas = body.sources.filter(x => x.included !== false);
    d.provenance.source = incluidas.map(x => x.exchange).join(', ');
    d.quality.sampleSize = incluidas.length;
    if (d.quality.confidence === null && body.confidence) {
      const mapa = { high: 0.9, medium: 0.6, low: 0.3 };
      d.quality.confidence = mapa[String(body.confidence).toLowerCase()] ?? null;
      d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') +
        'confidence: ' + body.confidence;
    }
    if (body.cross_exchange_spread_pct !== undefined) {
      d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') +
        'cross-exchange spread ' + body.cross_exchange_spread_pct + '%';
    }
    if (body.sources.some(x => x.included === false)) {
      const fuera = body.sources.filter(x => x.included === false).length;
      d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') +
        fuera + ' source(s) excluded by the provider';
    }
  }

  d.provenance.source = d.provenance.source || body.model || body.source || null;
  d.provenance.verifiable = false;
  d.provenance.servedFrom = body.source || null;
  return d;
}
module.exports = { matches, parse };
