const { empty } = require('../schema');
const matches = (url) => /api\.delx\.ai/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'liveprobe@1.0';
  d._raw = body;
  if (!body) return d;

  // Acepta el objeto directo o envuelto en "example" (formato de catalogo)
  const b = body.example || body;

  if (b.confidence !== undefined) {
    const n = parseFloat(b.confidence);
    if (isFinite(n)) d.quality.confidence = n > 1 ? n / 100 : n;
  }
  if (b.deterministic !== undefined) {
    d.quality.established = Boolean(b.deterministic);
    d.quality.note = 'deterministic: ' + b.deterministic;
  }
  if (b.ok !== undefined && b.ok === false) {
    d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') + 'ok: false';
  }

  if (b.generated_at || b.timestamp) {
    const t = new Date(b.generated_at || b.timestamp).getTime();
    if (isFinite(t)) d.freshness.ageSeconds = Math.round((Date.now() - t) / 1000);
  }

  d.provenance.source = b.project || b.tool || b.route || null;
  d.provenance.verifiable = false;
  return d;
}
module.exports = { matches, parse };
