# x402-declarations

Call any x402 endpoint from its declared schema, and read what the provider says about the data it returns.

```
npm install x402-declarations
```

Two capabilities, one asymmetry:

- **`buildRequest`** works across the whole catalogue, because x402 standardised the input contract.
- **`normalize`** needs one adapter per provider, because x402 did not standardise anything about output quality.

That asymmetry is the point of this library, and the reason it should eventually stop existing.

---

## Part 1 — Calling: 6,664 endpoints nobody can invoke generically

Of 15,182 active resources in the x402 catalogue, **6,664 are POST** and each expects a different body.

The information needed to build that body is already published. 98.0% declare a body schema, 99.2% declare which fields are required, 87.7% constrain values with enums. It is structured, machine-readable, and sitting in the discovery catalogue.

Nobody uses it. Integrating an endpoint means a human reading its schema and hand-writing a request.

`buildRequest` reads the contract instead:

```js
const { buildRequest, applyRequest } = require('x402-declarations');

const req = buildRequest(schema);
// { method: 'POST', body: { offering: 'lumi_launch_digest', window: '24h' },
//   ready: true, missing: [], filled: { window: 'schema' } }
```

Measured across all 6,664 POST resources in the catalogue:

| | Resources | Share |
|---|---:|---:|
| Buildable with no caller input | 2,348 | 35.2% |
| Buildable with one caller field | 3,350 | 50.3% |
| **Invocable with zero or one field** | **5,698** | **85.5%** |
| Unparseable schema | 0 | 0% |

When a field genuinely cannot be inferred, it says which and why:

```js
{
  ready: false,
  missing: ['body.text (The text to analyze for sentiment)']
}
```

That is not a failure. Nobody can guess which text you want analysed. What the caller could not know is that the field is named `text` and not `input`, `content` or `query`.

Values are resolved in order: caller-supplied → `const` → `default` → `examples` → first `enum` value if required. Never invented.

---

## Part 2 — Reading: five vocabularies for the same three ideas

Providers that care about data quality declare it. They just don't agree on how.

Across the full catalogue, **99.84% of resources declare the shape of the response** — which fields, of which type. **Only 11.1% of providers declare anything about its quality**: freshness, confidence, or provenance. Among those that do, all seven possible combinations of the three are represented. There is no convention.

| Concept | Kronos | Truth Bear | Otto AI | ApiToll | hugen | LUMI |
|---|---|---|---|---|---|---|
| Data age | `cache_age_seconds` | `data_age_hours` | `meta.stalenessSec` | `asOf` | `quote_age_ms` | `windowHours` |
| Is it stale | `stale` | `freshness` | `degraded` | — | `quality_state` | — |
| Confidence | `up_prob_calibrated` | `uncertainty` | `sourceHealth` | `confidence` | `fresh_sources` | `outcomeState` |
| Source | `model` | `traceable_to` | — | `source.name` | — | `rubricVersion` |
| Verifiable | — | `record_hash` | — | — | — | `resultHash` |

Six vocabularies. Four different units for age: seconds, hours, milliseconds, and an absolute timestamp.

```js
const { normalize, isUsable } = require('x402-declarations');

const decl  = normalize(url, responseBody);
const check = isUsable(decl, { maxAgeSeconds: 60 });

if (!check.usable) console.warn('skipping:', check.reasons);
```

---

## Two cases this catches

**A stale FX feed, charged anyway.** `tick.hugen.tokyo/tick/latest` returned HTTP 200 after a successful payment, in a valid schema:

```json
{ "quality_state": "stale", "fresh_sources": 0, "stale_sources": 6,
  "quote_age_ms": 1140535, "is_crossed": true,
  "best_bid": "1.16766", "best_ask": "1.16764" }
```

Zero of six sources fresh, data 19 minutes old on a real-time feed, and a crossed book — bid above ask, arithmetically impossible in a live market. The provider declared all of it. Nothing in the payment, the status code or the response shape indicated a problem.

```js
{ usable: false,
  reasons: ['provider declares data as stale',
            'age 1140s exceeds caller limit 60s'] }
```

**Interim results presented as final.** LUMI nulls out its headline metrics while a measurement window is still open, and puts provisional figures in a separate object with different field names so they cannot be mistaken for final ones:

```json
{ "outcomeState": "INTERIM_ONLY", "medianTerminalMultiple": null,
  "interim": { "medianTerminalMultipleSoFar": 2.412 } }
```

```js
isUsable(decl, { requireEstablished: true })
// { usable: false,
//   reasons: ['provider states the metric is not statistically established'] }
```

Both providers were honest. Their declarations were simply unreadable by anything that didn't already know the format.

---

## `established` is the field that matters

Kronos ships this in its response body:

> "Directional edge not statistically established for this asset (hit-rate not proven > 50%). Treat direction as low-confidence."

An honest, careful warning. Also English prose. No agent reads it.

The adapter turns it into `quality.established: false` — a boolean an agent can branch on. That transformation, from a caveat a human would read to a field a machine can evaluate, is what the library is for.

---

## The schema

```js
{
  freshness: {
    ageSeconds:         408,      // always seconds, whatever the provider uses
    declaredMaxSeconds: 1200,     // extracted from the provider's own statement
    isStale:            false,
    basis:              'cache'   // live | cache | snapshot | multi-source | window
  },
  quality: {
    confidence:  0.4269,
    established: false,
    sampleSize:  5000,
    note:        'Directional edge not statistically established...'
  },
  provenance: {
    source:     'EIA-930',
    hash:       'sha256:ba8870...',
    verifiable: true,
    servedFrom: 'stored snapshot - not a live upstream call'
  },
  _raw:     { /* untouched original */ },
  _adapter: 'truthbear@1.0'
}
```

