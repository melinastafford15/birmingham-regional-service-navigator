# Problem Statement

**Birmingham Regional Service Navigator**
Birmingham Claude Impact Lab — Challenge 2: Make Regional Services Easier to Navigate
Drafted August 28, 2026

---

## The moment

A resident stands over a storm drain that backs up every hard rain. They call the
city. The city says it is county. They call the county. The county says it is city.
They call the city back, reach a different person, and hear county again.

Nobody on those calls is lying. Nobody on those calls actually knows. The resident
stops calling. The drain still floods.

That exchange is the product. Everything below describes it precisely enough to fix.

## Primary user

A **resident of Greater Birmingham** who has a specific problem at a specific place
and does not know which government owns it.

The secondary beneficiary is the **frontline staff member** on the other end of the
phone, who absorbs the misrouted call and re-derives the same answer by hand.

## The problem

Greater Birmingham is not one government. Jefferson County alone contains dozens of
incorporated municipalities, and the county, the state, and regional authorities each
hold assets inside their borders. A single residential block can carry a city street,
a county-maintained road, a state route, a storm drain, a sidewalk, and a utility
easement — each with a different owner, none of them labeled.

Three structural facts make this unnavigable for a resident:

1. **A mailing address does not establish jurisdiction.** A Birmingham postal address
   does not mean a resident lives inside Birmingham city limits. Residents routinely
   do not know which municipality they are in, and no single public page tells them.
2. **Responsibility is by asset, not by geography.** Standing at one corner, the
   pavement, the drain beneath it, the sidewalk beside it, and the signal above it may
   have four different owners. The resident sees one place and reasonably expects one
   owner.
3. **Every jurisdiction publishes differently.** Terms, intake channels, hours, and
   categories differ across municipalities. "Right-of-way maintenance," "street
   repair," and "public works request" may be the same thing or three different things,
   depending on which website the resident found.

## Why it persists

The knowledge required to answer "who owns this?" exists. It is simply never retained.

Every resident and every frontline worker re-derives the answer from scratch, one call
at a time, thousands of times a year. The resident who finally learns that their drain
belongs to the county hangs up, and that answer disappears. The staff member who
learned the same boundary by trial and error takes it with them when they leave the
job.

This is not a knowledge gap. It is a **knowledge leak**. The region solves this problem
correctly and completely every single day, and retains none of it. That is why effort
has not reduced the friction: the effort is real, and it evaporates on contact.

## What we are building

A **conversational front door** — web chat only in the frozen MVP — where a resident
describes a problem in plain language and selects a clearly synthetic demo location.
SMS is a roadmap item, not a deliverable.

The Navigator returns a **handoff card**, not an answer:

- The **most likely responsible entity**, with an explicit confidence level
- The **evidence** behind that routing, with a link to the authoritative public source
  and the date it was checked
- **Competing or overlapping claims**, named — where two entities may both have a claim,
  the resident is told so rather than shielded from it
- **What remains unknown**, stated plainly
- The **next concrete action**: the correct office, channel, and what to say
- **What to say** — one line the resident can read aloud, so they are not re-explaining
  the problem from scratch

Uncertainty is displayed, not hidden. The card is designed to be shown to a public
employee, who remains the person who confirms responsibility and acts.

Every unresolved lookup is written to a **gap register** — a running record of the
places where ownership is genuinely undefined between jurisdictions. The resident-facing
tool produces this as a byproduct. It is the artifact a regional body or a mayor's
office would actually want, and no one is currently collecting it.

## Measurable outcome

**Primary:** first-contact routing accuracy — the share of test cases routed to the
correct responsible entity on the first attempt, scored against a human-reviewed answer
key across a fixed set of cases spanning at least three jurisdictions.

**Pilot metric:** the misrouted-contact rate at a partner intake desk before and after
residents are given the Navigator.

## Explicitly out of scope

- **Filing anything.** The Navigator does not submit tickets, service requests,
  referrals, or applications to any agency, live or synthetic. It routes a person; it
  does not act for them.
- **Legal determination of responsibility.** The Navigator reports what public sources
  say and how confident it is. It does not decide, and does not imply that any agency
  has reviewed, approved, or endorsed its routing.
- **Live status.** No queue positions, no capacity, no case tracking, no promise that
  an office is open right now.
- **Every public service.** One service domain — the public right-of-way and adjacent
  infrastructure — across a bounded set of jurisdictions. Not a regional portal.
- **Emergencies.** Anything urgent is routed immediately to 911 and the conversation
  ends there.
- **Personal data.** No names, no accounts, no stored contact information, no case
  histories tied to individuals.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A confident wrong answer sends a resident to the wrong office and costs them a second afternoon | Confidence is shown on every card, competing claims are named rather than resolved, and every card states that a public employee confirms before action |
| The tool is read as making a legal responsibility determination | Routing draws only from cited public sources, never from boundary geometry alone; the card shows its evidence and labels itself as guidance, not determination |
| Published source information is stale or contradicts another jurisdiction | Every knowledge-base claim carries a source URL and a `checked_on` date; contradictions surface in the card as a named conflict instead of being silently resolved |
| Synthetic test cases are mistaken for real residents or real agency records | All synthetic records carry `is_synthetic`, all fictional entities keep their "Fictional" prefix, and synthetic and real-sourced content never appear in the same claim |
| Channel work consumes build time the project cannot spare | Web chat is the only interface in the frozen MVP. SMS and other channels are documented as roadmap items and are not built before submission |
| The language model invents a plausible agency that does not exist | The model classifies the problem and writes the narrative; it never selects the responsible entity. Ownership is looked up from the cited knowledge base, and a lookup that misses returns "unknown" and a gap-register entry |

## Human review point

The Navigator produces a recommendation and stops. A **public employee at the receiving
office is the person who confirms responsibility and takes action.** No consequential
decision is made or executed by the system, and the handoff card says so on its face.

## Evidence still to attach

These claims are structural and defensible, but each needs a cited, date-stamped public
source before submission:

- The count of incorporated municipalities in Jefferson County
- The specific ownership split for each asset type in each jurisdiction in the knowledge base
- Each jurisdiction's authoritative intake channel and published service terminology
