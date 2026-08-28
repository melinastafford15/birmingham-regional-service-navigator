# CivicRoute BHM — Team 2B

CivicRoute BHM is a Birmingham-region municipal service navigator built for the Claude Impact Lab’s Challenge 2: **Make Regional Services Easier to Navigate**.

## Judge review

- **Working public demo:** [https://birmingham-regional-service.vercel.app/](https://birmingham-regional-service.vercel.app/)
- **Canonical judged source:** this [`main`](https://github.com/melinastafford15/birmingham-regional-service-navigator/tree/main) branch
- **Working artifact:** the resident interface in [`app/`](app/) and its routing pipeline in [`lib/`](lib/)
- **Local review:** follow [Run the artifact locally](#run-the-artifact-locally); no API key is required

> **Review note:** `main` is the single source of truth for the judged artifact. No pull request or alternate branch is required to review the project.

Because the artifact can be reviewed through the working public link above, the event rules do not require a separate 60-second demo video.

> **Prototype notice:** Every selectable location is synthetic. Office contacts come from a combined Supabase-plus-seed evidence layer; anything detected as an unverified placeholder is visibly marked **[Synthetic]**. CivicRoute BHM is a navigation aid, not a legal determination, and it does not submit a service request to any agency.

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

### Additional implemented paths on `main`

The repository also contains two broader, optional interfaces described in [`docs/API.md`](docs/API.md):

- **Direct-address API:** `POST /api/route-request` accepts a plain-language problem and an optional address, resolves the jurisdiction through the Census geocoder, and returns the backend routing contract. The public browser demo does not call this endpoint.
- **Sendblue SMS/iMessage:** `POST /api/sms` accepts a Sendblue inbound webhook, separates the problem from its location with Claude or a heuristic fallback, runs the same classification/geocoding/retrieval pipeline, and can reply through Sendblue when credentials are configured. Without credentials, it returns a preview and sends nothing.

These paths broaden the implementation beyond the four-case browser demo. The backend taxonomy also includes traffic signals, street lights, illegal dumping, and abandoned vehicles in addition to the four public-demo issue types. Neither optional path submits a government service request or contacts an agency. The SMS sender number is used only to address the reply and is not intentionally stored or logged.

## Data and evidence sources

The deployed demonstration uses a combined `supabase+seed` evidence source. At the latest health check, it reported **48 usable records**: 30 synthetic seed records plus 18 records mapped from the centralized Supabase table.

- **Office and routing records:** [`data/offices.seed.json`](data/offices.seed.json)
- **Data schema:** [`data/schema.md`](data/schema.md)
- **Centralized evidence adapter:** [`lib/repositories/supabase-repository.ts`](lib/repositories/supabase-repository.ts)
- **Supabase schema mapping and synthetic detection:** [`lib/repositories/municipal-evidence.ts`](lib/repositories/municipal-evidence.ts)
- **Synthetic locations:** `BHM-DEMO-01` through `BHM-DEMO-04` in [`app/lib/handoff-fixtures.ts`](app/lib/handoff-fixtures.ts)
- **Synthetic phone numbers:** Reserved `555-01xx` fictional numbers
- **Synthetic source links:** Non-resolving `example.invalid` URLs
- **Policy and responsibility descriptions:** Team-authored examples designed to demonstrate jurisdictional ambiguity

All **30 seed evidence records** carry `is_synthetic: true`. The Supabase source schema does not contain that field, so its adapter conservatively derives synthetic status from placeholder signals such as `555` phone numbers and reserved test/example domains. Records detected as synthetic render with **[Synthetic]** and **Example data** labels.

Every tested combination for the four selectable public-demo locations currently resolves to a synthetic seed placeholder. The Supabase records make the broader data layer a mix of mapped public listings and placeholders, but they still require human source verification before a pilot or consequential use.

The web interface sends only a frozen synthetic location ID. The server maps that ID to one of four example addresses before resolving its demonstration jurisdiction; a resident cannot enter a real address through the judged interface.

## Architecture and approach

```text
Resident web interface          Direct client             Sendblue webhook
        |                            |                            |
        | synthetic location ID     | problem + address          | text + sender
        v                            v                            v
POST /api/route          POST /api/route-request          POST /api/sms
        |                            |                            |
        +----------------------------+----------------------------+
        |
        v
Input parsing + jurisdiction resolution
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
| [`app/api/route-request/route.ts`](app/api/route-request/route.ts) | Direct-address backend contract |
| [`app/api/sms/route.ts`](app/api/sms/route.ts) | Optional Sendblue inbound webhook and reply orchestration |
| [`app/lib/handoff-contract.ts`](app/lib/handoff-contract.ts) | Resident-facing handoff contract and safety disclaimer |
| [`lib/classify.ts`](lib/classify.ts) | Claude-backed classification with keyword fallback |
| [`lib/geocode.ts`](lib/geocode.ts) | Census jurisdiction resolution for synthetic and optional direct-address inputs |
| [`lib/sms-parse.ts`](lib/sms-parse.ts) | Claude-backed SMS problem/location parsing with heuristic fallback |
| [`lib/sendblue.ts`](lib/sendblue.ts) | Credential-gated outbound Sendblue reply adapter |
| [`lib/repositories/index.ts`](lib/repositories/index.ts) | Selects the seed repository or optional Supabase-plus-seed repository |
| [`lib/repositories/json-repository.ts`](lib/repositories/json-repository.ts) | Structured seed-record retrieval |
| [`lib/repositories/supabase-repository.ts`](lib/repositories/supabase-repository.ts) | Optional centralized Supabase evidence adapter |
| [`lib/gaps.ts`](lib/gaps.ts) | In-memory unresolved and ambiguous routing register |
| [`data/offices.seed.json`](data/offices.seed.json) | Synthetic evidence records |

The synthetic JSON seed is the no-configuration evidence layer. When the three `SUPABASE_*` environment variables are configured, the same repository interface reads the centralized Supabase table and unions it with the seed. Retrieval is deterministic structured lookup, not yet an embedding-based vector database or complete production RAG system.

## How Claude is used

Claude was used in two ways:

1. **Building the project:** Claude Code assisted with implementation, contract design, debugging, integration, documentation, and release verification.
2. **Inside the artifact:** When `ANTHROPIC_API_KEY` is configured, Claude classifies the resident’s description into a supported issue type. For the optional SMS path, Claude also separates the problem description from the location. If the key is absent or a model request fails, deterministic keyword and parsing rules keep both paths working.

Claude does **not** choose the responsible office or invent contact information. Office names, channels, source links, and checked dates come from the structured evidence repository.

## Safety and human review

- Emergency language stops normal routing and displays 911 guidance.
- Unsupported requests return an honest `not_covered` result instead of an invented office.
- Every routed response shows its confidence, evidence, caveats, and synthetic status.
- The application never files a request or makes a legal determination.
- A public employee at the receiving office must confirm responsibility before anyone relies on the result.
- The optional SMS path replies only to the resident; it does not message a government office. Its sender number is used for delivery and is not intentionally persisted or logged.

## What works today

- The [public browser interface](https://birmingham-regional-service.vercel.app/) is available without installation or sign-in.
- The browser interface builds and runs from the public `main` branch without an Anthropic API key.
- Three synthetic demonstration jurisdictions and four frozen example locations route through the application API.
- Four public right-of-way issue types are supported.
- The direct-address `/api/route-request` path supports the broader backend service taxonomy and Census jurisdiction resolution.
- The `/api/sms` webhook composes a safe preview without credentials and can send a resident reply when Sendblue is configured.
- The deployed health endpoint currently reports a reachable `supabase+seed` source with 48 usable records: 30 synthetic seed records and 18 Supabase-mapped records.
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
- The Supabase source schema lacks an explicit `is_synthetic` field. Placeholder-signal detection is a conservative stopgap, not a substitute for independent human source verification.
- Retrieval is structured lookup rather than a vector or embedding-based RAG system.
- Only four issue types and three jurisdictions are available through the public interface.
- The gap register is in memory and resets on redeploy.
- The direct-address and SMS paths can receive a location, and SMS necessarily receives a sender number. They have not completed a production privacy, consent, retention, abuse-prevention, or security review and are not part of the public browser demo.
- Gap entries retain the submitted problem text in memory and `GET /api/gaps` has no authentication. That diagnostic endpoint is not suitable for production as written.
- The browser adapter and direct-address endpoint expose two response contracts. They share the backend pipeline, but contract consolidation remains future work.
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
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_OFFICES_TABLE=
SENDBLUE_API_KEY_ID=
SENDBLUE_API_SECRET_KEY=
SENDBLUE_FROM_NUMBER=
```

Without an Anthropic API key, deterministic keyword classification and SMS parsing are used. Without all three Supabase variables, retrieval uses the synthetic seed alone. Without all three Sendblue variables, the SMS endpoint sends nothing and returns a preview response.

Verification commands:

```bash
npm run lint
npm run build
```