**Every field can be null.** Absence of a declaration is information, not an error — it is what 88.9% of providers do.

`_raw` is always preserved. Normalising never loses data.

---

## API

**`buildRequest(schema, params?)`** → `{ method, body, queryParams, ready, missing, filled }`

**`applyRequest(url, req)`** → `{ url, method, body }` ready to send.

**`normalize(url, body)`** → normalised declaration. Unknown URLs return an empty declaration with `_adapter: 'none'` and `_raw` intact. Nothing throws.

**`isUsable(decl, opts)`** → `{ usable, reasons, providerAtFault, codes }`

Reasons are structured, not prose. Each carries a `code` and an `attributable`
field (`provider` or `caller`). `providerAtFault` is true only when the provider
broke something it declared itself — as distinct from a rejection that reflects
the caller's own stricter policy. A settlement layer branches on that.

| Option | Effect |
|---|---|
| `maxAgeSeconds` | Reject data older than the caller's limit |
| `requireEstablished` | Reject when the provider states the metric is not statistically supported |

It also rejects when the provider declares the data stale, and when the age exceeds the provider's **own** declared maximum. That last check needs no configuration: it holds the provider to what it said itself.

**`call({ url, schema, params, pay, require })`** → both halves in one step. `pay` is a function you supply — the library never handles payments or keys.

**`coverage(decl)`** → which of the three properties are actually present.

---

## Supported providers

| Adapter | Matches | Declares |
|---|---|---|
| `truthbear@1.0` | `aeml-x402`, `truthbear` | freshness, provenance, verifiable hash |
| `kronos@1.0` | `kronossignals` | freshness, calibrated confidence, statistical support |
| `ottoai@1.0` | `ottoai.services` | freshness, source health |
| `apitoll@1.0` | `apitoll.cloud` | freshness, confidence, upstream source |
| `hugen@1.0` | `hugen.tokyo` | freshness, source count, quality state |
| `lumi@1.0` | `app.tenna.ai` | window, outcome state, rubric version |

---

## Adding an adapter

```js
const { empty } = require('x402-declarations/src/schema');

const matches = (url) => /yourprovider\.com/.test(url || '');

function parse(body) {
  const d = empty();
  d._adapter = 'yourprovider@1.0';
  d._raw = body;
  if (body.your_age_field !== undefined) {
    d.freshness.ageSeconds = Number(body.your_age_field);  // convert to seconds
  }
  return d;
}

module.exports = { matches, parse };
```

Pull requests welcome. Adapters are the point.

---

## What this is not

**It does not verify anything.** It reports what the provider declared, normalised. If a provider declares `stale: false` and serves stale data, this library faithfully reports `isStale: false`. Verification is a separate problem, measured separately at the [observatory](https://github.com/arturete58-sys/x402-observatory).

**It does not rank providers.** No scores, no leaderboards, no judgements.

**It does not handle payments.** `call` takes a payment function; keys never touch this library.

**It is a workaround.** The right fix is a field in the x402 specification so declarations are uniform at source. Part 1 needs no adapters because the input contract is standardised. Part 2 needs six because the output is not. This library exists because of that gap and is designed to become unnecessary if it closes.

---

## Tests

```
npm test
```

Ten assertions covering unit conversion, threshold extraction from prose, stale detection, unknown-URL safety and enum resolution.

---

## Related

- [x402-observatory](https://github.com/arturete58-sys/x402-observatory) — the measurements behind every figure in this README, with raw data and methodology.

## Licence

MIT.

---

## Part 3 — Reading results: every provider wraps differently

The same problem, one layer down. A provider returns the actual result of
your call wrapped in its own envelope, and no two agree on the shape:

```
{ "items": [...] }                                        // at the root
{ "result": { "schema": "...", "items": [...] } }         // nested twice
{ "data": { "result": [...] } }                           // different wrapper
```

```js
const { extractResult } = require('x402-declarations');

const { value, path, wrapped } = extractResult(url, body, { expect: 'array' });
// value: [1, 2, 3]
// path:  ['result', 'items']
```

`expect` accepts `array`, `object`, `scalar` or `any`. When no known envelope
matches and a single non-metadata array is present, it is returned. When
nothing is recognisable the body is returned unchanged with `wrapped: false` —
the function never guesses silently.

`path` tells you where it found the value, so a caller can audit the choice
rather than trust it.

---

## Unknown providers: pattern detection

With no adapter for a provider, `normalize` falls back to detecting quality
fields by name pattern and unit suffix rather than returning nothing.

```js
normalize('https://never-seen.example/x', { meta: { elapsed_ms: 250, health: 'ok' } })
// {
//   freshness: { ageSeconds: 0.25, isStale: false, ... },
//   _adapter: 'heuristic',
//   _detected: { ageSeconds: { field: 'meta.elapsed_ms', unit: 'ms' }, ... }
// }
```

`_detected` records which field each value came from, so the inference can be
audited rather than trusted.

**Detection is never presented as declaration.** `isUsable` returns a `basis`
field:

| basis | meaning |
|---|---|
| `declared` | an exact adapter read fields the provider documents |
| `heuristic` | fields were inferred from names and units |
| `none` | nothing recognisable was found |

Anything acting on a verdict — a settlement layer, a contract — should treat
`heuristic` as a signal to verify, not as ground truth. The unit is only
inferred when the field name carries a recognisable suffix (`_ms`, `_hours`,
`_seconds`); without one, the function returns nothing rather than guessing.
