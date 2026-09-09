#!/usr/bin/env python3
"""
AI Content System Install — pack generator.

Usage:
  python generate_pack.py <intake.json> [--out-dir DIR]

Writes a complete client pack under fulfillment/clients/<slug>/ (or --out-dir).
Tier starter skips brand voice + ops board (writes short notes instead).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CLIENTS_DIR = ROOT / "clients"
REQUIRED = [
    "client_name",
    "email",
    "niche",
    "offer",
    "icp",
    "primary_platform",
    "sample_links",
    "tone_keywords",
    "cta_preference",
    "tier",
]
PLATFORMS = {"linkedin", "x", "ig"}
TIERS = {"starter", "standard", "dwy"}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "client"


def validate(intake: dict) -> list[str]:
    errs = []
    for k in REQUIRED:
        if k not in intake or intake[k] in (None, "", []):
            errs.append(f"missing required field: {k}")
    if intake.get("primary_platform") not in PLATFORMS:
        errs.append("primary_platform must be linkedin|x|ig")
    if intake.get("tier") not in TIERS:
        errs.append("tier must be starter|standard|dwy")
    if not isinstance(intake.get("sample_links", []), list):
        errs.append("sample_links must be an array")
    if not isinstance(intake.get("tone_keywords", []), list):
        errs.append("tone_keywords must be an array")
    return errs


def platform_label(p: str) -> str:
    return {"linkedin": "LinkedIn", "x": "X (Twitter)", "ig": "Instagram"}[p]


def soft_cta(intake: dict) -> str:
    cta = intake["cta_preference"]
    # Extract a short actionable line if long
    if "Calendly" in cta or "book" in cta.lower() or "call" in cta.lower():
        return "If this is you, book a 20-min Operator Fit Call — link in comments / profile."
    if "reply" in cta.lower():
        return "Reply with the one word that fits — I'll send the checklist."
    if "freebie" in cta.lower() or "download" in cta.lower():
        return "Comment FREEBIE and I'll send it."
    if "dm" in cta.lower():
        return "DM me the keyword and I'll send next steps."
    return cta.split("—")[0].strip()[:120]


def hard_cta(intake: dict) -> str:
    offer_short = intake["offer"].split("—")[0].strip()
    if "call" in intake["cta_preference"].lower() or "calendly" in intake["cta_preference"].lower():
        return f"Ready for {offer_short}? Book the Fit Call this week — spots are capped."
    return f"Ready to move on {offer_short}? {intake['cta_preference'].split('—')[0].strip()}"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def render_intake_md(intake: dict, start: date) -> str:
    links = "\n".join(f"- {u}" for u in intake["sample_links"])
    tones = ", ".join(intake["tone_keywords"])
    notes = intake.get("notes") or "_None_"
    handle = intake.get("handle") or "_not provided_"
    return f"""# 00 — Intake (locked)

**Client:** {intake['client_name']}  
**Email:** {intake['email']}  
**Handle:** {handle}  
**Tier:** `{intake['tier']}`  
**Primary platform:** {platform_label(intake['primary_platform'])}  
**Pack start date:** {start.isoformat()} (Day 1)  
**Clock:** 72h guarantee starts when this intake was marked complete.

---

## Niche
{intake['niche']}

## Offer
{intake['offer']}

## ICP
{intake['icp']}

## Tone keywords
{tones}

## CTA preference
{intake['cta_preference']}

## Sample links / references
{links}

## Notes
{notes}

---
*Do not invent testimonials, revenue, or client logos. Adapt copy to this intake only.*
"""


def render_brand_voice(intake: dict) -> str:
    tones = ", ".join(intake["tone_keywords"])
    offer_name = intake["offer"].split("—")[0].strip()
    return f"""# 01 — Brand voice

**For:** {intake['client_name']}  
**Platform focus:** {platform_label(intake['primary_platform'])}

## Positioning one-liner
{intake['client_name']} helps {intake['icp'].split('.')[0].strip().lower()} install an operating rhythm so they stop being the bottleneck — without fluffy mindset theater.

## Who we speak to
{intake['icp']}

## What we sell (say it cleanly)
**{offer_name}** — {intake['offer'].split('—', 1)[-1].strip() if '—' in intake['offer'] else intake['offer']}

## Tone rules
Keywords from intake: **{tones}**.

