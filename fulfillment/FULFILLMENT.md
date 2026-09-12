# FULFILLMENT — ReadyBatch

End-to-end playbook for the agent (and humans) fulfilling an order.  
**Do not push/deploy unless the operator asks.**

Production site (Railway): `https://platform-v2-production-0c06.up.railway.app`

---

## Stripe → intake redirect

Configure each Payment Link / Checkout Session `after_completion` (or success URL) to:

| Tier | Redirect |
|------|----------|
| Starter | `https://platform-v2-production-0c06.up.railway.app/intake.html?tier=starter` |
| Standard | `https://platform-v2-production-0c06.up.railway.app/intake.html?tier=standard` |
| Done-with-you | `https://platform-v2-production-0c06.up.railway.app/intake.html?tier=dwy` |

The intake page pre-selects `tier` from the query string. Submitting the form **POSTs** JSON to `/api/intake` (fields match `intake.schema.json`). If the API is down, the browser downloads a JSON backup with a `local_*` order id — email that file in manually.

---

## Happy path (agent)

1. **Payment** — Stripe fires; customer lands on `/intake.html?tier=…`.
2. **Intake** — Customer submits → `POST /api/intake` → order stored as `server/orders/ord_….json`, status `intake_received`. **72h clock starts.**
3. **Generate pack**
   ```bash
   curl -s -X POST https://platform-v2-production-0c06.up.railway.app/api/generate \
     -H 'content-type: application/json' \
     -d '{"order_id":"ord_…"}'
   ```
   Or locally:
   ```bash
   python3 fulfillment/generate_pack.py path/to/intake.json \
     --out-dir fulfillment/clients/<slug>/
   ```
   Result: complete pack under `fulfillment/clients/<slug>/` (see files below). Status → `pack_ready`.
4. **Zip**
   ```bash
   cd fulfillment/clients && zip -r ../<slug>.zip <slug>/
   ```
5. **Email via Gmail** — Send walkthrough + zip (or Drive link) using the delivery template below. To: intake email. Subject: `Your ReadyBatch pack is ready`.
6. **Drive (when connected)** — Upload pack folder to `Clients/<Client>/`, share with client email, paste folder link in the Gmail body. Until Drive MCP/OAuth is connected, attach the zip or host temporarily.
7. **Revisions** — Standard/DWY: one batch of notes, ≤48h. DWY: +7-day async tweaks. Then archive; mark order closed in sheet/orders JSON.

---

## Pack contents (per tier)

| File | Starter | Standard | DWY |
|------|---------|----------|-----|
| `README-START-HERE.md` | yes | yes | yes |
| `00-intake.md` | yes | yes | yes |
| `01-brand-voice.md` | skip note | full | full |
| `02-calendar.md` | yes | yes | yes |
| `03-posts.md` (10 complete posts) | yes | yes | yes |
| `04-posting-sop.md` | yes | yes | yes |
| `05-ops-board.md` | skip note | full | full |

Demo pack (prove we can produce what we sell):  
`fulfillment/clients/demo-acme-coaching/`

---

## API (server)

Run locally:

```bash
cd /workspace/money-machine
npm install --prefix server
PORT=3000 node server/index.js
# → http://localhost:3000/  and  /intake.html
```

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| POST | `/api/intake` | Store order from intake form |
| POST | `/api/generate` | `{ "order_id" }` → run `generate_pack.py` |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Order detail |
| static | `/`, `/intake.html` | `site/` |

Railway: use root `Dockerfile` (Node 20 + python3) or `Procfile` (`web: node server/index.js`) with root `npm start` / `postinstall` installing `server/` deps. Set `PORT` from Railway.

---

## Gmail delivery template

**Subject:** Your ReadyBatch pack is ready

Hi FirstName,

Your pack is ready (Drive link or zip attached).

Included for your tier:
- 14-day calendar + 10 ready-to-post pieces + posting SOP
- Brand voice + ops board (Standard / DWY)

Start here: open README-START-HERE.md → follow 04-posting-sop.md → schedule week 1 from 03-posts.md.

Standard/DWY: reply in one email with revision notes (one round).  
DWY: async tweaks open for 7 days from today.

Guarantee: delivered within 72h of intake.

— Bret / The Ambre Group

---

## QA before send

- [ ] Sounds like client (vs sample links / tone keywords)
- [ ] No fabricated metrics or testimonials
- [ ] CTAs match cta_preference
- [ ] Tier assets correct (Starter skips voice + ops)
- [ ] Order id recorded; status pack_ready → after email mark delivered

---

## Paths cheat sheet

```
/workspace/money-machine/
  site/index.html
  site/intake.html
  server/index.js
  server/orders/
  fulfillment/
    intake.schema.json
    demo-intake.json
    generate_pack.py
    FULFILLMENT.md
    clients/demo-acme-coaching/
  Dockerfile
  Procfile
  package.json
```
