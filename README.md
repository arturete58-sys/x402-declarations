# x402-declarations

Normalise quality declarations from x402 providers into one schema.

```
npm install x402-declarations
```

---

## The problem

x402 providers that care about data quality declare it. They just don't agree on how.

A survey of the full x402 catalogue (15,157 resources, 1,230 providers) found that **99.84% declare the shape of the response** — which fields, of which type — but **only 11.1% of providers declare anything about the quality of the data**: freshness, confidence, or provenance.

Among the 136 that do, **all seven possible combinations of those three properties are represented.** There is no convention. There isn't even agreement on *where* to declare: some providers declare in the catalogue schema, the most rigorous ones declare only in the response body — which means an agent cannot read it before paying.

The result is that consuming five providers means writing five parsers:

| Concept | Kronos | Truth Bear | Otto AI | ApiToll | hugen |
|---|---|---|---|---|---|
| Data age | `cache_age_seconds` | `data_age_hours` | `meta.stalenessSec` | `asOf` (timestamp) | `quote_age_ms` |
| Is it stale | `stale` | `freshness` | `degraded` | — | `quality_state` |
| Confidence | `up_prob_calibrated` | `uncertainty` | `sourceHealth` | `confidence` | `fresh_sources` |
| Source | `model` | `traceable_to` | — | `source.name` | — |
| Verifiable | — | `record_hash` | — | — | — |

Five vocabularies. Three different units for age (seconds, hours, milliseconds) plus one absolute timestamp. No shared semantics.

In practice, no agent parses any of them.

---

## What this does

One function. Give it a URL and a response body, get back a normalised declaration.

```js
const { normalize, isUsable } = require('x402-declarations');

const res  = await payAndFetch('https://tick.hugen.tokyo/tick/latest');
const decl = normalize(res.url, res.body);

const check = isUsable(decl, { maxAgeSeconds: 60 });
if (!check.usable) {
  console.warn('skipping:', check.reasons);
}
```

Real output from that endpoint:

```
{
  usable: false,
  reasons: [
    'provider declares data as stale',
    'age 1140s exceeds caller limit 60s'
  ]
}
```

That response arrived with HTTP 200, after a successful payment, in a valid schema. Nothing in the payment layer, the status code or the response shape indicated a problem. The provider had declared `quality_state: "stale"`, `fresh_sources: 0` of 6, and `is_crossed: true` — a bid above the ask, which is arithmetically impossible in a live market.

The provider was honest. The declaration was simply unreadable by anything that didn't already know its format.

---

## The schema

```js
{
  freshness: {
    ageSeconds:         408,      // always seconds, whatever the provider uses
    declaredMaxSeconds: 1200,     // extracted from the provider's own statement
    isStale:            false,
    basis:              'cache'   // 'live' | 'cache' | 'snapshot' | 'multi-source'
  },
  quality: {
    confidence:  0.4269,
    established: false,           // does the provider claim statistical support
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

**Every field can be null.** Absence of a declaration is information, not an error — it means the provider said nothing, which is what 88.9% of them do.

`_raw` is always preserved. Normalising never loses data.

---

## `established` is the field that matters

Kronos ships this in its response body:

```json
"direction_note": "Directional edge not statistically established for this
 asset (hit-rate not proven > 50%). Treat direction as low-confidence."
```

That is an honest, careful warning. It is also English prose. No agent reads it.

The adapter turns it into:

```js
quality: { established: false, sampleSize: 1000 }
```

A boolean an agent can branch on. That transformation — from a caveat a human would read to a field a machine can evaluate — is the whole point of the library.

---

## Supported providers

| Adapter | Matches | Declares |
|---|---|---|
| `truthbear@1.0` | `aeml-x402`, `truthbear` | freshness, provenance, verifiable hash |
| `kronos@1.0` | `kronossignals` | freshness, calibrated confidence, statistical support |
| `ottoai@1.0` | `ottoai.services` | freshness, source health |
| `apitoll@1.0` | `apitoll.cloud` | freshness, confidence, upstream source |
| `hugen@1.0` | `hugen.tokyo` | freshness, source count, quality state |

Unknown URLs return an empty declaration with `_adapter: 'none'` and `_raw` intact. Nothing breaks.

---

## API

**`normalize(url, body)`** → normalised declaration.

**`isUsable(decl, opts)`** → `{ usable, reasons }`.

| Option | Effect |
|---|---|
| `maxAgeSeconds` | Reject if the data is older than the caller's limit |
| `requireEstablished` | Reject if the provider states the metric is not statistically supported |

It also rejects when the provider declares the data stale, or when the age exceeds the provider's **own** declared maximum. That last check needs no configuration: it holds the provider to what it said itself.

**`coverage(decl)`** → which of the three properties are actually present.

---

## Adding an adapter

An adapter is two functions:

```js
const { empty } = require('x402-declarations/schema');

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

**It does not verify anything.** It reports what the provider declared, normalised. If a provider declares `stale: false` and serves stale data, this library will faithfully report `isStale: false`. Verification is a separate problem, measured separately at the [observatory](https://github.com/arturete58-sys/x402-observatory).

**It does not rank providers.** No scores, no leaderboards, no judgements.

**It is a workaround.** The right fix is a field in the x402 specification so that declarations are uniform at the source. This library exists because that field does not exist yet, and it is designed to become unnecessary if it ever does.

---

## Related

- [x402-observatory](https://github.com/arturete58-sys/x402-observatory) — the measurements behind the numbers in this README, with raw data and methodology.

## Licence

MIT.
