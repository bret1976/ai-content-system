# Day 1–7 plan — ReadyBatch (owned offer)

Assumes: Stripe account ready, domain pointed (or ready to point), Gmail live.  
Path: **landing page + Stripe checkout + X/email outreach**. 

Times below are PT (America/Los_Angeles).

---

## Day 1 — Foundation live (aim: first outreach by EOD)

| Block (PT) | Work |
|------------|------|
| 9:00–10:00 | Confirm domain DNS; deploy `/workspace/money-machine/site/` to host (Vercel/Netlify/Cloudflare Pages or static host). |
| 10:00–11:30 | Stripe: 3 Products/Prices ($497 / $997 / $1,497). Create Payment Links. Paste into `index.html` replacing `stripe-link-starter`, `stripe-link-standard`, `stripe-link-dwy`. |
| 11:30–12:30 | Google Form intake (fields from delivery-sop). Link from thank-you / Stripe success URL or auto-email. |
| 12:30–13:00 | Order sheet: Client \| Tier \| Paid \| Intake \| Due \| Delivered \| Notes. |
| 13:00–14:00 | Lunch / buffer. |
| 14:00–15:30 | Publish landing; test one $497 Payment Link in test mode then live smoke ($1 or link preview). |
| 15:30–17:30 | **Outreach start:** build Day-1 target list from criteria (below). Send 10 X DMs/replies + 10 cold emails (templates in outreach-*.md). |
| 17:30–18:00 | Log sends; schedule Day 2 follow-ups. |

**Day-1 done when:** live URL + 3 working Stripe links + intake form + ≥10 outreach touches.

---

## Day 2 — Volume + proof assets

| Block | Work |
|-------|------|
| AM | 15 emails + 15 X touches (personalized). |
| Mid | Create **sample outline PDF/Doc** (redacted EXAMPLE calendar page) for “send details” replies — mark EXAMPLE. |
| PM | Reply to all interest same day. Draft brand-voice for a fictional EXAMPLE client as portfolio sample (label EXAMPLE). |
| EOD | Metric: replies, booked kickoffs, paid. |

---

## Day 3 — Follow-ups + first delivery dry-run

| Block | Work |
|-------|------|
| AM | Follow-up 1 on Day-1 emails; continue new outreach (10+10). |
| Mid | Full dry-run delivery on EXAMPLE client using delivery-sop (time yourself). Fix bottlenecks. |
| PM | If paid order: start real build immediately. Else: refine landing headline from reply language. |

---

## Day 4 — Conversion polish

| Block | Work |
|-------|------|
| AM | Outreach 10+10; prioritize warm replies. |
| Mid | Add FAQ + guarantee block check on live site; mobile pass. |
| PM | Stripe → email automation: payment receipt + intake link (Gmail template or Zapier/Make if available). |
| EOD | Pipeline review. |

---

## Day 5 — Authority posts (owned channels)

| Block | Work |
|-------|------|
| AM | Post on X + LinkedIn: “What’s in a 72h content install” (process, not fake results). |
| Mid | Outreach to agencies/coaches who engaged the post. |
| PM | Fulfill any orders; protect 72h SLA. |

---

## Day 6 — Follow-up 2 + upsell path

| Block | Work |
|-------|------|
| AM | Breakup/follow-up 2 on Day-1–2 threads still silent. |
| Mid | Soft upgrade script: Starter buyers → Standard (voice + board) as add-on email — only if asked or post-delivery. |
| PM | Delivery QA; collect permission for real testimonial (never fabricate). |

---

## Day 7 — Review & lock week 2

| Block | Work |
|-------|------|
| AM | Scorecard: visitors (if analytics), Stripe payments, reply rate, hours per delivery. |
| Mid | Kill weak subject lines; double down on best opener. |
| PM | Schedule week-2 outreach blocks; backlog of warm leads. |
| EOD | One improvement only (landing CTA, intake length, or SOP step). |

---

## Day-1 outreach target *criteria* (not a fake list)

Build a list of people who match **all** of:

1. **US-based** small business owner, coach, consultant, or boutique agency
2. **Active but inconsistent** on LinkedIn and/or X (posted in last 90 days, gaps visible)
3. **Clear offer** already (service, program, or agency retainer — not “figuring out niche”)
4. **Team ≤ ~20** or solo (decision-maker reachable)
5. **Public contact path**: email on site, or open DMs / replyable posts
6. **Not** enterprise brand managers, not “growth Twitter gurus” selling courses only

Sources to search (manual): LinkedIn search + their website contact; X lists in your niche; local Chamber / newsletter sponsors; your existing network.

**First 10 touches Day 1:** pick 10 who match the criteria above, personalize one observation each, use outreach-x.md #1 or #4 and email #1 or #3.

---

## Blockers to clear Day 1

- [ ] Domain DNS + HTTPS hosting
- [ ] Stripe live mode + 3 Payment Links wired in HTML
- [ ] Intake form URL on success path
- [ ] Drive template folder structure ready
- [ ] From-name / signature on Gmail (Bret / The Ambre Group)

If Stripe or domain delayed: host landing on subdomain/IP preview still OK; do not take live payments until Stripe links work — outreach can still book interest with “I’ll send checkout when you’re ready.”
