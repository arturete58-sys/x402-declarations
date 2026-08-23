const { empty } = require('../schema');
const matches = (url) => /hugen\.tokyo/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'hugen@1.0';
  d._raw = body;
  if (!body) return d;

  // Declara en milisegundos, no en segundos
  if (body.quote_age_ms !== undefined) d.freshness.ageSeconds = Math.round(Number(body.quote_age_ms) / 1000);
  if (body.quality_state) d.freshness.isStale = (body.quality_state !== 'ok');
  d.freshness.basis = 'multi-source';

  const fresh = Number(body.fresh_sources ?? 0);
  const stale = Number(body.stale_sources ?? 0);
  const total = fresh + stale;
  if (total > 0) {
    d.quality.confidence = fresh / total;
    d.quality.sampleSize = total;
    d.quality.established = fresh > 0;
  }

  const notas = [];
  if (body.quality_state) notas.push('quality_state: ' + body.quality_state);
  if (body.is_crossed === true) notas.push('CROSSED BOOK: bid above ask, quotes are inconsistent');
  if (total > 0) notas.push(`${fresh}/${total} sources fresh`);
  if (notas.length) d.quality.note = notas.join('; ');

  d.provenance.source = 'multi-source aggregate';
  d.provenance.verifiable = false;
  return d;
}
module.exports = { matches, parse };
