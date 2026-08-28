# CivicRoute BHM — Impact Lab submission

Repository: <https://github.com/melinastafford15/birmingham-regional-service-navigator>

## One-sentence pitch

CivicRoute BHM turns a resident's plain-language public right-of-way problem and a
clearly synthetic location into the likely city or county office to contact first,
while showing the evidence, uncertainty, official contact channel, and required human
confirmation behind that suggestion.

## The problem

Municipal services do not follow the boundaries residents see in a mailing address.
A Birmingham address may be inside a municipality or in unincorporated Jefferson
County, and responsibility may overlap among a city, the county, and an adjoining
property owner. Residents lose time calling offices that redirect them, while public
employees repeatedly answer the same routing questions.

## What we built

The working web MVP covers four public right-of-way issues—pothole or road damage,
sidewalk damage, blocked drainage, and fallen tree or debris—across the City of
Birmingham, Jefferson County, and the City of Homewood.

Its shared warehouse and retrieval layer ranks matching evidence by jurisdiction and
confidence. A server-side classifier uses Claude when configured and deterministic
keyword rules when it is not. The API then returns one frozen, source-bearing contract
to the accessible handoff interface. The interface shows:

- the likely responsible entity and jurisdiction;
- why it is the likely starting point and the confidence level;
- any known conflict, overlap, or evidence gap;
- a phone, email, or official form channel;
- source title, publisher, link, and last-checked date; and
- a human-confirmation instruction and safety disclaimer.

The same API also handles emergency language before retrieval and refuses to invent an
office when the request is outside the evidence set.

## Demonstrated impact

The MVP makes institutional boundaries visible at the moment a resident needs help. It
can reduce avoidable transfers, shorten time-to-correct-office, and give participating
governments a structured gap register showing where public guidance conflicts or is
missing. Because the warehouse and API are shared, future municipal partners can
improve one evidence layer instead of maintaining separate answers for every channel.

## Safety and honesty boundaries

This prototype uses only three fabricated locations and synthetic placeholder office
records. It accepts no real address or personal information, submits no service request,
and never claims to determine legal responsibility. All example phone numbers use the
reserved `555-01xx` range, and placeholder sources are visibly labeled as example data.
Residents are told to confirm responsibility with a person before relying on a result.

Official-source verification remains required before any public pilot. The MVP is a
navigation aid, not an official government service or a replacement for emergency
services.

## What comes next — 300-hour pilot

1. Verify every office, contact, policy excerpt, jurisdiction, and checked date against
   official public sources, with a second-person QA pass.
2. Add repeatable retrieval, contract, accessibility, and end-to-end tests and measure
   routing accuracy against a reviewed evaluation set.
3. Pilot the four issue types with municipal and county staff, record redirects and
   unresolved boundaries, and publish ownership and refresh rules for the evidence.
4. Only after those gates are met, add real geocoding and additional service families;
   other channels remain future adapters to the same governed API.

## Team

- Melina Stafford (`melinastafford15`) — product lead, project management, contracts,
  integration, documentation, pitch, and submission
- Andrew Parsons (`abparsons`) — warehouse, retrieval, and Anthropic integration
- Taylor DeCelle (`tdecelle-ai`) — evidence normalization, official-source verification,
  and data QA
- JJ Foster (`joshuajfoster-rgb`) — accessible resident handoff interface
- Upendar (`Upendar11`) — routing API, RAG orchestration, fallback, and safety behavior

## Demo

Clone the repository, follow the setup in [README.md](../README.md), and run `npm run dev`.
The three browser scenarios work without an Anthropic key using deterministic fallback.
Use [demo-script.md](demo-script.md) for the live presentation and
[integration-checklist.md](integration-checklist.md) for verified behavior and open
release gates.
