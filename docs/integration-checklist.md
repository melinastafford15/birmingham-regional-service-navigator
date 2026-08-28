# Integration Checklist — CivicRoute BHM

Owner: **Melina Stafford**. Last updated 2026-08-28.

Nobody merges past a red gate. If a gate cannot be met, we cut scope rather than ship a
confident wrong answer.

---

## PR review order

Review and merge in this sequence. The first merge is **one Birmingham case end to end** —
Homewood and Jefferson County are added only after that vertical slice works.

| Order | Branch | Owner | What it must land |
|---|---|---|---|
| 1 | `feat/warehouse-retrieval` | Andrew | `retrieveEvidence()` returning `EvidenceBundle` |
| 1 | `feat/evidence-qa` | Taylor | Warehouse rows matching `data/schema.md`, all three jurisdictions |
| 2 | `feat/rag-api` | Upendar | API returning `HandoffResponse` + deterministic fallback |
| 3 | `feat/handoff-ui` | JJ | Chat + handoff card consuming `HandoffResponse` |
| 4 | `docs/product-submit` | Melina | Docs, contracts, release fixes |

Andrew and Taylor are reviewed together — their contract and data must align before
anything downstream is worth reviewing.

---

## Gates

### 1. Contract gate

All four lanes use the frozen shapes in [lib/contracts.ts](../lib/contracts.ts).

- [x] Frozen contracts exist in code (`lib/contracts.ts`)
- [x] Complete mock response for the Birmingham sidewalk case exported
- [x] Three synthetic demo locations defined and frozen
- [ ] UI sends `RouteRequestPayload` (`message`, `synthetic_location_id`, `jurisdiction_hint`) — blocked on the UI
- [ ] Retrieval returns `EvidenceBundle` — lookup works; the named wrapper is Andrew's to add
- [x] API returns `HandoffResponse` (inside `RouteApiResult`)
- [x] Disclaimer string is imported from `contracts.ts`, never retyped
- [x] **Seven divergences resolved — see below**

### 2. Data gate

- [x] Warehouse validates against [data/schema.md](../data/schema.md)
- [x] All three frozen jurisdictions present, under exact Census names
- [x] All four subtypes present in each jurisdiction
- [x] Every row has `source_url` and `checked_on`
- [x] Every unverified row is `is_synthetic: true` with a `555-01xx` number
- [x] `fallen-tree-debris` rows added for all three jurisdictions
- [ ] **Every row is still a placeholder. Real source verification is Taylor's, and is phase 1 of the pilot.**

### 3. Retrieval gate

- [x] One query returns ranked official evidence
- [x] Ranking is city → county, then by confidence
- [x] Overlapping claims come back as multiple candidates, not silently collapsed
- [x] A miss returns `not_covered` + a gap entry, never a fabricated record

### 4. API gate

- [x] Valid `HandoffResponse` for all three demo cases
- [x] Deterministic fallback with no `ANTHROPIC_API_KEY` — all cases above were verified this way
- [x] Deterministic fallback on model error or timeout
- [x] Emergency language short-circuits before any lookup
- [x] Malformed request rejected via `validateRouteRequest()` with HTTP 400
- [x] Model never selects the entity and never emits a contact

### 5. UI gate

Every required field visible. These are eligibility requirements, not styling preferences.

- [ ] `likely_responsible_entity` and `jurisdiction`
- [ ] `reason`
- [ ] `confidence`
- [ ] `conflict_or_gap` rendered whenever non-null
- [ ] `official_contact` — phone, email, or form
- [ ] `sources[]` with title, publisher, link, and `last_checked` date
- [ ] `requires_human_confirmation` + `human_confirmation_instruction`
- [ ] `disclaimer` verbatim on every routed response
- [ ] Visible **example data** badge on any synthetic record
- [ ] Location picker offers only the three frozen synthetic locations — no free-text address
- [ ] Keyboard navigable; contrast meets WCAG AA; card readable by screen reader in order

### 6. Safety gate

- [x] Only synthetic locations accepted — a real address is refused
- [x] No live submission anywhere in the codebase
- [x] No secret committed; `.env*` gitignored; key never reaches the browser
- [x] No claim of legal responsibility — "likely responsible entity" wording throughout
- [x] Never called "311"; no implication of official government affiliation
- [x] All placeholder numbers in the reserved `555-01xx` range
- [x] No personal data stored

### 7. Release gate

- [x] `npm run build && npm run lint && npm run typecheck` pass (build must precede typecheck; see README)
- [ ] README setup instructions verified against that clean clone
- [ ] All three demo scenarios run end to end — verified at the API; blocked on the UI
- [ ] Every limitation documented and none overstated
- [ ] Submission text links the repo and states MVP, impact, safety boundaries, roadmap

---

## Divergences — RESOLVED 2026-08-28

The backend committed on `main` predated the frozen contract. All seven are now closed.
Resolution was by Melina's direction; the changes crossing into other lanes are listed
under "Cross-lane changes" below so each owner knows what moved.