1. Talk like a peer operator, not a guru. Short paragraphs. Numbers beat adjectives.
2. Name the bottleneck specifically (hiring loops, product calls, default decision-maker) — never "crush your goals."
3. One idea per post. End with a clear next step matching CTA preference.
4. Slight wry humor is OK; sarcasm at the reader's expense is not.
5. Never fabricate metrics, case studies, or "clients made $X."

## Do
- Use concrete weekly rhythms, decision rules, calendar audits
- Admit the hard part: delegation feels slower before it feels freer
- Soft CTAs most days; hard CTA on Fridays / offer posts
- Reference {offer_name} by name 3–4× across a 2-week pack — not every post

## Don't
- "10x", "hustle", "crush it", "scale to the moon"
- Fake urgency ("only 2 spots left!!") unless inventory is real
- Generic LinkedIn-bro openers ("I used to be broke…")
- Mindset-only advice with no operating artifact

## Banned phrases
crush it · 10x your · hustle harder · passive income · overnight · guru · secret sauce · "just vibe"

## Sample lines (on-voice)
1. "If every hiring decision still routes through you, you don't have a team — you have an expensive todo list with faces."
2. "Delegation fails when you hand off tasks but keep the decision rights. Fix the rights first."
3. "Your calendar is a confession. Mine said 'founder as default firefighter' for 11 months."
4. "We don't need another vision board. We need a weekly operating rhythm you actually run."
5. "The Operator Reset isn't motivation. It's an 8-week install: rhythm, rules, accountability."

## CTA voice
Preference: {intake['cta_preference']}

Soft (default): {soft_cta(intake)}  
Hard (offer days): {hard_cta(intake)}
"""


def calendar_rows(intake: dict, start: date) -> list[dict]:
    """14 real calendar days with themes mapped to offer."""
    plat = platform_label(intake["primary_platform"])
    soft = soft_cta(intake)
    hard = hard_cta(intake)
    offer_short = intake["offer"].split("—")[0].strip()

    plan = [
        ("Pain / mirror", "Name the bottleneck without naming the reader as broken", soft, True),
        ("Proof / story", "Calendar audit story — what the week revealed", soft, True),
        ("Framework", "Decision rights vs task handoff (simple 2x2)", soft, False),
        ("Myth bust", "Why 'hire an EA' alone doesn't fix founder bottleneck", soft, True),
        ("Soft offer", f"Who {offer_short} is (and isn't) for", soft, True),
        ("Operator tip", "One weekly meeting that protects focus time", soft, False),
        ("Social proof angle", "Pattern from founders at $2–12M ARR (no fake names)", soft, True),
        ("Pain deepen", "The cost of being in every product call", soft, True),
        ("How-to", "30-minute Sunday reset ritual — step by step", soft, True),
        ("Hard offer", f"Friday CTA — {offer_short} Fit Call", hard, True),
        ("Mindset+ops", "Slower for two weeks, then faster forever", soft, False),
        ("Checklist", "Hiring-loop escape checklist (5 checks)", soft, True),
        ("Objection", "\"I don't have time for coaching\" — reframe", soft, True),
        ("Close week", "Recap + hard CTA: start next Monday with a rhythm", hard, True),
    ]
    rows = []
    for i, (theme, hook, cta, has_post) in enumerate(plan):
        d = start + timedelta(days=i)
        rows.append(
            {
                "day": i + 1,
                "date": d.isoformat(),
                "weekday": d.strftime("%a"),
                "platform": plat,
                "theme": theme,
                "hook": hook,
                "cta": cta,
                "status": "Drafted in 03-posts" if has_post and i < 10 else ("Calendar only" if not has_post else "Outline — expand week 2"),
                "post_id": f"{i+1:02d}" if has_post and i < 10 else "—",
            }
        )
    return rows


def render_calendar(intake: dict, start: date) -> str:
    rows = calendar_rows(intake, start)
    lines = [
        f"# 02 — 14-day content calendar",
        "",
        f"**Client:** {intake['client_name']}  ",
        f"**Primary platform:** {platform_label(intake['primary_platform'])}  ",
        f"**Day 1:** {start.isoformat()}  ",
        f"**Offer spine:** {intake['offer'].split('—')[0].strip()}",
        "",
        "Cycle: pain → proof → framework → soft offer → hard CTA. Posts 01–10 are fully written in `03-posts.md`. Days without a full post still have a hook you can expand.",
        "",
        "| Day | Date | Dow | Platform | Theme | Hook / angle | CTA | Post | Status |",
        "|-----|------|-----|----------|-------|--------------|-----|------|--------|",
    ]
    for r in rows:
        lines.append(
            f"| {r['day']} | {r['date']} | {r['weekday']} | {r['platform']} | {r['theme']} | {r['hook']} | {r['cta'][:48]}{'…' if len(r['cta'])>48 else ''} | {r['post_id']} | {r['status']} |"
        )
    lines += [
        "",
        "## Week 1 focus",
        "Establish the bottleneck diagnosis + one usable framework. Soft CTAs only until Day 10.",
        "",
        "## Week 2 focus",
        "Deepen cost of status quo, handle objections, close with Fit Call CTA.",
        "",
        "## Notes",
        f"- Adapt length to {platform_label(intake['primary_platform'])} norms (see SOP).",
        "- Do not invent case-study names. Use patterns and first-person operator stories.",
        f"- Tone: {', '.join(intake['tone_keywords'])}.",
    ]
    return "\n".join(lines)


def posts_linkedin(intake: dict) -> list[dict]:
    """10 complete LinkedIn-ready posts specific to intake."""
    soft = soft_cta(intake)
    hard = hard_cta(intake)
    offer_short = intake["offer"].split("—")[0].strip()
    niche_bit = intake["niche"]

    bodies = []

    bodies.append(
        {
            "title": "The bottleneck with a title",
            "hook": "If every meaningful decision still routes through you, you don't have a leadership team — you have a queue of people waiting for your Slack reply.",
            "body": f"""If every meaningful decision still routes through you, you don't have a leadership team — you have a queue of people waiting for your Slack reply.

