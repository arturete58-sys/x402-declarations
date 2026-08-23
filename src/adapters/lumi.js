const { empty } = require('../schema');
const matches = (url) => /app\.tenna\.ai\/api\/x402\/(lumi|tenna)/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'lumi@1.0';
  d._raw = body;
  if (!body) return d;

  if (body.windowHours !== undefined) {
    d.freshness.declaredMaxSeconds = Number(body.windowHours) * 3600;
    d.freshness.basis = 'window';
  }

  // outcomeState es la declaracion clave: INTERIM_ONLY significa que las
  // metricas definitivas NO estan disponibles y no deben tratarse como tales.
  if (body.outcomeState) {
    d.quality.established = (body.outcomeState !== 'INTERIM_ONLY');
    d.quality.note = 'outcomeState: ' + body.outcomeState;
    if (body.interim && body.interim.note_en) {
      d.quality.note += '; ' + body.interim.note_en;
    }
  }
  if (body.launches !== undefined) d.quality.sampleSize = Number(body.launches);
  if (body.unlabelledLaunchpads) {
    d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') +
      body.unlabelledLaunchpads + ' unlabelled items excluded from classification';
  }

  // Ofertas de auditoria: grado reproducible con rubrica versionada
  if (body.grade) {
    d.quality.note = (d.quality.note ? d.quality.note + '; ' : '') + 'grade: ' + body.grade;
    d.quality.established = body.gradeReproducible === true;
  }
  if (body.rubricVersion) d.provenance.source = 'rubric ' + body.rubricVersion;
  else if (body.schemaVersion) d.provenance.source = body.schemaVersion;

  if (body.resultHash) {
    d.provenance.hash = body.resultHash;
    d.provenance.verifiable = true;
  } else {
    d.provenance.verifiable = false;
  }
  return d;
}
module.exports = { matches, parse };
