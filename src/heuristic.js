/**
 * Deteccion por patron, para proveedores sin adaptador.
 *
 * NUNCA sustituye a un adaptador exacto. Lo que sale de aqui va marcado
 * como 'heuristic' para que nadie lo confunda con lo que el proveedor
 * declaro literalmente.
 */

/** Recorre el objeto y devuelve [{ruta, clave, valor}] hasta cierta profundidad. */
function recorrer(obj, prof = 0, ruta = []) {
  if (!obj || typeof obj !== 'object' || prof > 3) return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object') out.push(...recorrer(v, prof + 1, [...ruta, k]));
    else out.push({ ruta: [...ruta, k], clave: k, valor: v });
  }
  return out;
}

/** Deduce el factor de conversion a segundos por el sufijo del nombre. */
function aSegundos(clave, valor) {
  const n = Number(valor);
  if (!isFinite(n) || n < 0) return null;
  const k = clave.toLowerCase();
  if (/_?ms$|millis|milliseconds/.test(k))       return { seg: Math.round(n / 1000 * 1000) / 1000, unidad: 'ms' };
  if (/_?h$|hour/.test(k))                        return { seg: Math.round(n * 3600), unidad: 'hours' };
  if (/_?min$|minute/.test(k))                    return { seg: Math.round(n * 60), unidad: 'minutes' };
  if (/_?s$|sec|seconds/.test(k))                 return { seg: Math.round(n), unidad: 'seconds' };
  return null;   // sin sufijo reconocible: no adivinamos la unidad
}

/** Edad del dato, por nombre de campo y unidad deducible. */
function detectarFrescura(body) {
  const campos = recorrer(body);
  const patron = /age|stale|cache|fresh|elapsed/i;
  for (const c of campos) {
    if (!patron.test(c.clave)) continue;
    const conv = aSegundos(c.clave, c.valor);
    if (conv && conv.seg < 60 * 60 * 24 * 400) {   // descarta lo que parece una fecha epoch
      return { ageSeconds: conv.seg, field: c.ruta.join('.'), unit: conv.unidad };
    }
  }
  return null;
}

/** Estado de degradacion declarado como booleano o cadena. */
function detectarEstado(body) {
  const campos = recorrer(body);
  const SANOS = ['ok','good','healthy','fresh','live','valid','success'];
  for (const c of campos) {
    const k = c.clave.toLowerCase();
    if (/^(stale|degraded|is_stale|outdated)$/.test(k) && typeof c.valor === 'boolean') {
      return { isStale: c.valor, field: c.ruta.join('.') };
    }
    if (/quality_state|status|state|health|freshness|condition/.test(k) && typeof c.valor === 'string') {
      return { isStale: !SANOS.includes(c.valor.toLowerCase()), field: c.ruta.join('.') };
    }
  }
  return null;
}

/** Confianza declarada, normalizada a [0,1]. */
function detectarConfianza(body) {
  const campos = recorrer(body);
  const MAPA = { high: 0.9, medium: 0.6, low: 0.3 };
  for (const c of campos) {
    if (!/confidence|probability|certainty|score/i.test(c.clave)) continue;
    if (typeof c.valor === 'number') {
      const v = c.valor > 1 && c.valor <= 100 ? c.valor / 100 : c.valor;
      if (v >= 0 && v <= 1) return { confidence: v, field: c.ruta.join('.') };
    }
    if (typeof c.valor === 'string' && MAPA[c.valor.toLowerCase()] !== undefined) {
      return { confidence: MAPA[c.valor.toLowerCase()], field: c.ruta.join('.') };
    }
  }
  return null;
}

module.exports = { detectarFrescura, detectarEstado, detectarConfianza, recorrer };