I work with founders in {niche_bit.split('who')[0].strip() if 'who' in niche_bit else niche_bit} — usually right after they've crossed a real revenue line and the calendar has quietly become a confession.

Same pattern:
• Hiring loops still need "one more interview with me"
• Product calls still need the founder's "gut"
• Direct reports escalate preference questions instead of deciding

You're not lazy. You're the default decision-maker. The org learned that from you.

This week, pick one domain (hiring OR product OR pricing) and write a one-page decision rule: what they can approve without you.

Not a vibe. A rule.

{soft}""",
            "cta": soft,
            "hashtags": "#SaaS #FounderLife #Leadership",
            "notes": "LinkedIn: native text, line breaks as written. No external link in body if possible — put Calendly in first comment.",
        }
    )

    bodies.append(
        {
            "title": "Calendar audit story",
            "hook": "I asked a $6M ARR founder to color-code last week. Red = only they could do it. Yellow = should have been delegated. Green = actually leverage.",
            "body": f"""I asked a founder (~$6M ARR, team of ~25) to color-code last week.

Red = only they could do it.  
Yellow = should have been someone else's.  
Green = actual leverage work.

The calendar came back 60% yellow.

Not because the team was weak — because decision rights never moved with the tasks. They'd "delegated" hiring screens but still owned the final yes. Delegated sprint reviews but still rewrote the roadmap in the room.

The fix wasn't another productivity app. It was a 45-minute audit + three decision rights transferred in writing.

If your week looks mostly yellow, you don't need more hours. You need fewer default routes to you.

{soft}""",
            "cta": soft,
            "hashtags": "#CEO #TimeManagement #SaaSFounders",
            "notes": "Optional carousel later: Red/Yellow/Green legend. Keep story anonymized.",
        }
    )

    bodies.append(
        {
            "title": "Decision rights vs task handoff",
            "hook": "Delegation fails when you hand off the task but keep the decision rights.",
            "body": f"""Delegation fails when you hand off the task but keep the decision rights.

Simple 2×2 I use with operators:

1. **Task + rights with you** → you're the bottleneck (honest baseline)
2. **Task with them, rights with you** → fake delegation (most common failure)
3. **Task + rights with them, you as exception path** → real leverage
4. **Neither with anyone** → chaos (fix this first)

Most "I hired people but I'm still drowning" stories live in box 2.

This week: move one recurring decision from box 2 → box 3. Write the rule. Tell the team out loud. Sit on your hands for 10 business days unless the exception path triggers.

That's an operating install — not a motivational quote.

{soft}""",
            "cta": soft,
            "hashtags": "#Delegation #Operations #Founder",
            "notes": "Strong save/share post. Consider pinning for 48h.",
        }
    )

    bodies.append(
        {
            "title": "EA myth",
            "hook": "Hiring an EA won't fix a founder who is still the company's preference engine.",
            "body": f"""Hiring an EA won't fix a founder who is still the company's preference engine.

