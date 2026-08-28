# Demo Script — CivicRoute BHM

**Run time: 4 minutes.** Presenter: Melina Stafford.

Before you start: `npm run dev`, browser at <http://localhost:3000>, a second tab on
`/api/gaps`. The demo works with or without `ANTHROPIC_API_KEY` — if the key is absent,
say so out loud, because the graceful degradation is a feature worth showing.

> ⚠️ **Rehearsal prerequisite.** This script describes the finished demo. As of 2026-08-28
> the handoff UI is not built and the API still speaks the older request shape, so the
> script is **not yet runnable end to end**. Do not rehearse against a live build until the
> UI gate and API gate in [integration-checklist.md](integration-checklist.md) are green.
> Until then this document is the target the lanes are building toward.

---

## 1 · The problem (35 seconds)

> A resident in Birmingham has a drain that backs up every hard rain. She calls the city.
> The city says it's county. She calls the county. The county says it's city. She calls the
> city back, gets a different person, and hears county again.
>
> Nobody on those calls is lying. Nobody on those calls actually knows.
>
> Jefferson County has dozens of incorporated municipalities. On one corner, the pavement,
> the drain under it, and the sidewalk beside it can have three different owners — and a
> Birmingham mailing address doesn't mean you live in Birmingham.
>
> Here's the part that matters: the region *solves* this problem correctly, thousands of
> times a year, and retains none of it. It isn't a knowledge gap. It's a knowledge leak.

---

## 2 · The Birmingham sidewalk case (50 seconds)

Type into the chat:

> **"The sidewalk is broken near my location"**

Select synthetic location **`BHM-DEMO-01` — City of Birmingham**.

> Note what I gave it: plain language, and a synthetic demo location. This build never
> takes a real resident address. Every location in the demo is fabricated and labeled.

Submit. Let the handoff card render.

---

## 3 · Read the card out loud (60 seconds) — **this is the centerpiece**

Point at each element in order. Do not rush this; the card *is* the product.

1. **The entity** — "Birmingham Department of Transportation. Note the wording: *likely
   responsible entity*. Not 'the responsible entity.'"

2. **The source and the checked date** — "Here's where that came from, and here's the day
   we last verified it. Every claim in this product carries provenance. Right now these
   are placeholder sources pending verification, and the card says so — that badge is the
   demo being honest with you, not a bug."

3. **The uncertainty** — "Confidence: medium. And a named conflict: sidewalk repair may
   fall to the adjoining property owner. Most tools would hide that to look cleaner. We
   surface it, because the ambiguity is the thing the resident actually needs to know."

4. **The contact channel** — "A phone number, from the cited record. Worth saying clearly:
   the language model classified the problem. It did not pick this office and it did not
   write this number. Contacts come only from the cited warehouse — that makes a
   hallucinated phone number structurally impossible, not just unlikely."

5. **The human confirmation step** — "And the card requires this: call and ask them to
   confirm before you rely on it. The public employee who answers is the decision-maker.
   We produce a recommendation and stop."

Read the disclaimer verbatim:

> *This is a navigation aid, not a legal determination, and it does not submit a service
> request.*

---

## 4 · The county case — the mailing-address trap (45 seconds)

New message:

> **"The drain at the corner is blocked and floods every hard rain"**

Select **`BHM-DEMO-02` — unincorporated Jefferson County**.

> This location has a Birmingham-style mailing address. It is not inside any city. The
> resident would call Birmingham first, and Birmingham would be right to tell them no.
>
> We route it to Jefferson County Roads and Transportation — and we say *why*.

*(If time is short, `BHM-DEMO-03` — Homewood — is the alternate: a third jurisdiction with
its own intake, showing the warehouse isn't hardcoded to one city.)*

Then switch to the `/api/gaps` tab:

> Every lookup we can't resolve, and every one where two jurisdictions may both have a
> claim, is written here. This is the byproduct: a running list of the places where
> ownership in this region is genuinely undefined. Nobody is currently collecting that,
> and it's the artifact a mayor's office would actually want.

---

## 5 · Why the architecture matters (35 seconds)

> One warehouse of cited evidence, one retrieval layer, one API contract, one UI.
>
> The UI is a client of that contract, not the product. The same warehouse and the same
> API can serve a second channel — SMS, a phone tree, an intake desk's internal tool — and
> a second service family, without touching the evidence layer.
>
> We scoped down deliberately: one service family, three jurisdictions, four issue types.
> Everything else returns "not covered" rather than a guess.

---

## 6 · Limitations, stated first (25 seconds)

Do not let the judges find these. Say them.

> Honestly, here's what this is not:
>
> - **All contact data is synthetic.** Every number is in the reserved 555-01xx example
>   range. Nothing here reaches a real office yet. Verification is phase one of the pilot.
> - **We have no accuracy number.** We built the answer-key harness into the roadmap; we
>   have not scored it, so we don't claim it.
> - **The gap register resets on redeploy.** It's in memory.
> - **This is not 311** and it is not an official government service.
> - **It never submits anything.** It routes a person; it doesn't act for them.
>
> What we're claiming is narrow and we think it's real: for one service family in three
> jurisdictions, a resident gets a likely starting point, the evidence behind it, the
> uncertainty around it, and a human to confirm with — instead of a fourth phone call.

---

## Contingencies

| If | Do |
|---|---|
| No API key configured | Say it. "Classification falls back to deterministic keyword rules — the demo doesn't depend on the model being reachable." |
| Network is down | Same. Nothing in the three demo cases requires an outbound call. |
| A card renders wrong | Move to the next scenario; do not debug live. |
| Asked "is this 311?" | "No. It's not an official service, it isn't affiliated with any city, and it doesn't submit requests. It's a navigation aid that hands you off to the official channel." |
| Asked "are these real numbers?" | "No — reserved example numbers, deliberately. Verifying real contacts against official sources is the first 60 hours of the pilot." |
