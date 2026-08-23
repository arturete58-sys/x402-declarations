const { empty } = require('../schema');
const matches = (url) => /apitoll\.cloud/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'apitoll@1.0';
  d._raw = body;
  if (!body) return d;

  // Declara marca de tiempo absoluta; derivamos la edad
  if (body.asOf) {
    const t = new Date(body.asOf).getTime();
    if (isFinite(t)) d.freshness.ageSeconds = Math.round((Date.now() - t) / 1000);
  }
  if (body.historical !== undefined) d.freshness.basis = body.historical ? 'historical' : 'live';

  const p = Array.isArray(body.prices) ? body.prices[0] : null;
  if (p && p.confidence !== undefined) d.quality.confidence = Number(p.confidence);
  if (p && p.resolved !== undefined) d.quality.established = Boolean(p.resolved);
  if (Array.isArray(body.unresolved) && body.unresolved.length) {
    d.quality.note = 'unresolved symbols: ' + body.unresolved.join(', ');
  }
  if (body.count !== undefined) d.quality.sampleSize = Number(body.count);

  if (body.source) {
    d.provenance.source = body.source.name || null;
    d.provenance.servedFrom = body.source.url || null;
  }
  d.provenance.verifiable = false;
  return d;
}
module.exports = { matches, parse };
