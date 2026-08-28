# CivicRoute BHM (Team 2B)

CivicRoute BHM is a Birmingham-region municipal service navigator built for the Claude Impact Lab’s Challenge 2: **Make Regional Services Easier to Navigate**.

It helps a resident answer a recurring question: **“Which government office should I contact first?”**

> **Prototype notice:** The office records, phone numbers, source links, and example responses in this repository are synthetic placeholders. CivicRoute BHM is a navigation aid, not a legal determination, and it does not submit a service request to any agency.

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
- **Primary user:** A Birmingham-region resident with a public right-of-way problem who does not know whether a city, county, or state office is the correct place to start.
- **Secondary user:** A frontline government employee who otherwise has to research and redirect a misrouted request.

## Problem and repeated workflow

Greater Birmingham is not one government. A mailing address does not necessarily establish the governing jurisdiction, and the pavement, sidewalk, drainage system, traffic signal, or adjoining right-of-way at one location may be maintained by different entities.

The repeated workflow is:

1. A resident notices a public infrastructure problem.
2. They search several government websites or call a familiar office.
3. They learn that the location or asset may belong to another jurisdiction.
4. They repeat the same explanation to another office.
5. The correct routing knowledge is rarely retained for the next resident or employee.

## What the current project does

CivicRoute BHM provides two prototype channels.

### Web interface

The browser interface asks the resident to describe a problem and choose one of four clearly labeled demonstration locations. The selected demonstration location is translated to a fixed example address, resolved through the public US Census Geocoder, and matched against the repository of office records.

The result can show:

- the likely office to contact first;
- the jurisdiction returned by the Census Geocoder;
- a confidence level;
- known ownership conflicts, caveats, or alternate offices;
- a phone number, email address, or form URL;
- what the resident can say when contacting the office;
- a source URL and last-checked date;
- a visible synthetic-data indicator; and
- a reminder that the receiving office must confirm responsibility.

The browser defaults to the live application API. Add `?api=mock` to the local URL to use the isolated interface fixtures instead.

### SMS and iMessage channel

The repository also contains a Sendblue webhook at `POST /api/sms`. A resident can text a right-of-way problem and a location. The service separates the problem from the location, resolves the jurisdiction, finds the likely office, and replies to the resident.

The SMS channel does not contact a government agency or submit a service request. The sender’s number is used to deliver the reply and is not intentionally written to the gap register or application logs. When a lookup is unresolved or ambiguous, the problem description—not the sender’s phone number or resolved address—may be added to the in-memory gap register.

Sendblue credentials are optional. Without them, the webhook returns a preview of the composed reply instead of sending it.

## Current service coverage

The backend classifier and repository recognize these public right-of-way categories:

- storm drains and drainage;
- potholes and street surfaces;
- sidewalks;
- traffic and crosswalk signals;
- street lights;
- illegal dumping and debris;
- abandoned vehicles; and
- fallen trees or storm debris.

The browser demonstration focuses on four resident-facing examples: potholes or road damage, sidewalk damage, blocked drainage, and fallen trees or debris.

## Data and evidence sources

### US Census Geocoder

