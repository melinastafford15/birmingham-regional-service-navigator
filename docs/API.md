# API Contract — CivicRoute BHM

**Frozen.** Owner: Melina Stafford. Nobody changes these shapes without her approval.

Import types from [lib/contracts.ts](../lib/contracts.ts) rather than redefining them.
Base URL: same origin. No auth.

---

## `POST /api/route-request`

The only endpoint the UI needs.

### Request — `RouteRequestPayload`

```jsonc
{
  "message": "The sidewalk is broken near my location",  // required, non-empty
  "synthetic_location_id": "BHM-DEMO-01",                // required, frozen demo set
  "jurisdiction_hint": "birmingham-al"                   // required, frozen set
}
```

**There is no address field.** The MVP never accepts a real resident address. The UI offers
a picker over the three frozen synthetic locations and sends the id.

| `synthetic_location_id` | Jurisdiction | Demonstrates |
|---|---|---|
| `BHM-DEMO-01` | `birmingham-al` | Baseline city case; responsibility may be shared with the adjoining property owner |
| `BHM-DEMO-02` | `jefferson-county-al` | Birmingham-style mailing address that is not inside any city |
| `BHM-DEMO-03` | `homewood-al` | A separate municipality with its own intake |

`jurisdiction_hint` is **advisory**. The synthetic location table is authoritative, and the
answering office's own jurisdiction wins — a county record routes to the county even when
the location sits inside a city.

A request failing validation returns **HTTP 400** with the specific reasons:

```jsonc
{ "error": "Invalid request",
  "details": ["synthetic_location_id must be a synthetic id beginning with \"BHM-DEMO-\""] }
```

### Response — `RouteApiResult`

HTTP 200. **Branch on `outcome` before reading any other field.**

`HandoffResponse` describes a routed answer. Two real cases are not routed answers — a
life-safety emergency, and a request we have no evidence for. Neither can be expressed by
inventing an entity, so the result carries an `outcome` discriminator. A handoff includes
every frozen `HandoffResponse` field unchanged; `outcome` is additive.

| `outcome` | Meaning | What to render |
|---|---|---|
| `handoff` | We found a likely responsible entity | The full card, every field below |
| `emergency` | Life-safety language detected | `message` only. 911. No lookup ran. |
| `not_covered` | Outside the frozen scope, or no evidence exists | `reason`, and `conflict_or_gap` if non-null. Never guess. |

#### `outcome: "handoff"`

```jsonc
{
  "outcome": "handoff",
  "service": "public-right-of-way-maintenance",
  "issue_subtype": "sidewalk-damage",
  "likely_responsible_entity": "Birmingham Department of Transportation",
  "jurisdiction": "birmingham-al",
  "reason": "Synthetic demo location BHM-DEMO-01 sits inside City of Birmingham, and …",
  "confidence": "medium",
  "conflict_or_gap": "More than one office may have a claim here (…). Start with the first…",
  "next_action": "Call Birmingham Department of Transportation at 205-555-0102. Ask about…",
  "official_contact": { "phone": "205-555-0102", "email": null, "form_url": null },
  "sources": [
    { "title": "… contact information (placeholder pending verification)",
      "publisher": "City of Birmingham",
      "url": "https://example.invalid/placeholder-pending-verification",
      "last_checked": "2026-08-28" }
  ],
  "requires_human_confirmation": true,
  "human_confirmation_instruction": "Call or contact the office listed above and ask them…",
  "disclaimer": "This is a navigation aid, not a legal determination, and it does not submit a service request."
}
```

#### `outcome: "emergency"` / `"not_covered"`

```jsonc
{ "outcome": "emergency",
  "message": "This sounds like an emergency. Call 911 now. We did not look up a routing office.",
  "disclaimer": "…" }

{ "outcome": "not_covered",
  "reason": "We only cover potholes and road damage, sidewalk damage, blocked drainage, and fallen trees or debris right now.",
  "conflict_or_gap": "Logged as a coverage gap.",
  "disclaimer": "…" }
```

---

## Rules the UI must follow

Eligibility-gate requirements, not styling preferences.

1. **Render `disclaimer` verbatim** on every response. Import the string; never retype it.
2. **Render `requires_human_confirmation` + `human_confirmation_instruction`** on every
   handoff. The public employee who answers is the decision-maker, and the card says so.
3. **Render `conflict_or_gap` whenever non-null.** That is where overlaps, caveats, and
   staleness surface. Do not hide it to make the answer look cleaner — the ambiguity is
   the point.
4. **Render every entry in `sources`**, each with its `last_checked` date. A contact
   without visible provenance is not usable.
5. **Show a visible "example data" badge** whenever a source is marked as a placeholder.
   Never present a synthetic contact as a real one.
6. **Show `confidence`** as given. Do not round it up.
7. **Never fabricate a contact.** If `outcome` is not `handoff`, there is no office to show.
8. **Offer only the three frozen synthetic locations.** No free-text address input.

---

## `GET /api/gaps`

The gap register — every lookup we could not resolve, and every genuinely contested one.

```jsonc
{ "count": 2,
  "entries": [
    { "serviceType": "sidewalk", "place": "Birmingham city", "county": "Jefferson County",
      "reason": "ambiguous_ownership", "message": "the sidewalk is broken",
      "at": "2026-08-28T17:42:10.001Z" }
  ] }
```

`reason` is `no_match`, `ambiguous_ownership`, or `out_of_coverage`.

`ambiguous_ownership` fires only on **genuine** contention — a primary record that is not
high-confidence, or an alternate carrying a low-confidence documented disagreement. Almost
every city location has a county record behind it; logging that as a conflict every time
would make the register worthless.

In-memory for now, so it resets on redeploy.

---

## `GET /api/health`

`{ "ok": true, "officeCount": 28, "hasApiKey": false }` — useful for confirming a deploy.
`hasApiKey: false` is not a failure; classification falls back to deterministic keyword
rules.

---

## Worked examples

```bash
curl -s localhost:3000/api/route-request -H 'content-type: application/json' -d '{"message":"The sidewalk is broken near my location","synthetic_location_id":"BHM-DEMO-01","jurisdiction_hint":"birmingham-al"}'
```

```bash
curl -s localhost:3000/api/route-request -H 'content-type: application/json' -d '{"message":"The drain at the corner is blocked and floods every hard rain","synthetic_location_id":"BHM-DEMO-02","jurisdiction_hint":"jefferson-county-al"}'
```

```bash
curl -s localhost:3000/api/route-request -H 'content-type: application/json' -d '{"message":"someone was hit by a car and is bleeding","synthetic_location_id":"BHM-DEMO-01","jurisdiction_hint":"birmingham-al"}'
```

---

## Internal shapes

[lib/types.ts](../lib/types.ts) holds the backend's own vocabulary (`ServiceType`,
`OfficeRecord`, `RouteResponse`). It is **not** the integration contract and the UI must not
import from it. Translation happens in one place: [lib/handoff.ts](../lib/handoff.ts).
