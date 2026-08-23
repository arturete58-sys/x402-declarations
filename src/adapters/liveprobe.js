function adaptLiveProbe(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'object') return null;

  const example = rawOutput.example || rawOutput;
  let confidence = null;

  if (example.confidence) {
    const parsed = parseFloat(example.confidence);
    confidence = !isNaN(parsed) ? (parsed > 1 ? parsed / 100 : parsed) : null;
  }

  return {
    provider: 'x402 Live Probe',
    stalenessSec: null,
    confidence: confidence,
    recordHash: null,
    provenance: example.schema || 'memory-bounded-json',
    rawFields: Object.keys(example)
  };
}

module.exports = { adaptLiveProbe };