The current routing pipeline uses the public [US Census Geocoder](https://geocoding.geo.census.gov/geocoder/) to determine the incorporated place, county, and state associated with an address. This demonstrates why a postal city name may not identify the government responsible for a location.

### Structured evidence repository

Office and routing records are stored in [`data/offices.seed.json`](data/offices.seed.json) and described in [`data/schema.md`](data/schema.md).

The current file contains **30 records**, and every record is marked `is_synthetic: true`:

- phone numbers use the reserved `555-01xx` fictional range;
- placeholder source links use the non-resolving `example.invalid` domain;
- office descriptions and checked dates are examples; and
- no current contact or responsibility record has been verified against an official municipal source.

The JSON file acts as the prototype’s centralized evidence layer. It is structured lookup, not an embedding-based vector database or a complete production RAG system.

## Architecture and approach

```text
Web interface                       Sendblue SMS/iMessage
      |                                      |
      | message + demo location              | text + real location
      v                                      v
POST /api/route                      POST /api/sms
      |                                      |
      +---------------+----------------------+
                      |
                      v
          Claude or keyword classification
                      |
                      v
               US Census geocoding
                      |
                      v
        JSON office/evidence repository
                      |
                      v
       Recommendation + source + confidence
                      |
                      v
          Human confirmation by the office
```

Important implementation files:

| File | Purpose |
|---|---|
| [`app/page.tsx`](app/page.tsx) | Accessible resident-facing web interface |
| [`app/api/route/route.ts`](app/api/route/route.ts) | Adapter used by the browser interface |
| [`app/api/route-request/route.ts`](app/api/route-request/route.ts) | Canonical address-based routing endpoint |
| [`app/api/sms/route.ts`](app/api/sms/route.ts) | Sendblue inbound webhook and reply workflow |
| [`lib/classify.ts`](lib/classify.ts) | Claude-backed issue classification with keyword fallback |
| [`lib/sms-parse.ts`](lib/sms-parse.ts) | Claude-backed SMS problem/location parsing with heuristic fallback |
| [`lib/geocode.ts`](lib/geocode.ts) | Census jurisdiction resolution |
| [`lib/repositories/json-repository.ts`](lib/repositories/json-repository.ts) | Structured office-record retrieval |
| [`lib/gaps.ts`](lib/gaps.ts) | In-memory unresolved and ambiguous routing register |
| [`data/offices.seed.json`](data/offices.seed.json) | Synthetic office and evidence records |

## How Claude is used

Claude was used in two ways:

1. **Building the project:** Claude Code assisted with implementation, integration, debugging, documentation, and release work.
2. **Inside the application:** When `ANTHROPIC_API_KEY` is configured, Claude classifies a resident’s problem. The SMS workflow can also use Claude to separate the problem description from the location. If the key is absent or a model request fails, deterministic fallback rules keep the prototype usable.

Claude does **not** choose an office or invent contact information. Office names, channels, sources, and checked dates come from the structured repository.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/route` | Browser handoff-card adapter using a selected demo location |
| `POST /api/route-request` | Address-based routing pipeline |
| `POST /api/sms` | Receive a Sendblue message and compose or send a reply |
| `GET /api/sms` | Report whether Sendblue credentials are configured |
| `GET /api/gaps` | Return the current in-memory coverage-gap register |
| `GET /api/health` | Return application health, office count, and API-key status |

See [`docs/API.md`](docs/API.md) for the address-based API contract.

## Local setup

### Requirements

- Node.js 20 or newer
- npm
- An Anthropic API key is optional
- Sendblue credentials are optional and needed only to send SMS or iMessage replies

### Install and run

```bash
git clone https://github.com/melinastafford15/birmingham-regional-service-navigator.git
cd birmingham-regional-service-navigator
npm install
npm run dev
```

Open <http://localhost:3000>.

To run the browser with local fixtures instead of the application API, open:

<http://localhost:3000/?api=mock>

### Optional environment variables

Create `.env.local` in the repository root when needed:

```dotenv
ANTHROPIC_API_KEY=
ANTHROPIC_WORKSPACE_ID=

# Sendblue accepts either API-key naming convention used below.
SENDBLUE_API_KEY_ID=
SENDBLUE_API_SECRET_KEY=
# Alternatively:
# SENDBLUE_API_KEY=
# SENDBLUE_API_SECRET=
SENDBLUE_FROM_NUMBER=
```

Never commit real credentials.

### Verification commands

```bash
npm run lint
npm run build
```

## What works today

- An accessible browser interface accepts a plain-language problem and a demonstration location.
- The browser is connected to the live `/api/route` adapter by default.
- The canonical `/api/route-request` endpoint classifies a problem, resolves a supplied address, and retrieves matching office records.
- The Census integration distinguishes an incorporated municipality from unincorporated county land.
- Results can include a primary office, alternate offices, confidence, source information, checked dates, caveats, and a human-review disclaimer.
- Emergency language short-circuits normal routing and returns 911 guidance.
- Unresolved, ambiguous, and out-of-coverage cases can be written to the in-memory gap register.
- The Sendblue webhook can parse an incoming message, compose a reply, and send it when credentials are configured.
- Claude-dependent operations fall back to deterministic rules when no Anthropic key is available.

## Known limitations and simulated elements

- All 30 office and evidence records are synthetic placeholders.
- No office, contact channel, responsibility claim, or source record has been verified against an official government source.
- The project has not been approved or endorsed by Birmingham, Jefferson County, Homewood, or another government organization.
- The web demonstration locations are selected examples, but the routing adapter maps them to real example addresses for live Census lookup.
- The SMS channel accepts a phone number and resident-supplied location through Sendblue; it therefore needs privacy, retention, consent, and security review before any public pilot.
- The evidence repository is a JSON file rather than a deployed centralized database.
- Retrieval is deterministic structured lookup rather than a complete vector or embedding-based RAG system.
- The gap register is stored only in application memory and resets when the server restarts or redeploys.
- There is no measured routing-accuracy evaluation or automated end-to-end browser test suite.
- The application may depend on the Census service, Anthropic, and Sendblue for particular live paths.
- CivicRoute BHM does not submit, track, or update service requests.
- The result identifies a likely starting point; a public employee must confirm responsibility.
- The application is not a replacement for 911 or an official government service.

## Human review point

CivicRoute BHM produces a recommendation and stops. The public employee who receives the call, email, form, or resident inquiry remains responsible for confirming jurisdiction and deciding what action to take. No consequential government decision is executed by the system.

## Next step toward a pilot

Designate one municipal service owner to verify and approve the office, contact, jurisdiction, and source records for one narrow workflow—such as Birmingham sidewalk routing—then test a fixed set of cases against a human-reviewed answer key before involving residents.

## Working artifact

- **Public repository:** <https://github.com/melinastafford15/birmingham-regional-service-navigator>
- **Web interface:** [`app/page.tsx`](app/page.tsx)
- **API documentation:** [`docs/API.md`](docs/API.md)
- **Problem statement:** [`docs/problem-statement.md`](docs/problem-statement.md)
- **Product brief:** [`docs/brief.md`](docs/brief.md)

## Demo video

**Demo video:** [ADD 60-SECOND DEMO VIDEO LINK]

Until a public deployment or video is available, reviewers can run the project locally using the instructions above.
