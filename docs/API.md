# API Contract — Birmingham Regional Service Navigator

**For the frontend.** This is stable. Build against it now; the backend fills in behind it.
Import types from `lib/types.ts` rather than redefining them.

Base URL: same origin. No auth.

---

## `POST /api/route-request`

The only endpoint you need.

### Request

```jsonc
{
  "message": "the storm drain on my corner floods every time it rains",  // required
  "location": "2850 19th St S, Homewood, AL 35209"                       // optional
}
```

`location` may be an address, an intersection, or a place description. If it is missing
or unresolvable, you get `status: "needs_location"` back — prompt the user and re-send.

### Response

Always HTTP 200 with this shape. Branch on `status`, never on HTTP code.

```jsonc
{
  "status": "routed",
  "jurisdiction": {
    "place": "Homewood city",
    "county": "Jefferson County",
    "state": "Alabama",
    "matchedAddress": "2850 19TH ST S, HOMEWOOD, AL, 35209",
    "coordinates": { "lat": 33.4707, "lon": -86.7969 },
    "confidence": "high",
    "isUnincorporated": false
  },
  "serviceType": "storm_drain",
  "primary": {
    "office": "Homewood Public Works",
    "level": "city",
    "jurisdictionName": "Homewood city",
    "channel": { "phone": "205-555-0100", "email": null, "formUrl": "https://…" },
    "whatToSay": "Report a blocked storm drain at <address>, recurring during heavy rain.",
    "source": { "url": "https://…", "checkedOn": "2026-08-28" },
    "confidence": "high",
    "isSynthetic": true,
    "notes": null
  },
  "alternates": [],
  "notes": ["Placeholder contact — not yet verified against a public source."],
  "gapLogged": false,
  "sms": "Homewood Public Works — 205-555-0100. Say: Report a blocked storm drain…",
  "disclaimer": "Guidance only, based on published public sources. The office you contact confirms responsibility."
}
```

### The four statuses

| `status` | Meaning | What to render |
|---|---|---|
| `routed` | We found an office | `primary`, then `alternates` if non-empty, then `notes` |
| `needs_location` | No location given, or it could not be resolved | Ask for a street address |
| `not_covered` | Outside our service domain or jurisdiction set | Say so plainly; do not guess |
| `emergency` | Life-safety language detected | 911 only. No office, no lookup ran. |

---

## Rules the UI must follow

These are eligibility-gate requirements, not styling preferences.

1. **Always render `disclaimer`** on a `routed` response.
2. **Always show `isSynthetic`** when true — a visible "example data" badge. Never present
   a synthetic contact as a real one.
3. **Always render `notes`** when non-empty. That is where overlaps and staleness surface.
4. **Show `alternates` when present.** They mean two offices may both have a claim. Do not
   silently hide them to make the answer look cleaner — the ambiguity is the point.
5. **Never fabricate a contact.** If `primary` is null, there is no answer to show.
6. **Show `jurisdiction.place`** even when it contradicts what the user typed. A Birmingham
   mailing address resolving to "Mountain Brook city" is the product working, not a bug.

---

## `GET /api/gaps`

The gap register — every lookup we could not resolve.

```jsonc
{
  "count": 3,
  "entries": [
    { "serviceType": "sidewalk", "place": "Vestavia Hills city", "county": "Jefferson County",
      "reason": "no_match", "message": "cracked sidewalk", "at": "2026-08-28T17:42:10.001Z" }
  ]
}
```

`reason` is one of `no_match`, `ambiguous_ownership`, `out_of_coverage`. In-memory for now,
so it resets on redeploy.

---

## `GET /api/health`

`{ "ok": true, "officeCount": 21, "hasApiKey": true }` — useful for confirming a deploy.

---

## Worked examples

```bash
# routed
curl -s localhost:3000/api/route-request -H 'content-type: application/json' \
  -d '{"message":"storm drain floods every rain","location":"2850 19th St S, Homewood, AL 35209"}'

# the mailing-address trap — says Birmingham, resolves to Mountain Brook city
curl -s localhost:3000/api/route-request -H 'content-type: application/json' \
  -d '{"message":"big pothole on my street","location":"3600 Bethune Dr, Birmingham, AL 35210"}'

# needs_location
curl -s localhost:3000/api/route-request -H 'content-type: application/json' \
  -d '{"message":"there is a pothole"}'

# emergency — short-circuits, no lookup
curl -s localhost:3000/api/route-request -H 'content-type: application/json' \
  -d '{"message":"someone was hit by a car","location":"Birmingham, AL"}'
```
