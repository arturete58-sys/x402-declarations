function adaptNetIntel(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'object') return null;

  const example = rawOutput.example || rawOutput;
  let confidence = null;

  if (typeof example.score === 'number') {
    confidence = Number(((example.score + 1) / 2).toFixed(4));
  } else if (typeof example.grade === 'string') {
    const gradeMap = { A: 1.0, B: 0.8, C: 0.6, D: 0.4, F: 0.0 };
    confidence = gradeMap[example.grade.toUpperCase()] ?? null;
  }

  return {
    provider: 'NetIntel',
    stalenessSec: null,
    confidence: confidence,
    recordHash: null,
    provenance: 'first-party-sentiment-engine',
    rawFields: Object.keys(example)
  };
}

module.exports = { adaptNetIntel };
