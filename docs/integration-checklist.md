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
- [ ] UI sends `RouteRequestPayload` (`message`, `synthetic_location_id`, `jurisdiction_hint`)
- [ ] Retrieval returns `EvidenceBundle`
- [ ] API returns `HandoffResponse`
- [ ] Disclaimer string is imported from `contracts.ts`, never retyped
- [ ] **Seven open divergences resolved — see below. Blocking.**

### 2. Data gate

- [ ] Warehouse validates against [data/schema.md](../data/schema.md)
- [ ] All three frozen jurisdictions present, under exact Census names
- [ ] All four subtypes present in each jurisdiction, or the absence is a documented gap
- [ ] Every row has `source_url` and `checked_on`
- [ ] Every unverified row is `is_synthetic: true` with a `555-01xx` number
- [ ] **No `fallen-tree-debris` rows exist anywhere. Blocking for that subtype.**

### 3. Retrieval gate

- [ ] One query returns ranked official evidence
- [ ] Ranking is city → county, then by confidence
- [ ] Overlapping claims come back as multiple candidates, not silently collapsed
- [ ] A miss returns empty + `conflict_or_gap`, never a fabricated record

### 4. API gate

- [ ] Valid `HandoffResponse` for all three demo cases
- [ ] Deterministic fallback with no `ANTHROPIC_API_KEY` (keyword classification)
- [ ] Deterministic fallback on model error or timeout
- [ ] Emergency language short-circuits before any lookup
- [ ] Malformed request rejected via `validateRouteRequest()`
- [ ] Model never selects the entity and never emits a contact

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

- [ ] Only synthetic locations accepted
- [ ] No live submission anywhere in the codebase
- [ ] No secret committed; `.env*` gitignored; key never reaches the browser
- [ ] No claim of legal responsibility — "likely responsible entity" wording throughout
- [ ] Never called "311"; no implication of official government affiliation
- [ ] All placeholder numbers in the reserved `555-01xx` range
- [ ] No personal data stored

### 7. Release gate

- [ ] `npm ci && npm run typecheck && npm run lint && npm run build` passes from a clean clone
- [ ] README setup instructions verified against that clean clone
- [ ] All three demo scenarios run end to end
- [ ] Every limitation documented and none overstated
- [ ] Submission text links the repo and states MVP, impact, safety boundaries, roadmap

---

## Open divergences — need Melina's decision

The backend committed on `main` predates the frozen contract. `lib/contracts.ts` is
additive: nothing was rewritten, nothing was deleted. These seven need a call before the
contract gate can go green.

| # | Frozen contract | Existing code | Recommendation |
|---|---|---|---|
| 1 | `{message, synthetic_location_id, jurisdiction_hint}` | `{message, location}` — real address, live Census geocode | Upendar adds the frozen shape as the public endpoint; the geocode path stays in the repo, unused, for the phase-4 roadmap item. |
| 2 | `HandoffResponse` | `RouteResponse` (`primary`/`alternates`/`notes`/`sms`) | Upendar maps internals → `HandoffResponse` at the boundary. `alternates` and `notes` fold into `conflict_or_gap`. |
| 3 | *"…navigation aid, not a legal determination…"* | *"Guidance only, based on published public sources…"* | Frozen text wins. Import from `contracts.ts`; leave the old constant until the API is cut over. |
| 4 | 4 subtypes | 8 internal types; **no tree/debris type, zero tree rows in data** | Keep the 8 internally; expose only the frozen 4. Taylor adds `fallen-tree-debris` rows or we document it as an uncovered subtype. **Needs a decision.** |
| 5 | 3 jurisdictions | Data also ships Mountain Brook, Hoover, Shelby County, ALDOT | Leave the rows; the frozen jurisdiction list gates what the UI can request. Extra rows are harmless and roadmap-ready. |
| 6 | Web chat only | `sms` field on every response; `brief.md` calls SMS the pilot channel | Drop `sms` from the public response. Reword `brief.md` so nothing implies SMS ships. |
| 7 | Synthetic locations only | `geocode.ts` sends typed text to a live federal endpoint | Not reachable once the frozen request shape lands. Keep the module; document it as roadmap phase 4. |

**Decisions needed:** #4 (tree/debris coverage) is the only one that changes what we can
demo. The rest are mechanical.

---

## Status

| Gate | State |
|---|---|
| Contract | 🟡 Frozen types landed; lanes not yet cut over; 7 divergences open |
| Data | 🟡 25 rows, all synthetic placeholders; no tree/debris rows |
| Retrieval | 🟡 Repository interface + JSON implementation exist; `retrieveEvidence()` not built |
| API | 🟡 Route works on the old shape; not on the frozen shape |
| UI | 🔴 `app/page.tsx` is still create-next-app boilerplate |
| Safety | 🟡 Model-never-picks-the-office property holds; frozen request shape not yet enforced |
| Release | 🟡 typecheck / lint / build green; no test suite; UI blocks the end-to-end run |

**Critical path: the UI.** Everything else has a working or mockable substitute. JJ can
build the whole card today against `MOCK_BIRMINGHAM_SIDEWALK_RESPONSE` without waiting on
any other lane.