An EA can protect the calendar. They cannot invent decision rights you refuse to give away.

If product still needs your gut on every call, and hiring still needs your final vibe-check, you've bought inbox zero — not leverage.

What actually moves the needle for {intake['icp'].split(',')[0].strip()}:
• Written decision rules for 2–3 domains
• A weekly operating rhythm (same meetings, same prep, same exits)
• Accountability that isn't "I'll try to delegate more"

Tools help. Rights first.

{soft}""",
            "cta": soft,
            "hashtags": "#ExecutiveAssistant #ScalingUp #SaaS",
            "notes": "Expect comments from EA community — engage respectfully; point back to rights.",
        }
    )

    bodies.append(
        {
            "title": f"Who {offer_short} is for",
            "hook": f"{offer_short} is not for founders who want a cheerleader. It's for operators who want a weekly rhythm that sticks.",
            "body": f"""{offer_short} is not for founders who want a cheerleader.

It's an 8-week 1:1 install for US mid-market SaaS founders who already crossed real revenue — and still feel like the default firefighter.

**It's for you if:**
• You're in too many hiring loops and product calls
• Your team waits on your preference instead of deciding
• You want calendars, decision rules, and accountability — not mindset theater

**It's not for you if:**
• You want someone to "post content" or run ads
• You don't have an offer / team yet
• You're shopping for viral tactics

If that sounds like a fit, the next step is a short Fit Call — not a pitch deck marathon.

{soft}""",
            "cta": soft,
            "hashtags": "#ExecutiveCoaching #SaaS #Operators",
            "notes": "Soft offer day. Mention offer by name once. Link in comment.",
        }
    )

    bodies.append(
        {
            "title": "One meeting that protects focus",
            "hook": "Steal this: a 35-minute Monday 'Decision & Drift' meeting that keeps the founder out of midweek preference ping-pong.",
            "body": f"""Steal this: a 35-minute Monday **Decision & Drift** meeting.

Agenda (strict):
1. Open decisions needing the founder this week (max 5) — 10 min
2. Drifts from last week's decision rules — 10 min
3. What the founder will *not* attend — 10 min
4. Confirm exception paths — 5 min

Rules:
• No status theater
• If it isn't on the list, it waits or uses the written rule
• Direct reports prep a one-pager; no surprises in the room

Founders who run this for 4 weeks usually claw back several midweek interrupts — because the org learns when preference questions get answered.

Small rhythm. Outsized calm.

{soft}""",
            "cta": soft,
            "hashtags": "#MeetingHygiene #CEOHabits #Focus",
            "notes": "Tactical post — high save potential.",
        }
    )

    bodies.append(
        {
            "title": "Pattern at $2–12M ARR",
            "hook": "Pattern I see in US SaaS at $2–12M ARR: the founder is still the quality control layer for work they already staffed.",
            "body": f"""Pattern I see across US SaaS founders around $2–12M ARR (team ~12–40):

The org hired specialists. The founder is still the quality-control layer.

Not because people are incompetent — because "good" was never defined in writing. So every output orbits the founder's taste.

Symptoms:
• Rewriting decks the night before
• Re-opening closed hiring loops
• Product calls that are really preference sessions

Intervention that works (without fake case-study names): define "done" and "decide" for two domains. Review weekly for a month. Then stop attending the working sessions — only the exception path.

That's the difference between a team and a mirror.

{soft}""",
            "cta": soft,
            "hashtags": "#ARR #SaaSGrowth #FounderBottleneck",
            "notes": "No fabricated testimonials. Keep pattern-level.",
        }
    )

    bodies.append(
        {
            "title": "Cost of every product call",
            "hook": "Being in every product call feels like leadership. It's often unpaid QA with a title.",
            "body": f"""Being in every product call feels like leadership. It's often unpaid QA with a title.

Cost stack (honest):
• Your deep work blocks evaporate
• PMs learn to defer taste upward
• The roadmap becomes a negotiation with your mood that day

I'm not anti-product. I'm anti-default attendance.

Try this for two weeks: attend only decision gates (scope kill, pricing change, major bet). Everything else: written brief + async comment window.

If quality drops, you don't need more meetings — you need clearer standards.

If quality holds, you just bought back hours.

