const { empty } = require('../schema');

const matches = (url) => /aeml-x402|truthbear/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'truthbear@1.0';
  d._raw = body;
  const p = body && body.provenance;
  if (!p) return d;

  // Declara en horas; normalizamos a segundos
  if (p.age_hours_now !== undefined) d.freshness.ageSeconds = Math.round(Number(p.age_hours_now) * 3600 * 100) / 100;
  else if (p.data_age_hours !== undefined) d.freshness.ageSeconds = Math.round(Number(p.data_age_hours) * 3600);

  // "fresh<=24h; recent<=192h" -> extraemos el primer umbral
  if (typeof p.freshness_basis === 'string') {
    const m = p.freshness_basis.match(/fresh<=(\d+)h/);
    if (m) d.freshness.declaredMaxSeconds = Number(m[1]) * 3600;
  }
  if (p.freshness) d.freshness.isStale = (p.freshness !== 'fresh');
  d.freshness.basis = p.served_from && /snapshot/i.test(p.served_from) ? 'snapshot' : 'live';

  const leg = Array.isArray(p.data_lineage) ? p.data_lineage[0] : null;
  if (leg) {
    d.provenance.source = leg.traceable_to || null;
    d.provenance.hash = leg.record_hash || null;
    d.provenance.verifiable = Boolean(leg.record_hash);
    if (leg.uncertainty && leg.uncertainty !== 'not-provided-in-this-projection') {
      d.quality.note = leg.uncertainty;
    }
  }
  d.provenance.servedFrom = p.served_from || null;
  return d;
}

module.exports = { matches, parse };
