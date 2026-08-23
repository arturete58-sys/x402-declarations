function isUsable(d, opts = {}) {
  const maxAge = opts.maxAgeSeconds ?? null;
  const requireEstablished = opts.requireEstablished ?? false;
  const reasons = [];

  if (d.freshness.isStale === true) reasons.push('provider declares data as stale');
  if (maxAge !== null && d.freshness.ageSeconds !== null && d.freshness.ageSeconds > maxAge)
    reasons.push(`age ${d.freshness.ageSeconds}s exceeds caller limit ${maxAge}s`);
  if (d.freshness.declaredMaxSeconds !== null && d.freshness.ageSeconds !== null
      && d.freshness.ageSeconds > d.freshness.declaredMaxSeconds)
    reasons.push('age exceeds provider own declared maximum');
  if (requireEstablished && d.quality.established === false)
    reasons.push('provider states the metric is not statistically established');

  return { usable: reasons.length === 0, reasons };
}
module.exports = { isUsable };