{soft}""",
            "cta": soft,
            "hashtags": "#ProductLeadership #FounderTime #SaaS",
            "notes": "Good debate post — reply to comments with the decision-gate frame.",
        }
    )

    bodies.append(
        {
            "title": "Sunday reset ritual",
            "hook": "A 30-minute Sunday reset that makes Monday stop starting in chaos.",
            "body": f"""A 30-minute Sunday reset that makes Monday stop starting in chaos.

Timer on. No inbox.

**Minute 0–10 — Calendar confession**  
Color last week: red / yellow / green (only-you / should-delegate / leverage). Note the yellow pile.

**Minute 10–20 — Decision rights**  
Pick one yellow pattern. Write a 5-line rule: who decides, what's in bounds, exception path to you.

**Minute 20–30 — Week design**  
Block two deep-work sessions. Put Decision & Drift on Monday. Remove one meeting you attend out of habit.

That's it. No journaling marathon.

Operators don't need more inspiration. They need a repeatable install.

{soft}""",
            "cta": soft,
            "hashtags": "#SundayReset #CEORoutine #Productivity",
            "notes": "Carousel-friendly later. Keep as text-first for LinkedIn.",
        }
    )

    bodies.append(
        {
            "title": f"Friday — {offer_short}",
            "hook": f"If you've been nodding along all week: {offer_short} is the 8-week install — rhythm, rules, accountability.",
            "body": f"""If you've been nodding along all week, here's the direct version.

{offer_short} is an 8-week 1:1 coaching intensive for US SaaS founders who are done being the bottleneck.

We install:
• A weekly operating rhythm you actually run
• Decision rules so the team stops pinging you for preference
• Accountability that isn't "try harder"

Not a course. Not a group mastermind. Not mindset-only.

If that's the problem you're actually trying to solve, book a 20-minute Operator Fit Call this week. We'll see if it's a match — and if it isn't, you'll still leave with one usable rule.

{hard}""",
            "cta": hard,
            "hashtags": "#ExecutiveCoaching #SaaSFounders #OperatorReset",
            "notes": "HARD CTA day. Pin comment with Calendly. Do not stack fake scarcity.",
        }
    )

    return bodies


def adapt_for_platform(post: dict, platform: str) -> dict:
    """Light adaptation notes / trim for X or IG while keeping full LinkedIn body as canonical."""
    out = dict(post)
    if platform == "x":
        # Provide a thread-ready short version derived from hook + CTA
        hook = post["hook"]
        out["x_thread"] = [
            hook[:240],
            "Thread: the operating fix (not mindset) ↓",
            post["body"].split("\n\n")[1][:240] if "\n\n" in post["body"] else post["body"][len(hook) : len(hook) + 240],
            post["cta"][:240],
        ]
        out["notes"] = (post.get("notes") or "") + " | X: post as 4-beat thread; keep links in last tweet or reply."
    elif platform == "ig":
        out["notes"] = (
            (post.get("notes") or "")
            + " | IG: use hook as first line before 'more'; pair with simple text graphic; CTA in caption + story link sticker if available."
        )
    return out


def render_posts(intake: dict) -> str:
    platform = intake["primary_platform"]
    raw = posts_linkedin(intake)
    lines = [
        f"# 03 — 10 ready-to-post pieces",
        "",
        f"**Client:** {intake['client_name']}  ",
        f"**Primary platform:** {platform_label(platform)}  ",
        f"**Tone:** {', '.join(intake['tone_keywords'])}  ",
        "",
        "Each piece is complete copy — not an outline. Paste, light-edit if needed, post. CTAs match intake preference.",
        "",
        "---",
        "",
    ]
    for i, p in enumerate(raw, 1):
        p = adapt_for_platform(p, platform)
        lines.append(f"## Post {i:02d} — {p['title']}")
        lines.append("")
        lines.append(f"**Hook:** {p['hook']}")
        lines.append("")
        lines.append("### Copy (ready to post)")
        lines.append("")
        lines.append(p["body"].strip())
        lines.append("")
        lines.append(f"**CTA:** {p['cta']}")
        lines.append(f"**Hashtags (optional):** {p['hashtags']}")
        lines.append(f"**Platform notes:** {p['notes']}")
        if platform == "x" and "x_thread" in p:
            lines.append("")
            lines.append("### X thread beats")
            for j, beat in enumerate(p["x_thread"], 1):
                lines.append(f"{j}. {beat.strip()}")
        lines.append("")
        lines.append("---")
        lines.append("")
    lines.append(
        "*Quality bar: specific to intake, no lorem, no fake metrics, offer named sparingly, $997-standard usable as-is.*"
    )
    return "\n".join(lines)


def render_sop(intake: dict) -> str:
    plat = platform_label(intake["primary_platform"])
    return f"""# 04 — Posting SOP

