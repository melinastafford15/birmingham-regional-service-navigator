# Data Contract — office / contact records

**For whoever is building the office database.** Fill this shape and the backend picks it
up with no code changes. Every row answers one question: *for this service type in this
jurisdiction, who do you contact?*

---

## The one thing that will break if you get it wrong

`jurisdiction_name` **must match the US Census place name exactly**, including the
lowercase suffix:

| Correct | Wrong |
|---|---|
| `Homewood city` | `Homewood`, `City of Homewood`, `HOMEWOOD` |
| `Birmingham city` | `Birmingham` |
| `Mountain Brook city` | `Mtn Brook city` |
| `Hoover city` | `Hoover City` |
| `Jefferson County` | `Jefferson Co.`, `Jefferson` |
| `Alabama` | `AL` |

We resolve the resident's address through the Census geocoder, which returns strings like
`"Homewood city"`. The join is on that exact string. If it does not match, the lookup
silently misses and the resident gets "not covered."

Check any name here: <https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=2850+19th+St+S,+Homewood,+AL+35209&benchmark=Public_AR_Current&vintage=Current_Current&layers=Incorporated+Places,Counties,States&format=json>

---

## Columns

| Column | Required | Type | Notes |
|---|---|---|---|
| `id` | ✅ | string | Any stable unique id, e.g. `homewood-storm-drain` |
| `jurisdiction_type` | ✅ | enum | `city` \| `county` \| `state` |
| `jurisdiction_name` | ✅ | string | **Exact Census name** — see above |
| `service_type` | ✅ | enum | See list below |
| `office_name` | ✅ | string | Public-facing name, e.g. `Homewood Public Works` |
| `phone` | ◻︎ | string | `205-555-0100` format |
| `email` | ◻︎ | string | |
| `form_url` | ◻︎ | string | Online reporting form |
| `what_to_say` | ✅ | string | One line the resident can read aloud. Use `<address>` as a placeholder. |
| `source_url` | ✅ | string | The public page you took this from |
| `checked_on` | ✅ | date | `YYYY-MM-DD`, the day you verified it |
| `confidence` | ✅ | enum | `high` \| `medium` \| `low` |
| `notes` | ◻︎ | string | Overlaps, caveats, conflicts between jurisdictions |
| `is_synthetic` | ✅ | boolean | `true` for any placeholder or example row |

**At least one of `phone`, `email`, `form_url` must be present.** A row with none of them
is dropped.

### `service_type` values

`storm_drain` · `pothole_street` · `sidewalk` · `traffic_signal` · `street_light` ·
`illegal_dumping` · `abandoned_vehicle` · `other`

---

## Rules that are not optional

These come from the event rule set. A violation can disqualify the whole submission.

1. **`is_synthetic: true` on every made-up row.** If you have not verified a contact
   against a real public page, it is synthetic. Mark it.
2. **Placeholder phone numbers must be `555-01xx`.** That range is reserved for examples
   and cannot ring a real person. Never invent a plausible-looking real number.
3. **`source_url` and `checked_on` are required on real rows.** A contact with no source
   is not usable — we display provenance on every answer.
4. **Never copy in private, internal, or non-public contact information.** Published
   public pages only.
5. **Put conflicts in `notes` rather than resolving them.** If the city page and the county
   page disagree about who owns something, say so in `notes` and set `confidence: low`.
   Surfacing the disagreement is the product; picking a winner is not our call.

---

## Multiple offices for one service

Add more than one row with the same `jurisdiction_name` + `service_type`. Highest
`confidence` becomes the primary; the rest come back as alternates, and the resident is
told both may have a claim. Use `notes` to explain the overlap.

---

## Example rows

```json
[
  {
    "id": "homewood-storm-drain",
    "jurisdiction_type": "city",
    "jurisdiction_name": "Homewood city",
    "service_type": "storm_drain",
    "office_name": "Homewood Public Works",
    "phone": "205-555-0100",
    "email": null,
    "form_url": null,
    "what_to_say": "Report a blocked storm drain at <address>, recurring during heavy rain.",
    "source_url": "https://example.invalid/placeholder",
    "checked_on": "2026-08-28",
    "confidence": "high",
    "notes": null,
    "is_synthetic": true
  },
  {
    "id": "jeffco-roads-sidewalk",
    "jurisdiction_type": "county",
    "jurisdiction_name": "Jefferson County",
    "service_type": "sidewalk",
    "office_name": "Jefferson County Roads and Transportation",
    "phone": "205-555-0142",
    "email": null,
    "form_url": null,
    "what_to_say": "Ask whether the sidewalk at <address> is county-maintained.",
    "source_url": "https://example.invalid/placeholder",
    "checked_on": "2026-08-28",
    "confidence": "medium",
    "notes": "City and county maintenance boundaries are unclear on some annexed streets.",
    "is_synthetic": true
  }
]
```

## Delivery

JSON array matching the above → `data/offices.seed.json`. A CSV with these exact column
headers also works; tell the backend and we convert it. Partial is fine — send what you
have and we merge.
