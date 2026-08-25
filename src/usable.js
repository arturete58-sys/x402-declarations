/**
 * Codigos de motivo. Una capa de liquidacion ramifica sobre estos,
 * no sobre el texto. `attributable` indica si el proveedor incumplio
 * algo que declaro, o si el rechazo responde a la politica del llamante.
 */
const REASONS = {
  DECLARED_UNUSABLE:    { attributable: 'provider', text: 'provider declares this response should not be relied on' },
  EXCEEDS_DECLARED_MAX: { attributable: 'provider', text: 'age exceeds the maximum the provider declared' },
  NOT_ESTABLISHED:      { attributable: 'provider', text: 'provider states the metric is not statistically established' },
  EXCEEDS_CALLER_LIMIT: { attributable: 'caller',   text: 'age exceeds the limit set by the caller' },
};

function isUsable(d, opts = {}) {
  const maxAge = opts.maxAgeSeconds ?? null;
  const requireEstablished = opts.requireEstablished ?? false;
  const reasons = [];

  const add = (code, detail) => reasons.push({
    code, attributable: REASONS[code].attributable,
    message: REASONS[code].text, detail: detail ?? null,
  });

  if (d.freshness.isStale === true) add('DECLARED_UNUSABLE');

  if (d.freshness.declaredMaxSeconds !== null && d.freshness.ageSeconds !== null
      && d.freshness.ageSeconds > d.freshness.declaredMaxSeconds) {
    add('EXCEEDS_DECLARED_MAX',
        { ageSeconds: d.freshness.ageSeconds, declaredMaxSeconds: d.freshness.declaredMaxSeconds });
  }

  if (requireEstablished && d.quality.established === false) add('NOT_ESTABLISHED');

  if (maxAge !== null && d.freshness.ageSeconds !== null && d.freshness.ageSeconds > maxAge) {
    add('EXCEEDS_CALLER_LIMIT', { ageSeconds: d.freshness.ageSeconds, callerLimitSeconds: maxAge });
  }

  const attributable = reasons.filter(r => r.attributable === 'provider');

  return {
    usable: reasons.length === 0,
    reasons,
    /** Verdadero solo si el proveedor incumplio algo que el mismo declaro.
     *  Es la señal que una capa de liquidacion puede usar para abonar o pausar. */
    providerAtFault: attributable.length > 0,
    codes: reasons.map(r => r.code),
  };
}

module.exports = { isUsable, REASONS };