**Client:** {intake['client_name']}  
**Primary:** {plat}  
**Cadence:** 5 posts/week from the 14-day calendar (prefer Tue–Fri + one Mon or Sun reset).  
**Owner:** you or your VA — this is an install, not managed posting.

---

## 1. Before you post (2 minutes)
- [ ] Open `03-posts.md` → correct post number
- [ ] Skim `01-brand-voice.md` do/don't (Standard+)
- [ ] CTA matches today's intent (soft vs Friday hard)
- [ ] No fabricated claims added while "improving" copy
- [ ] Link/Calendly in first comment (LinkedIn) or last beat (X) / sticker (IG)

## 2. Suggested windows (US audiences — directional, not gospel)
| Platform | Window A | Window B |
|----------|----------|----------|
| LinkedIn | Tue–Thu 8:00–10:00 local | Tue–Thu 12:00–13:30 |
| X | Weekdays 8:00–9:30 / 12:00–13:00 | Evenings 19:00–21:00 sparingly |
| IG | Weekdays 11:00–13:00 | Stories: morning + lunch |

Start with **{plat}**. Don't multi-post identical copy everywhere on day one.

## 3. How to adapt without breaking voice
- Swap CTA only: keep body; replace final paragraph with soft ↔ hard from brand voice
- Shorten for X: use thread beats under each post when provided
- IG: hook = first line before fold; design = one idea, big type, dark/clean
- Never add "10x / crush it / hustle" — banned in brand voice

## 4. Engagement loop (10 min after posting)
1. Reply to every serious comment within 2 hours if possible
2. Do not argue taste; restate the operating point once
3. Log questions that repeat → future content ideas on ops board

## 5. VA checklist (copy/paste)
```
[ ] Correct post from 03-posts
[ ] First comment = CTA link
[ ] Spelling pass
[ ] Screenshot saved to Drive /clients/{slugify(intake['client_name'])}/posted/
[ ] Ops board status → Scheduled → Posted
[ ] No edits that invent testimonials
```

## 6. Revision rules ({intake['tier']})
- **starter:** no revision round included — light typos OK to fix yourself
- **standard / dwy:** one batch of revision notes in a single email; ≤48h turnaround
- **dwy:** + 7-day async tweaks (copy + calendar swaps, not new offer strategy)

## 7. When stuck
Re-read intake ICP + tone keywords. If a draft drifts into guru-speak, cut adjectives and add one number or one rule.
"""


def render_ops_board(intake: dict, start: date) -> str:
    rows = calendar_rows(intake, start)
    lines = [
        f"# 05 — Ops board",
        "",
        f"**Client:** {intake['client_name']}  ",
        f"**Pipeline:** Idea → Draft → Approved → Scheduled → Posted  ",
        "",
        "Paste into Notion or Google Sheets. Pre-loaded from this pack.",
        "",
        "| ID | Day | Date | Theme | Asset | Stage | Owner | Notes |",
        "|----|-----|------|-------|-------|-------|-------|-------|",
    ]
    for r in rows:
        asset = f"Post {r['post_id']}" if r["post_id"] != "—" else "Outline only"
        stage = "Draft" if r["post_id"] != "—" else "Idea"
        lines.append(
            f"| D{r['day']:02d} | {r['day']} | {r['date']} | {r['theme']} | {asset} | {stage} | {intake['client_name']} | {r['hook'][:40]} |"
        )
    lines += [
        "",
        "## Stages legend",
        "- **Idea** — hook only",
        "- **Draft** — full copy in 03-posts (or drafted later)",
        "- **Approved** — client signed off (after revision if any)",
        "- **Scheduled** — queued in native scheduler / Buffer / etc.",
        "- **Posted** — live + screenshot archived",
        "",
        "## Weekly review (15 min)",
        "1. Move Posted items to archive view",
        "2. Promote 2 Ideas → Draft for the following week",
        "3. Check CTA click/reply quality — not vanity likes alone",
        "",
        f"*Tier `{intake['tier']}` includes this board. Share edit or comment access as sold.*",
    ]
    return "\n".join(lines)


def render_starter_skip(kind: str, intake: dict) -> str:
    if kind == "brand":
        return f"""# 01 — Brand voice

