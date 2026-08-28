# Brief — Birmingham Regional Service Navigator

Challenge 2: Make Regional Services Easier to Navigate · August 28, 2026

## In one line

A resident texts a problem and a location; we text back the right phone number,
email, or online form — for the state, county, or city office that actually
handles it.

## User, moment, outcome

- **User:** a resident of Greater Birmingham
- **Moment:** "Who do I call about this?"
- **Outcome:** a working contact channel and what to say, in one message

## How it works

1. Resident texts a plain-language problem plus a location.
2. We classify the problem into a service type and resolve the location to a
   jurisdiction.
3. We look up the responsible office in a cited knowledge base and text back its
   contact channel.

## What comes back

A short message containing:

- **Office name** and the **best channel** — phone, email, or form URL
- **What to say** — one line, so the resident is not re-explaining from scratch
- **Confidence**, stated plainly, and a **second option** when two offices may both
  have a claim
- **Source link** for the contact information, with the date it was checked

If we cannot resolve it, we say so and give the best general starting point rather
than guessing. Every miss is logged as a gap-register entry — a running list of the
places where ownership between jurisdictions is genuinely undefined.

## Scope

One service domain — **the public right-of-way and adjacent infrastructure**
(streets, sidewalks, storm drains, signals, dumping) — across at least three
jurisdictions, plus the county and state layers.

## Out of scope

- Filing anything. We hand over a phone number; we do not submit tickets,
  requests, or referrals to any agency.
- Deciding legal responsibility. We report what public sources say and how
  confident we are.
- Live status, queue position, or office hours presented as current.
- Storing personal data. No names, accounts, or case histories.
- Emergencies — routed to 911 immediately, conversation ends.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wrong number costs the resident a second afternoon | Confidence stated on every reply; a second option given whenever two offices may both have a claim |
| Reads as an official responsibility determination | Contacts come only from cited public sources; every reply links its source and is framed as guidance |
| Contact information goes stale | Every knowledge-base entry carries a source URL and a `checked_on` date |
| The model invents an office or a phone number | The model classifies the problem only. Contact details are looked up from the cited knowledge base; a miss returns "unknown," never a generated number |
| SMS provisioning eats the build window | Web chat ships first as the reviewable artifact; SMS is added only once that path works |

## Human review point

We surface a contact and stop. The **public employee who answers** is the person who
confirms responsibility and acts. No consequential decision is made by the system.

## Measurable outcome

Share of test cases routed to the correct office on the first try, scored against a
human-reviewed answer key covering at least three jurisdictions.
