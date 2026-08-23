/**
 * Construye una peticion valida a partir del esquema de entrada declarado
 * en el catalogo x402. No adivina: usa required, default, enum y example.
 */
function buildRequest(schema, provided = {}) {
  const out = { method: 'GET', body: null, queryParams: null, missing: [], filled: {} };
  const input = schema?.properties?.input;
  if (!input) { out.missing.push('_schema: no input section'); return out; }

  const props = input.properties || {};
  out.method = props.method?.const
            || (Array.isArray(props.method?.enum) ? props.method.enum[0] : null)
            || 'GET';

  for (const surface of ['body', 'queryParams']) {
    const spec = props[surface];
    if (!spec || !spec.properties) continue;
    const req = Array.isArray(spec.required) ? spec.required : [];
    const obj = {};

    for (const [name, def] of Object.entries(spec.properties)) {
      let value;
      if (provided[name] !== undefined)          value = provided[name];
      else if (def.const !== undefined)          value = def.const;
      else if (def.default !== undefined)        value = def.default;
      else if (Array.isArray(def.examples) && def.examples.length) value = def.examples[0];
      else if (Array.isArray(def.enum) && def.enum.length && req.includes(name)) value = def.enum[0];

      if (value !== undefined) {
        obj[name] = value;
        out.filled[name] = provided[name] !== undefined ? 'caller' : 'schema';
      } else if (req.includes(name)) {
        out.missing.push(`${surface}.${name}` +
          (def.description ? ` (${def.description.slice(0, 80)})` : ''));
      }
    }
    if (Object.keys(obj).length) out[surface] = obj;
  }
  out.ready = out.missing.length === 0;
  return out;
}

/** Aplica la peticion construida a una URL base. */
function applyRequest(url, req) {
  let u = url;
  if (req.queryParams) {
    const qs = new URLSearchParams(req.queryParams).toString();
    u += (u.includes('?') ? '&' : '?') + qs;
  }
  return { url: u, method: req.method, body: req.body };
}

module.exports = { buildRequest, applyRequest };
