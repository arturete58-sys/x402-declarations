/**
 * Extrae el resultado util de una respuesta x402, descartando el envoltorio
 * que cada proveedor pone por su cuenta.
 *
 * Existe por la misma razon que los adaptadores de declaracion: no hay
 * convencion. Un proveedor devuelve el resultado en la raiz, otro bajo
 * `result`, otro bajo `data.items`, otro anidado dos niveles.
 */

/** Envoltorios conocidos, en orden de preferencia. */
const CAMINOS = [
  ['result', 'items'], ['result', 'result'], ['result', 'output'], ['result', 'value'],
  ['data', 'items'],   ['data', 'result'],   ['data', 'output'],
  ['output', 'items'],
  ['result', 'hex'], ['result', 'hash'], ['result', 'text'],
  ['hex'], ['hash'],
  ['items'], ['result'], ['output'], ['value'], ['data'],
];

/** Claves que casi siempre son metadatos, no resultado. */
const META = new Set(['schema', 'count', 'tool_name', 'meta', 'provenance',
                      'asOf', 'generatedAt', 'ok', 'status', 'version']);

function porCamino(body, camino) {
  let cur = body;
  for (const k of camino) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

/**
 * @param {string} url
 * @param {object} body
 * @param {object} [opts]
 * @param {'array'|'object'|'scalar'|'any'} [opts.expect] forma esperada del resultado
 * @returns {{ value: any, path: string[]|null, wrapped: boolean }}
 */
function extractResult(url, body, opts = {}) {
  const expect = opts.expect || 'any';
  if (body === null || body === undefined) return { value: null, path: null, wrapped: false };
  if (typeof body !== 'object') return { value: body, path: [], wrapped: false };

  const encaja = (v) => {
    if (v === undefined || v === null) return false;
    if (expect === 'array')  return Array.isArray(v);
    if (expect === 'object') return typeof v === 'object' && !Array.isArray(v);
    if (expect === 'scalar') return typeof v !== 'object';
    return true;
  };

  // 1. Caminos conocidos, con la forma esperada
  for (const c of CAMINOS) {
    const v = porCamino(body, c);
    if (encaja(v)) return { value: v, path: c, wrapped: c.length > 0 };
  }

  // 2. Si se espera un array, buscar el unico array que no sea metadato
  if (expect === 'array') {
    const arrays = [];
    const buscar = (o, ruta, prof) => {
      if (prof > 3 || !o || typeof o !== 'object') return;
      for (const [k, v] of Object.entries(o)) {
        if (META.has(k)) continue;
        if (Array.isArray(v)) arrays.push({ v, ruta: [...ruta, k] });
        else if (typeof v === 'object') buscar(v, [...ruta, k], prof + 1);
      }
    };
    buscar(body, [], 0);
    if (arrays.length === 1) return { value: arrays[0].v, path: arrays[0].ruta, wrapped: true };
  }

  // 3. Sin envoltorio reconocible: el cuerpo entero
  return { value: body, path: [], wrapped: false };
}

module.exports = { extractResult, CAMINOS };
