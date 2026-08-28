# Brief — Birmingham Regional Service Navigator

Challenge 2: Make Regional Services Easier to Navigate · August 28, 2026

## In one line

A resident describes a problem in web chat and picks a synthetic demo location; we
return the right phone number, email, or online form — for the county or city office
that actually handles it.

## User, moment, outcome

- **User:** a resident of Greater Birmingham
- **Moment:** "Who do I call about this?"
- **Outcome:** a working contact channel and what to say, in one handoff card

## How it works

1. Resident describes a plain-language problem in web chat and selects a synthetic
   demo location.
2. We classify the problem into a service type and resolve the location to a
   jurisdiction.
3. We look up the responsible office in a cited knowledge base and return its contact
   channel with the evidence behind it.

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

One service family — **public right-of-way maintenance** — across exactly three
jurisdictions.

**Issue subtypes (4):** `pothole-road-damage` · `sidewalk-damage` · `blocked-drainage` ·
`fallen-tree-debris`

**Jurisdictions (3):** City of Birmingham · Jefferson County · City of Homewood

Anything outside that returns "not covered" rather than a guess. Scope is frozen for
submission; widening it is a product decision, not an implementation one.

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
| Channel work eats the build window | Web chat is the only interface in the frozen MVP. SMS, voice, and every other channel are roadmap items and are not built before submission |

## Human review point

We surface a contact and stop. The **public employee who answers** is the person who
confirms responsibility and acts. No consequential decision is made by the system.

## Measurable outcome

Share of test cases routed to the correct office on the first try, scored against a
human-reviewed answer key covering at least three jurisdictions.
