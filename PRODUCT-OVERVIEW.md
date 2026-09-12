# ReadyBatch — Product Overview

**ReadyBatch** is a done-for-you 14-day content install for US small business owners, coaches, and agencies who already post — just not consistently.

It is **not** a course, retainership, or managed posting service. Buyers pay once, complete a short intake, and receive a Drive folder of usable assets within **48–72 hours** of intake complete.

Operator: **The Ambre Group** (Stripe account: 6Frame Studio / `acct_1TRFwqJVjV19Q08E`).

---

## Promise

In 48–72 hours after completed intake you get a usable 14-day content system: brand voice (Standard+), calendar, 10 ready-to-post pieces, posting SOP, and a simple ops board (Standard+) — delivered via Gmail + Google Drive.

**Guarantee:** If you don’t get a usable 14-day system within 72 hours of kickoff materials received (clock starts when intake is complete), full refund.

---

## Pricing tiers

| Tier | Price | What’s included |
|------|-------|-----------------|
| **Starter** | **$497** | 14-day content calendar · 10 ready-to-post pieces · Posting SOP · Delivery in 48–72h via Drive + Gmail |
| **Standard** *(most booked)* | **$997** | Everything in Starter · Brand voice doc · Notion/Docs ops board · 1 revision round · Delivery in 48–72h |
| **Done-with-you** | **$1,497** | Everything in Standard · 30-min kickoff call · 7-day async tweaks (Slack/email) · Kickoff within 24h of payment; pack within 48–72h after kickoff |

Same economics as the former “AI Content System Install” offer — renamed and branded as **ReadyBatch**.

---

## Deliverables (pack files)

| File | Starter | Standard | Done-with-you |
|------|---------|----------|---------------|
| `README-START-HERE.md` | yes | yes | yes |
| `00-intake.md` | yes | yes | yes |
| `01-brand-voice.md` | skip note | full | full |
| `02-calendar.md` | yes | yes | yes |
| `03-posts.md` (10 complete posts) | yes | yes | yes |
| `04-posting-sop.md` | yes | yes | yes |
| `05-ops-board.md` | skip note | full | full |

Platforms: copy is LinkedIn / X / IG-ready. Buyer picks a primary; tone is adapted per channel. **We do not post for the client.**

---

## Buyer journey

1. **Land** — Buyer opens the live offer page and chooses a tier.
2. **Pay** — Stripe Payment Link (live). After payment, Stripe redirects to the intake form with `?tier=…` preselected.
3. **Intake** — ~15 minutes: niche, offer, audience, tone, 3–5 reference links, CTA preference. Submits to `/api/intake`. **72h clock starts.**
4. **Build** — Operator/agent generates the pack (Python or Node generator), zips, uploads to Drive, emails walkthrough.
5. **Receive** — Drive folder + walkthrough email within 48–72h.
6. **Post** — Client (or VA) follows the SOP. Standard/DWY: one revision batch ≤48h. DWY: +7-day async tweaks.

No social posting by us. No Magic Outlook fulfillment path.

---

## Live URLs

| Asset | URL |
|-------|-----|
| **Offer / landing (production)** | https://platform-v2-production-0c06.up.railway.app |
| **Intake (Starter)** | https://platform-v2-production-0c06.up.railway.app/intake.html?tier=starter |
| **Intake (Standard)** | https://platform-v2-production-0c06.up.railway.app/intake.html?tier=standard |
| **Intake (Done-with-you)** | https://platform-v2-production-0c06.up.railway.app/intake.html?tier=dwy |
| **Stripe — Starter $497** | https://buy.stripe.com/5kQ14oc0T7Nbgze9NKbbG02 |
| **Stripe — Standard $997** | https://buy.stripe.com/5kQ8wQ8OHd7vbeU8JGbbG03 |
| **Stripe — Done-with-you $1,497** | https://buy.stripe.com/dRm14o5Cvebz82I7FCbbG04 |
| **Sample pack (review for Bret)** | https://drive.google.com/drive/folders/1WqArtPxD8ZuzMQKZ_XTje5b4TlLElghF |

Stripe Payment Link metadata: `offer=readybatch` + `tier=starter|standard|done-with-you` (livemode, `acct_1TRFwqJVjV19Q08E`). After-completion redirects already point at platform-v2 intake URLs above.

---

## Who it’s for / not for

**For:** Founders, coaches, and agency owners who post inconsistently; already have a brand or niche; want a system they can run weekly.

**Not for:** Managed posting forever; brands with no offer or audience yet; “make me viral” requests.

---

## Ops notes

- Repo / fulfillment code lives under `money-machine/` (and GitHub `bret1976/ai-content-system` for the public/deployed surface).
- Pack generator: `fulfillment/generate_pack.py` (Python) or `server/lib/generatePack.js` (Node fallback).
- Sample Starter pack for review: Drive folder above (Smoke Test Co).
- Product rename: external brand is **ReadyBatch**; legacy “AI Content System” strings should be cleaned from docs and client-facing copy.
