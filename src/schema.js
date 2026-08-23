/**
 * Esquema normalizado de declaracion de entrega.
 * Todo campo puede ser null: la ausencia de declaracion es informacion.
 */
function empty() {
  return {
    freshness:  { ageSeconds: null, declaredMaxSeconds: null, isStale: null, basis: null },
    quality:    { confidence: null, established: null, sampleSize: null, note: null },
    provenance: { source: null, hash: null, verifiable: null, servedFrom: null },
    _raw: null,
    _adapter: null,
  };
}

/** Cuantas de las tres propiedades declara realmente. */
function coverage(d) {
  return {
    freshness:  d.freshness.ageSeconds !== null || d.freshness.isStale !== null,
    quality:    d.quality.confidence !== null || d.quality.established !== null,
    provenance: d.provenance.source !== null || d.provenance.hash !== null,
  };
}

module.exports = { empty, coverage };
