#!/usr/bin/env node
/**
 * Conformance runner for x402 delivery declarations.
 *
 * To test your own implementation, replace the two adapter functions below.
 * Everything else is fixed: the cases decide what passes, not the runner.
 */
const fs = require('fs');
const path = require('path');

// ---- adapter: replace these two for your implementation ---------------
const lib = require('../src');

function normalise(url, body) {
  return lib.normalize(url, body);
}

function evaluate(decl, options) {
  return lib.isUsable(decl, options || {});
}
// -----------------------------------------------------------------------

function pick(decl, evaluation, key) {
  if (key === 'usable') return evaluation.usable;
  if (key === 'providerAtFault') return evaluation.providerAtFault;
  if (key === 'basis') return evaluation.basis !== undefined ? evaluation.basis
                            : (decl._adapter === 'heuristic' ? 'heuristic'
                            : decl._adapter === 'none' ? 'none' : 'declared');
  return key.split('.').reduce((o, k) => (o === undefined || o === null ? o : o[k]), decl);
}

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).cases;
let pasan = 0, fallan = 0;

for (const c of cases) {
  const decl = normalise(c.url, c.body);
  const evaluation = evaluate(decl, c.options);
  const errores = [];

  for (const [k, esperado] of Object.entries(c.expect)) {
    const obtenido = pick(decl, evaluation, k);
    const ok = (esperado === null) ? (obtenido === null || obtenido === undefined)
                                   : obtenido === esperado;
    if (!ok) errores.push(`${k}: expected ${JSON.stringify(esperado)}, got ${JSON.stringify(obtenido)}`);
  }

  if (errores.length) {
    fallan++;
    console.log(`FAIL  ${c.id}`);
    for (const e of errores) console.log(`        ${e}`);
    console.log(`        why: ${c.why}`);
  } else {
    pasan++;
    console.log(`pass  ${c.id}`);
  }
}

console.log(`\n${pasan} passed, ${fallan} failed, ${cases.length} total`);
process.exit(fallan ? 1 : 0);
