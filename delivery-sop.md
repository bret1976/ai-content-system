# Delivery SOP — AI Content System Install

Hands-off fulfillment using AI + Google Docs/Drive (+ Notion for Standard+). Target: usable pack in 48–72h after intake complete.

---

## 0. Triggers

| Event | Action |
|-------|--------|
| Stripe payment | Tag order in sheet; send intake form within 1h |
| Intake submitted | Start clock for 72h guarantee |
| Kickoff booked (DWY only) | Build after call notes filed |

**Clock start:** intake form complete (DWY: after kickoff notes saved).

---

## 1. Intake checklist (required before build)

- Niche / offer / ICP
- Primary platform (LinkedIn / X / IG)
- 3–5 example posts or URLs they like
- Tone keywords (e.g. direct, warm, technical)
- CTA preference (book call, freebie, reply, buy)
- Brand assets: logo optional; name + handle required
- Revision contact email

Store answers in Drive: `Clients/{{Client}}/00-intake.md`

---

## 2. Build sequence (AI-assisted)

Work folder: `Clients/{{Client}}/deliverables/`

### Step A — Brand voice doc (Standard / DWY; skip for Starter)
1. Prompt AI with intake + sample posts.
2. Output: positioning one-liner, audience, tone rules, do/don’t, 5 sample lines, banned phrases.
3. Save: `01-brand-voice.md` (or Doc).

### Step B — 14-day content calendar
1. Map themes to offer (pain → proof → offer → soft CTA cycle).
2. Columns: Day | Platform | Hook | Angle | CTA | Status
3. Save: `02-calendar.md`

### Step C — 10 ready-to-post pieces
1. Draft 10 posts aligned to calendar days 1–10 (or best 10 slots).
2. Format each: Hook / Body / CTA / Hashtags(optional) / Platform notes
3. Length: LinkedIn ~150–250 words; X thread or single; IG caption-ready.
4. Save: `03-posts.md` (numbered 01–10)

### Step D — Posting SOP
1. Cadence, best windows (suggest, don’t overclaim), reuse rules, VA checklist.
2. Include: how to swap CTA, how to crop for IG, when to ask for revision.
3. Save: `04-posting-sop.md`

### Step E — Ops board (Standard / DWY)
1. Notion or Docs table: Idea → Draft → Approved → Scheduled → Posted
2. Pre-load the 10 posts + remaining calendar slots as rows.
3. Share link with edit or comment access as sold.
4. Save link in `05-ops-board-link.txt`

### Step F — QA pass (before send)
- [ ] Sounds like client (spot-check vs samples)
- [ ] No fabricated claims / fake metrics
- [ ] CTAs match their offer
- [ ] All files in one Drive folder
- [ ] Tier matches payment (Starter vs Standard vs DWY)

---

## 3. Delivery email (template)

**Subject:** Your AI Content System Install is ready

Hi {{FirstName}},

Your pack is in Drive: {{FolderLink}}

Included:
- {{list per tier}}

How to start: open `04-posting-sop` → schedule week 1 from the calendar → paste posts as written; tweak only if needed.

{{If Standard/DWY:}} Reply with revision notes in one email (one round).  
{{If DWY:}} Async tweaks open for 7 days from today.

Guarantee met: delivered within 72h of intake.

— Bret

---

## 4. Revision / DWY async

- **1 revision (Standard/DWY):** single batch of notes; turnaround ≤48h.
- **DWY 7-day async:** email/Slack; scope = copy tweaks + calendar swaps, not new offer strategy.
- Out of scope → quote add-on or stop politely.

---

## 5. Tools stack (minimal)

- Stripe (payment + receipt)
- Google Form or Typeform (intake)
- Google Drive / Docs (delivery)
- Notion (ops board) optional
- Claude/ChatGPT/Cursor (drafting)
- Gmail (comms)
- Simple sheet: Client | Tier | Paid | Intake | Due | Delivered | Notes

---

## 6. SLA cheat sheet

| Tier | Kickoff | Due |
|------|---------|-----|
| Starter | — | 48–72h post-intake |
| Standard | — | 48–72h post-intake |
| DWY | ≤24h after pay | 48–72h post-kickoff |

Miss SLA → offer full refund per guarantee (document reason in sheet).

---

## 7. Hands-off rules

- Never start without intake.
- Never invent testimonials or revenue for the client’s posts.
- One Drive folder per client; no Slack spam mid-build unless DWY.
- After delivery + revision window: archive folder; mark “Closed” in sheet.
