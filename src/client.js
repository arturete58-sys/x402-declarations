const { buildRequest, applyRequest } = require('./request');
const { normalize } = require('./adapters-index');
const { isUsable } = require('./usable');

/**
 * Envuelve una llamada x402: construye la peticion desde el esquema declarado,
 * la ejecuta con el pagador que le pases, y normaliza la declaracion de calidad
 * de la respuesta. No implementa pagos: recibe una funcion de pago.
 *
 * @param {object} o
 * @param {string} o.url          endpoint
 * @param {object} o.schema       esquema declarado en el catalogo
 * @param {object} o.params       datos que aporta el llamante
 * @param {function} o.pay        async ({url, method, body}) => { status, body }
 * @param {object} o.require      criterios de usabilidad (maxAgeSeconds, requireEstablished)
 */
async function call({ url, schema, params = {}, pay, require: req = {} }) {
  const built = buildRequest(schema, params);
  if (!built.ready) {
    return { ok: false, stage: 'request', missing: built.missing,
             hint: 'caller must supply: ' + built.missing.join(', ') };
  }

  const applied = applyRequest(url, built);
  const res = await pay(applied);

  if (!res || res.status !== 200) {
    return { ok: false, stage: 'payment', status: res && res.status,
             error: res && res.error };
  }

  const decl = normalize(url, res.body);
  
  const check = isUsable(decl, req);

  return {
    ok: check.usable,
    stage: check.usable ? 'delivered' : 'declaration',
    data: res.body,
    declaration: decl,
    reasons: check.reasons,
    request: applied,
  };
}

module.exports = { call };