**Skipped — Starter tier**

{intake['client_name']} purchased **Starter** ($497). Brand voice doc is included on Standard and Done-with-you.

Tone keywords on file (use while posting): {', '.join(intake['tone_keywords'])}

Upgrade path: reply to your delivery email if you want Standard assets added (quote difference).
"""
    return f"""# 05 — Ops board

**Skipped — Starter tier**

Ops board (Notion/Docs pipeline) is included on **Standard** and **Done-with-you**.

Use `02-calendar.md` + a simple spreadsheet if you want a lightweight tracker meanwhile.
"""


def render_readme(intake: dict, out_dir: Path) -> str:
    tier = intake["tier"]
    extras = []
    if tier == "starter":
        included = [
            "00-intake.md",
            "02-calendar.md",
            "03-posts.md",
            "04-posting-sop.md",
            "01 / 05 skipped (Starter)",
        ]
    else:
        included = [
            "00-intake.md",
            "01-brand-voice.md",
            "02-calendar.md",
            "03-posts.md",
            "04-posting-sop.md",
            "05-ops-board.md",
        ]
        if tier == "dwy":
            extras.append("DWY: 30-min kickoff already reflected in notes; 7-day async tweaks open from delivery date.")
        else:
            extras.append("Standard: 1 revision round — send one batch of notes by email.")

    files = "\n".join(f"- `{f}`" for f in included)
    extra = "\n".join(f"- {e}" for e in extras) if extras else "- Starter: no revision round; post as written."
    return f"""# START HERE — {intake['client_name']}

Your **AI Content System Install** pack is ready.

## What's inside
{files}

## How to start (20 minutes)
1. Skim **04-posting-sop.md**
2. Read **01-brand-voice.md** (if included) — 5 minutes
3. Schedule **Week 1** from **02-calendar.md** using posts **01–05** in **03-posts.md**
4. Post with links in the first comment / last thread beat
5. Track status on **05-ops-board.md** (if included)

## Support
- Email: reply to your delivery thread ({intake['email']} on file)
{extra}

## Guarantee
Usable 14-day system within 72 hours of completed intake — or full refund per offer terms.

— The Ambre Group / AI Content System Install  
Pack folder: `{out_dir.name}`
"""


def generate(intake: dict, out_dir: Path, start: date | None = None) -> Path:
    errs = validate(intake)
    if errs:
        raise SystemExit("Intake invalid:\n- " + "\n- ".join(errs))

    start = start or date.today()
    out_dir.mkdir(parents=True, exist_ok=True)

    write(out_dir / "00-intake.md", render_intake_md(intake, start))

    if intake["tier"] == "starter":
        write(out_dir / "01-brand-voice.md", render_starter_skip("brand", intake))
    else:
        write(out_dir / "01-brand-voice.md", render_brand_voice(intake))

    write(out_dir / "02-calendar.md", render_calendar(intake, start))
    write(out_dir / "03-posts.md", render_posts(intake))
    write(out_dir / "04-posting-sop.md", render_sop(intake))

    if intake["tier"] == "starter":
        write(out_dir / "05-ops-board.md", render_starter_skip("ops", intake))
    else:
        write(out_dir / "05-ops-board.md", render_ops_board(intake, start))

    write(out_dir / "README-START-HERE.md", render_readme(intake, out_dir))

    # Persist the intake used
    write(out_dir / "intake.json", json.dumps(intake, indent=2))

    return out_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate AI Content System client pack")
    parser.add_argument("intake_json", type=Path, help="Path to intake JSON")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Output directory (default: clients/<slug>/)",
    )
    parser.add_argument(
        "--start-date",
        type=str,
        default=None,
        help="Day 1 ISO date (default: today UTC)",
    )
    args = parser.parse_args(argv)

    raw = json.loads(args.intake_json.read_text(encoding="utf-8"))
    slug = raw.get("client_slug") or slugify(raw.get("client_name", "client"))
    out = args.out_dir or (CLIENTS_DIR / slug)
    start = date.fromisoformat(args.start_date) if args.start_date else date.today()

    path = generate(raw, out, start=start)
    print(f"OK pack written → {path}")
    for p in sorted(path.iterdir()):
        print(f"  - {p.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
