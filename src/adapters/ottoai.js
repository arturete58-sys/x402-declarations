const { empty } = require('../schema');
const matches = (url) => /ottoai\.services/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'ottoai@1.0';
  d._raw = body;
  const m = (body && (body.meta || (body.data && body.data.meta))) || null;
  if (!m) return d;

  if (m.stalenessSec !== undefined) d.freshness.ageSeconds = Number(m.stalenessSec);
  if (m.degraded !== undefined) d.freshness.isStale = Boolean(m.degraded);
  d.freshness.basis = m.dataAsOf ? 'declared' : null;

  if (m.sourceHealth && typeof m.sourceHealth === 'object') {
    const vals = Object.values(m.sourceHealth);
    const ok = vals.filter(v => v === 'ok').length;
    d.quality.confidence = vals.length ? ok / vals.length : null;
    d.quality.sampleSize = vals.length;
    d.provenance.source = Object.keys(m.sourceHealth).join(', ');
  }
  d.provenance.verifiable = false;
  return d;
}
module.exports = { matches, parse };
