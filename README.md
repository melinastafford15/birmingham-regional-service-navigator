# CivicRoute BHM — Team 2B

CivicRoute BHM is a Birmingham-region municipal service navigator built for the Claude Impact Lab’s Challenge 2: **Make Regional Services Easier to Navigate**.

## Judge review

- **Working public demo:** [https://birmingham-regional-service.vercel.app/](https://birmingham-regional-service.vercel.app/)
- **Canonical judged source:** this [`main`](https://github.com/melinastafford15/birmingham-regional-service-navigator/tree/main) branch
- **Working artifact:** the resident interface in [`app/`](app/) and its routing pipeline in [`lib/`](lib/)
- **Local review:** follow [Run the artifact locally](#run-the-artifact-locally); no API key is required

> **Review note:** `main` is the single source of truth for the judged artifact. No pull request or alternate branch is required to review the project.

Because the artifact can be reviewed through the working public link above, the event rules do not require a separate 60-second demo video.

> **Prototype notice:** Every location, office record, phone number, and source link shown in the demo is synthetic. CivicRoute BHM is a navigation aid, not a legal determination, and it does not submit a service request to any agency.

## Team

- **Team name:** CivicRoute BHM
- **Team ID:** Team 2B
- **Team members:**
  - Melina Stafford (`melinastafford15`) — product lead, integration, contracts, documentation, and submission
  - Andrew Parsons (`abparsons`) — backend, evidence repository, retrieval, and Anthropic integration
  - Taylor DeCelle (`tdecelle-ai`) — accessible resident-facing interface and evidence QA
  - JJ Foster (`joshuajfoster-rgb`) — frontend QA, accessibility, and demo testing
  - Upendar (`Upendar11`) — API safety, fallback behavior, and testing

## Challenge and primary user

- **Challenge:** Challenge 2 — Make Regional Services Easier to Navigate (municipal collaboration)
- **Primary user:** A Birmingham-region resident with a public right-of-way problem who does not know whether a city or county office is the correct place to start.
- **Secondary user:** A frontline government employee who otherwise has to research and redirect a misrouted request.

## Problem and repeated workflow

Residents regularly encounter potholes, broken sidewalks, blocked drainage, or fallen trees but cannot easily determine which government office handles the problem. A Birmingham mailing address does not necessarily mean a location is inside the City of Birmingham, and responsibility can overlap among a municipality, Jefferson County, and an adjoining property owner.

The repeated workflow is:

1. A resident notices a public infrastructure problem.
2. They search multiple government websites or call a familiar office.
3. They are redirected because the location or service belongs elsewhere.
4. They repeat the explanation, lose time, and may abandon the request.

Government employees also spend time answering and redirecting requests that belong elsewhere.

## What the main artifact does

A resident describes a problem in plain language and chooses one of four clearly labeled synthetic demonstration locations. The application returns:

- the likely city or county office to contact first;
- the applicable jurisdiction;
- a plain-language reason for the recommendation;
- a confidence level;
- any known ownership conflict or evidence gap;
- a phone, email, or form channel;
- supporting source information and its last-checked date;
- a required human-confirmation step; and
- a disclaimer that the result is guidance, not a legal determination.

The demo covers:

- potholes or road damage;
- sidewalk damage;
- blocked drainage; and
- fallen trees or debris.

The three demonstration jurisdictions are:

- City of Birmingham;
- Jefferson County; and
- City of Homewood.

The judged web interface does **not** accept a real address, name, phone number, or email. It does not submit, track, or update a service request.

## Data and evidence sources

The current demonstration uses synthetic data only.

- **Office and routing records:** [`data/offices.seed.json`](data/offices.seed.json)
- **Data schema:** [`data/schema.md`](data/schema.md)
- **Synthetic locations:** `BHM-DEMO-01` through `BHM-DEMO-04` in [`app/lib/handoff-fixtures.ts`](app/lib/handoff-fixtures.ts)
- **Synthetic phone numbers:** Reserved `555-01xx` fictional numbers
- **Synthetic source links:** Non-resolving `example.invalid` URLs
- **Policy and responsibility descriptions:** Team-authored examples designed to demonstrate jurisdictional ambiguity

All **30 seed evidence records** are marked synthetic. No current office, contact, policy, or responsibility record has been verified against an official government source.

The web interface sends only a frozen synthetic location ID. The server maps that ID to one of four example addresses before resolving its demonstration jurisdiction; a resident cannot enter a real address through the judged interface.

## Architecture and approach

```text
Resident web interface
        |
        | message + synthetic location ID
        v
POST /api/route
        |
        v
Synthetic-location adapter
        |
        v
Claude or keyword issue classification
        |
        v
Structured seed/Supabase evidence retrieval
        |
        v
Jurisdiction ranking + conflict detection
        |
        v
Source-bearing handoff response
        |
        v
Accessible result card + human confirmation
```

Important demo files:

| File | Purpose |
|---|---|
| [`app/page.tsx`](app/page.tsx) | Accessible resident-facing web interface |
| [`app/api/route/route.ts`](app/api/route/route.ts) | Synthetic-location adapter used by the web interface |
| [`app/lib/handoff-contract.ts`](app/lib/handoff-contract.ts) | Resident-facing handoff contract and safety disclaimer |
| [`lib/classify.ts`](lib/classify.ts) | Claude-backed classification with keyword fallback |
| [`lib/geocode.ts`](lib/geocode.ts) | Jurisdiction resolution for the four server-side example addresses |
| [`lib/repositories/index.ts`](lib/repositories/index.ts) | Selects the seed repository or optional Supabase-plus-seed repository |
| [`lib/repositories/json-repository.ts`](lib/repositories/json-repository.ts) | Structured seed-record retrieval |
| [`lib/repositories/supabase-repository.ts`](lib/repositories/supabase-repository.ts) | Optional centralized Supabase evidence adapter |
| [`lib/gaps.ts`](lib/gaps.ts) | In-memory unresolved and ambiguous routing register |
| [`data/offices.seed.json`](data/offices.seed.json) | Synthetic evidence records |

The synthetic JSON seed is the no-configuration evidence layer. When the three `SUPABASE_*` environment variables are configured, the same repository interface reads the centralized Supabase table and unions it with the seed. Retrieval is deterministic structured lookup, not yet an embedding-based vector database or complete production RAG system.

## How Claude is used

Claude was used in two ways:

1. **Building the project:** Claude Code assisted with implementation, contract design, debugging, integration, documentation, and release verification.
2. **Inside the artifact:** When `ANTHROPIC_API_KEY` is configured, Claude classifies the resident’s description into a supported issue type. If the key is absent or the model request fails, deterministic keyword rules keep the demo working.

Claude does **not** choose the responsible office or invent contact information. Office names, channels, source links, and checked dates come from the structured evidence repository.

## Safety and human review

- Emergency language stops normal routing and displays 911 guidance.
- Unsupported requests return an honest `not_covered` result instead of an invented office.
- Every routed response shows its confidence, evidence, caveats, and synthetic status.
- The application never files a request or makes a legal determination.
- A public employee at the receiving office must confirm responsibility before anyone relies on the result.

## What works today

- The [public browser interface](https://birmingham-regional-service.vercel.app/) is available without installation or sign-in.
- The browser interface builds and runs from the public `main` branch without an Anthropic API key.
- Three synthetic demonstration jurisdictions and four frozen example locations route through the application API.
- Four public right-of-way issue types are supported.
- Results display jurisdiction, confidence, reasoning, conflicts, contact information, sources, checked dates, and human-confirmation instructions.
- Synthetic results display a visible **Example data** label.
- Emergency language returns 911 guidance.
- Unsupported requests return a coverage-gap response instead of an invented office.
- Unknown or real location identifiers are rejected by request validation.
- The application works without an Anthropic API key using deterministic classification.

## Known limitations and simulated elements

- All four locations are fabricated.
- All 30 seed evidence records are synthetic placeholders.
- Phone numbers, source links, office descriptions, and checked dates are examples.
- The project has not been approved or endorsed by Birmingham, Jefferson County, Homewood, or another government organization.
- The evidence repository is a JSON file rather than a deployed database.
- Retrieval is structured lookup rather than a vector or embedding-based RAG system.
- Only four issue types and three jurisdictions are available through the public interface.
- The gap register is in memory and resets on redeploy.
- No measured routing-accuracy evaluation or automated end-to-end browser suite exists yet.
- The result identifies a likely starting point; it does not determine legal responsibility.
- The application is not a replacement for 911 or an official government service.

## Next step toward a pilot

Designate one municipal service owner to verify and approve the office, contact, jurisdiction, and source records for one narrow workflow—beginning with the Birmingham sidewalk demonstration—then test a fixed set of cases against a human-reviewed answer key before involving residents.

## Run the artifact locally

```bash
git clone https://github.com/melinastafford15/birmingham-regional-service-navigator.git
cd birmingham-regional-service-navigator
npm install
npm run dev
```

Open <http://localhost:3000>.

Optional environment variables:

```dotenv
ANTHROPIC_API_KEY=
ANTHROPIC_WORKSPACE_ID=
```

Without an Anthropic API key, deterministic keyword classification is used.

Verification commands:

```bash
npm run lint
npm run build
```
