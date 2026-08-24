const { empty } = require('../schema');
const matches = (url) => /netintel\.dev/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'netintel@1.0';
  d._raw = body;
  if (!body) return d;

  // grade A-F derivado de service_score: A/B implica soporte, D/F no
  if (body.grade) {
    d.quality.note = 'grade: ' + body.grade;
    d.quality.established = ['A','B','C'].includes(String(body.grade).toUpperCase());
  }
  if (body.service_score !== undefined) d.quality.confidence = Number(body.service_score);
  else if (body.score !== undefined) d.quality.confidence = Math.abs(Number(body.score));

  if (Array.isArray(body.findings) && body.findings.length) {
    d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') +
      body.findings.length + ' findings reported';
  }
  if (body.polarity) {
    d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') + 'polarity: ' + body.polarity;
  }

  if (body.generated_at || body.asOf) {
    const t = new Date(body.generated_at || body.asOf).getTime();
    if (isFinite(t)) d.freshness.ageSeconds = Math.round((Date.now() - t) / 1000);
  }
  d.provenance.source = body.model || body.source || null;
  d.provenance.verifiable = false;
  return d;
}
module.exports = { matches, parse };