| # | Divergence | Resolution |
|---|---|---|
| 1 | Request shape | ✅ `/api/route-request` now accepts `RouteRequestPayload` and rejects anything else with HTTP 400 and specific reasons. A real address is refused by the validator. |
| 2 | Response shape | ✅ Returns `RouteApiResult`. Translation lives in one file, `lib/handoff.ts`. `alternates` and `notes` fold into `conflict_or_gap`. |
| 3 | Disclaimer text | ✅ Frozen string is served. Imported from `contracts.ts`, never retyped. The old constant stays in `lib/types.ts`, now unused by the live path. |
| 4 | `fallen-tree-debris` | ✅ Added `fallen_tree_debris` as an internal `ServiceType`, a keyword rule ordered ahead of `illegal_dumping` (which also matches "debris"), and **three data rows** — Birmingham, Jefferson County, Homewood. All four frozen subtypes now have real coverage in all three jurisdictions. |
| 5 | Extra jurisdictions | ✅ Rows kept. `JURISDICTION_QUERY` in `lib/handoff.ts` sets `state: null`, so ALDOT rows never surface; Mountain Brook, Hoover, and Shelby are unreachable because the validator gates the jurisdiction list. Harmless and roadmap-ready. |
| 6 | SMS | ✅ `sms` is absent from the frozen response. `brief.md` and `problem-statement.md` reworded so nothing implies SMS ships. `composeSms` remains in `lib/respond.ts`, now unused. |
| 7 | Live geocoding | ✅ Unreachable — the frozen request has no address field. `lib/geocode.ts` retained for roadmap phase 4. |

### Contract addition — `outcome`

`HandoffResponse` had no way to express the two outcomes that are not routed answers: a
life-safety emergency, and a request with no evidence behind it. Neither can be expressed
without inventing a `likely_responsible_entity`.

Resolution: the API returns `RouteApiResult`, discriminated by `outcome`
(`handoff` | `emergency` | `not_covered`). **A handoff carries every frozen
`HandoffResponse` field unchanged** — this is a superset of the frozen shape, not a change
to it. The UI branches on `outcome` before reading anything else.

### Cross-lane changes — owners please review

Per the standing rule, these are the smallest integration fixes and are recorded here:

| File | Lane | What changed |
|---|---|---|
| `app/api/route-request/route.ts` | Upendar | Now validates and delegates to `lib/handoff.ts`. All routing logic preserved, moved not deleted. |
| `lib/classify.ts` | Upendar | One keyword rule added for `fallen_tree_debris`, ordered ahead of `illegal_dumping`. Model prompt untouched. |
| `lib/types.ts` | Backend | `fallen_tree_debris` added to `SERVICE_TYPES` and its label map. Nothing removed. |
| `data/offices.seed.json` | Taylor | Three `fallen_tree_debris` rows added, all synthetic, `555-01xx`, with notes recording the private-property caveat. **These need verification like every other row.** |
| `docs/API.md` | Melina | Rewritten to the frozen contract. |
| `docs/brief.md`, `docs/problem-statement.md` | Melina | SMS reworded to roadmap-only; scope aligned to 4 subtypes / 3 jurisdictions; removed the "copy-ready report packet" claim, which describes a feature that does not exist. |

`lib/respond.ts`, `lib/geocode.ts`, `lib/gaps.ts`, `lib/repository.ts`, and the repository
implementation were **not modified**.

---

## Verified behavior

Exercised against a production build with **no `ANTHROPIC_API_KEY`**, so this is also the
deterministic-fallback path.

| Case | Result |
|---|---|
| `BHM-DEMO-01` sidewalk | → Birmingham DOT, `medium`, 2 sources, conflict named |
| `BHM-DEMO-02` drainage | → Jefferson County Roads, `medium`, county-level reason |
| `BHM-DEMO-03` pothole | → Homewood Public Works, `high`, no gap logged |
| Fallen tree, `BHM-DEMO-01` | → Birmingham Public Works, `fallen-tree-debris` |
| "hit by a car and is bleeding" | → `emergency`, no lookup ran |
| Street light (outside frozen four) | → `not_covered` + gap entry |
| Real address as location id | → HTTP 400, refused |
| Unknown demo id / bad jurisdiction | → HTTP 400 with specific reasons |
| Gap register | 2 entries from 4 routed requests — genuine contention only |

### One fix this testing surfaced

Every city location has a county row behind it, so `ambiguous_ownership` fired on *every*
request and confidence never reached `high`. That made both signals worthless. Contention
now requires a primary that is not high-confidence, or an alternate carrying a
low-confidence documented disagreement. Homewood pothole is now `high` with no gap logged;
the sidewalk case, which has genuinely conflicting published information, still logs.

---

## Status

| Gate | State |
|---|---|
| Contract | 🟢 Frozen shapes land in code and are enforced at the endpoint |
| Data | 🟡 28 rows; all four subtypes × three jurisdictions covered. **Every row is still a synthetic placeholder pending Taylor's verification.** |
| Retrieval | 🟢 Ranked city→county lookup works. A named `retrieveEvidence()` wrapper is still Andrew's to add. |
| API | 🟢 Valid frozen response on all three cases + deterministic fallback verified with no API key |
| UI | 🔴 `app/page.tsx` is still create-next-app boilerplate |
| Safety | 🟢 Synthetic-only enforced, no live submission, no secret tracked, all numbers `555-01xx`, "likely responsible entity" wording throughout |
| Release | 🟡 build / lint / typecheck green; no automated test suite; UI blocks the end-to-end demo |

**Critical path: the UI — and it is now the only thing between here and a running demo.**
The API is live and returns the frozen shape today. JJ can build against either the real
endpoint or `MOCK_BIRMINGHAM_SIDEWALK_RESPONSE`.
