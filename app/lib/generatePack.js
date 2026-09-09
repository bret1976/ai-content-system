/**
 * Node fallback pack generator for AI Content System Install.
 * Writes real, intake-specific content (not lorem) under outDir.
 */
const fs = require('fs');
const path = require('path');

const PLATFORMS = { linkedin: 'LinkedIn', x: 'X (Twitter)', ig: 'Instagram' };
const TIERS = new Set(['starter', 'standard', 'dwy']);

function slugify(name) {
  return String(name || 'client')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'client';
}

function asArray(v) {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (v == null || v === '') return [];
  return String(v)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeIntake(raw) {
  const intake = { ...raw };
  intake.sample_links = asArray(intake.sample_links);
  intake.tone_keywords = asArray(intake.tone_keywords);
  intake.tier = String(intake.tier || '').toLowerCase();
  intake.primary_platform = String(intake.primary_platform || '').toLowerCase();
  return intake;
}

function validate(intake) {
  const required = [
    'client_name',
    'email',
    'niche',
    'offer',
    'icp',
    'primary_platform',
    'sample_links',
    'tone_keywords',
    'cta_preference',
    'tier',
  ];
  const errs = [];
  for (const k of required) {
    const v = intake[k];
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
      errs.push(`missing required field: ${k}`);
    }
  }
  if (intake.primary_platform && !(intake.primary_platform in PLATFORMS)) {
    errs.push('primary_platform must be linkedin|x|ig');
  }
  if (intake.tier && !TIERS.has(intake.tier)) {
    errs.push('tier must be starter|standard|dwy');
  }
  return errs;
}

function platformLabel(p) {
  return PLATFORMS[p] || p;
}

function offerShort(intake) {
  return String(intake.offer).split('—')[0].split(' - ')[0].trim();
}

function softCta(intake) {
  const cta = String(intake.cta_preference);
  const lower = cta.toLowerCase();
  if (/calendly|book|call/.test(lower)) {
    return 'If this is you, book a short Fit Call — link in comments / profile.';
  }
  if (/reply/.test(lower)) return 'Reply with the one word that fits — I\'ll send next steps.';
  if (/freebie|download/.test(lower)) return 'Comment FREEBIE and I\'ll send it.';
  if (/\bdm\b/.test(lower)) return 'DM me the keyword and I\'ll send next steps.';
  return cta.split('—')[0].trim().slice(0, 140);
}

function hardCta(intake) {
  const short = offerShort(intake);
  const lower = String(intake.cta_preference).toLowerCase();
  if (/call|calendly/.test(lower)) {
    return `Ready for ${short}? Book the Fit Call this week — spots are capped.`;
  }
  return `Ready to move on ${short}? ${String(intake.cta_preference).split('—')[0].trim()}`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, String(content).replace(/\s+$/, '') + '\n', 'utf8');
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function weekday(d) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
}

function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function nicheLead(niche) {
  const s = String(niche);
  if (s.includes(' who ')) return s.split(' who ')[0].trim();
  return s;
}

function icpLead(icp) {
  return String(icp).split('.')[0].trim();
}

function calendarPlan(intake) {
  const soft = softCta(intake);
  const hard = hardCta(intake);
  const short = offerShort(intake);
  return [
    ['Pain / mirror', 'Name the bottleneck without shaming the reader', soft, true],
    ['Proof / story', 'A concrete week-in-the-life story from your world', soft, true],
    ['Framework', 'A simple 2×2 or checklist they can steal today', soft, false],
    ['Myth bust', 'Kill one popular “fix” that keeps them stuck', soft, true],
    ['Soft offer', `Who ${short} is (and isn’t) for`, soft, true],
    ['Operator tip', 'One weekly habit that protects deep work', soft, false],
    ['Pattern', 'Pattern-level proof — no fake names or metrics', soft, true],
    ['Pain deepen', 'Cost of staying the default decision-maker', soft, true],
    ['How-to', 'A 30-minute Sunday / Monday reset ritual', soft, true],
    ['Hard offer', `Friday CTA — ${short}`, hard, true],
    ['Mindset+ops', 'Slower for two weeks, then faster forever', soft, false],
    ['Checklist', 'Escape checklist (5 concrete checks)', soft, true],
    ['Objection', '“I don’t have time” — honest reframe', soft, true],
    ['Close week', 'Recap + hard CTA: start next week with a rhythm', hard, true],
  ];
}

function calendarRows(intake, start) {
  const plat = platformLabel(intake.primary_platform);
  const plan = calendarPlan(intake);
  return plan.map((row, i) => {
    const [theme, hook, cta, hasPost] = row;
    const d = addDays(start, i);
    const fullPost = hasPost && i < 10;
    return {
      day: i + 1,
      date: isoDate(d),
      weekday: weekday(d),
      platform: plat,
      theme,
      hook,
      cta,
      status: fullPost
        ? 'Drafted in 03-posts'
        : hasPost
          ? 'Outline — expand week 2'
          : 'Calendar only',
      post_id: fullPost ? String(i + 1).padStart(2, '0') : '—',
    };
  });
}

function buildPosts(intake) {
  const soft = softCta(intake);
  const hard = hardCta(intake);
  const short = offerShort(intake);
  const niche = nicheLead(intake.niche);
  const tones = intake.tone_keywords.join(', ');
  const icpBit = icpLead(intake.icp);

  return [
    {
      title: 'The bottleneck with a title',
      hook: 'If every meaningful decision still routes through you, you don’t have a team — you have a queue waiting on your reply.',
      body: `If every meaningful decision still routes through you, you don’t have a team — you have a queue waiting on your reply.

I work with people in ${niche} — usually right when the calendar has quietly become a confession.

Same pattern:
• Hiring / sales / delivery still needs “one more look from me”
• Direct reports escalate preference questions instead of deciding
• Deep work only happens after 9pm (if at all)

You’re not lazy. You’re the default decision-maker. The org learned that from you.

This week, pick one domain and write a one-page decision rule: what they can approve without you.

Not a vibe. A rule.

${soft}`,
      cta: soft,
      hashtags: '#Founders #Leadership #Operators',
      notes: `${platformLabel(intake.primary_platform)}: native text, line breaks as written. Put booking links in first comment / last beat.`,
    },
    {
      title: 'Calendar audit story',
      hook: 'Color-code last week. Red = only you. Yellow = should’ve been delegated. Green = actual leverage.',
      body: `I asked a client in ${niche} to color-code last week.

Red = only they could do it.
Yellow = should have been someone else’s.
Green = actual leverage work.

Most calendars come back majority yellow — not because the team is weak, but because decision rights never moved with the tasks.

The fix wasn’t another productivity app. It was a 45-minute audit + three decision rights transferred in writing.

If your week looks mostly yellow, you don’t need more hours. You need fewer default routes to you.

${soft}`,
      cta: soft,
      hashtags: '#TimeManagement #CEO #Productivity',
      notes: 'Optional carousel later: Red/Yellow/Green legend. Keep stories anonymized.',
    },
    {
      title: 'Decision rights vs task handoff',
      hook: 'Delegation fails when you hand off the task but keep the decision rights.',
      body: `Delegation fails when you hand off the task but keep the decision rights.

Simple 2×2:

1. **Task + rights with you** → you’re the bottleneck (honest baseline)
2. **Task with them, rights with you** → fake delegation (most common failure)
3. **Task + rights with them, you as exception path** → real leverage
4. **Neither with anyone** → chaos (fix this first)

Most “I hired people but I’m still drowning” stories live in box 2.

This week: move one recurring decision from box 2 → box 3. Write the rule. Tell the team out loud. Sit on your hands for 10 business days unless the exception path triggers.

That’s an operating install — not a motivational quote.

${soft}`,
      cta: soft,
      hashtags: '#Delegation #Operations #Systems',
      notes: 'Strong save/share post. Consider pinning for 48h.',
    },
    {
      title: 'The “hire help” myth',
      hook: 'Hiring help won’t fix a founder who is still the company’s preference engine.',
      body: `Hiring help won’t fix a founder who is still the company’s preference engine.

An EA or ops hire can protect the calendar. They cannot invent decision rights you refuse to give away.

If every meaningful call still needs your gut — and every hire still needs your final vibe-check — you’ve bought inbox zero, not leverage.

What actually moves the needle for ${icpBit}:
• Written decision rules for 2–3 domains
• A weekly operating rhythm (same meetings, same prep, same exits)
• Accountability that isn’t “I’ll try to delegate more”

Tools help. Rights first.

Tone for this pack: ${tones}.

${soft}`,
      cta: soft,
      hashtags: '#Scaling #Operations #FounderLife',
      notes: 'Engage comments respectfully; point back to decision rights.',
    },
    {
      title: `Who ${short} is for`,
      hook: `${short} is not for people who want a cheerleader. It’s for operators who want a rhythm that sticks.`,
      body: `${short} is not for people who want a cheerleader.

**Offer (clean):** ${intake.offer}

**It’s for you if:**
• You already have demand / an audience — but posting (or operating) is inconsistent
• You’re tired of being the bottleneck in ${niche}
• You want calendars, rules, and accountability — not fluff

**It’s not for you if:**
• You want someone to “make you viral”
• You don’t have an offer yet
• You’re shopping for tactics without a system

If that sounds like a fit, the next step is a short Fit Call — not a pitch deck marathon.

${soft}`,
      cta: soft,
      hashtags: '#Offer #Coaching #Operators',
      notes: 'Soft offer day. Mention offer by name once. Link in comment.',
    },
    {
      title: 'One meeting that protects focus',
      hook: 'Steal this: a 35-minute Monday “Decision & Drift” meeting that kills midweek preference ping-pong.',
      body: `Steal this: a 35-minute Monday **Decision & Drift** meeting.

Agenda (strict):
1. Open decisions needing you this week (max 5) — 10 min
2. Drifts from last week’s decision rules — 10 min
3. What you will *not* attend — 10 min
4. Confirm exception paths — 5 min

Rules:
• No status theater
• If it isn’t on the list, it waits or uses the written rule
• Reports prep a one-pager; no surprises in the room

Run it for 4 weeks. The org learns when preference questions get answered — and your midweek interrupts drop.

Small rhythm. Outsized calm.

${soft}`,
      cta: soft,
      hashtags: '#MeetingHygiene #Focus #CEOHabits',
      notes: 'Tactical post — high save potential.',
    },
    {
      title: 'Pattern — quality control layer',
      hook: 'Pattern I see: the founder is still the quality-control layer for work they already staffed.',
      body: `Pattern I see with ${icpBit}:

The org hired specialists. The founder is still the quality-control layer.

Not because people are incompetent — because “good” was never defined in writing. So every output orbits the founder’s taste.

Symptoms:
• Rewriting decks the night before
• Re-opening closed loops
• Working sessions that are really preference sessions

Intervention that works (no fake case-study names): define “done” and “decide” for two domains. Review weekly for a month. Then stop attending the working sessions — only the exception path.

That’s the difference between a team and a mirror.

${soft}`,
      cta: soft,
      hashtags: '#FounderBottleneck #Systems #Growth',
      notes: 'No fabricated testimonials. Keep pattern-level.',
    },
    {
      title: 'Cost of default attendance',
      hook: 'Being in every call feels like leadership. It’s often unpaid QA with a title.',
      body: `Being in every call feels like leadership. It’s often unpaid QA with a title.

Cost stack (honest):
• Your deep work blocks evaporate
• The team learns to defer taste upward
• The roadmap becomes a negotiation with your mood that day

I’m not anti-involvement. I’m anti-default attendance.

Try this for two weeks: attend only decision gates (scope kill, pricing change, major bet). Everything else: written brief + async comment window.

If quality drops, you don’t need more meetings — you need clearer standards.
If quality holds, you just bought back hours.

${soft}`,
      cta: soft,
      hashtags: '#Leadership #FounderTime #Focus',
      notes: 'Good debate post — reply with the decision-gate frame.',
    },
    {
      title: '30-minute reset ritual',
      hook: 'A 30-minute weekly reset that makes Monday stop starting in chaos.',
      body: `A 30-minute weekly reset that makes Monday stop starting in chaos.

Timer on. No inbox.

**Minute 0–10 — Calendar confession**
Color last week: red / yellow / green (only-you / should-delegate / leverage). Note the yellow pile.

**Minute 10–20 — Decision rights**
Pick one yellow pattern. Write a 5-line rule: who decides, what’s in bounds, exception path to you.

**Minute 20–30 — Week design**
Block two deep-work sessions. Put Decision & Drift on Monday. Remove one meeting you attend out of habit.

That’s it. No journaling marathon.

Operators don’t need more inspiration. They need a repeatable install.

${soft}`,
      cta: soft,
      hashtags: '#WeeklyReset #Routine #Productivity',
      notes: 'Carousel-friendly later. Keep text-first for LinkedIn.',
    },
    {
      title: `Friday — ${short}`,
      hook: `If you’ve been nodding along all week: ${short} is the install — rhythm, rules, accountability.`,
      body: `If you’ve been nodding along all week, here’s the direct version.

${intake.offer}

We install (or help you install):
• A weekly operating / content rhythm you actually run
• Decision rules so the team stops pinging you for preference
• Accountability that isn’t “try harder”

Not a course dump. Not “go viral” theater.

If that’s the problem you’re actually trying to solve:

${hard}`,
      cta: hard,
      hashtags: '#Offer #FitCall #Operators',
      notes: 'HARD CTA day. Pin comment with booking link. Do not stack fake scarcity.',
    },
  ];
}

function adaptForPlatform(post, platform) {
  const out = { ...post };
  if (platform === 'x') {
    const parts = post.body.split(/\n\n+/);
    out.x_thread = [
      post.hook.slice(0, 240),
      'Thread: the operating fix (not mindset) ↓',
      (parts[1] || parts[0] || '').slice(0, 240),
      post.cta.slice(0, 240),
    ];
    out.notes = `${post.notes || ''} | X: post as 4-beat thread; keep links in last tweet or reply.`;
  } else if (platform === 'ig') {
    out.notes = `${post.notes || ''} | IG: use hook as first line before “more”; pair with simple text graphic; CTA in caption + story link sticker if available.`;
  }
  return out;
}

function renderIntakeMd(intake, start) {
  const links = intake.sample_links.map((u) => `- ${u}`).join('\n');
  const tones = intake.tone_keywords.join(', ');
  const notes = intake.notes || '_None_';
  const handle = intake.handle || '_not provided_';
  return `# 00 — Intake (locked)

**Client:** ${intake.client_name}  
**Email:** ${intake.email}  
**Handle:** ${handle}  
**Tier:** \`${intake.tier}\`  
**Primary platform:** ${platformLabel(intake.primary_platform)}  
**Pack start date:** ${isoDate(start)} (Day 1)  
**Clock:** 72h guarantee starts when this intake was marked complete.

---

## Niche
${intake.niche}

## Offer
${intake.offer}

## ICP
${intake.icp}

## Tone keywords
${tones}

## CTA preference
${intake.cta_preference}

## Sample links / references
${links}

## Notes
${notes}

---
*Do not invent testimonials, revenue, or client logos. Adapt copy to this intake only.*
`;
}

function renderBrandVoice(intake) {
  const tones = intake.tone_keywords.join(', ');
  const short = offerShort(intake);
  const offerRest = String(intake.offer).includes('—')
    ? String(intake.offer).split('—').slice(1).join('—').trim()
    : intake.offer;
  return `# 01 — Brand voice

**For:** ${intake.client_name}  
**Platform focus:** ${platformLabel(intake.primary_platform)}

## Positioning one-liner
${intake.client_name} helps ${icpLead(intake.icp).toLowerCase()} get a usable system so they stop winging consistency — without guru theater.

## Who we speak to
${intake.icp}

## What we sell (say it cleanly)
**${short}** — ${offerRest}

## Tone rules
Keywords from intake: **${tones}**.

1. Talk like a peer operator, not a guru. Short paragraphs. Numbers beat adjectives.
2. Name the bottleneck specifically — never “crush your goals.”
3. One idea per post. End with a clear next step matching CTA preference.
4. Light wry humor is OK; sarcasm at the reader’s expense is not.
5. Never fabricate metrics, case studies, or “clients made $X.”

## Do
- Use concrete weekly rhythms, decision rules, calendar audits
- Soft CTAs most days; hard CTA on Fridays / offer posts
- Reference ${short} by name 3–4× across a 2-week pack — not every post
- Match sample-link energy from intake references

## Don’t
- “10x”, “hustle”, “crush it”, “scale to the moon”
- Fake urgency unless inventory is real
- Generic bro openers (“I used to be broke…”)
- Mindset-only advice with no operating artifact

## Banned phrases
crush it · 10x your · hustle harder · passive income · overnight · guru · secret sauce · “just vibe”

## Sample lines (on-voice)
1. “If every hiring decision still routes through you, you don’t have a team — you have an expensive todo list with faces.”
2. “Delegation fails when you hand off tasks but keep the decision rights. Fix the rights first.”
3. “Your calendar is a confession. Mine said ‘founder as default firefighter’ for months.”
4. “We don’t need another vision board. We need a weekly rhythm you actually run.”
5. “${short} isn’t motivation. It’s an install: rhythm, rules, accountability.”

## CTA voice
Preference: ${intake.cta_preference}

Soft (default): ${softCta(intake)}  
Hard (offer days): ${hardCta(intake)}
`;
}

function renderCalendar(intake, start) {
  const rows = calendarRows(intake, start);
  const short = offerShort(intake);
  const lines = [
    `# 02 — 14-day content calendar`,
    ``,
    `**Client:** ${intake.client_name}  `,
    `**Primary platform:** ${platformLabel(intake.primary_platform)}  `,
    `**Day 1:** ${isoDate(start)}  `,
    `**Offer spine:** ${short}`,
    ``,
    `Cycle: pain → proof → framework → soft offer → hard CTA. Posts 01–10 are fully written in \`03-posts.md\`. Days without a full post still have a hook you can expand.`,
    ``,
    `| Day | Date | Dow | Platform | Theme | Hook / angle | CTA | Post | Status |`,
    `|-----|------|-----|----------|-------|--------------|-----|------|--------|`,
  ];
  for (const r of rows) {
    const cta = r.cta.length > 48 ? r.cta.slice(0, 48) + '…' : r.cta;
    lines.push(
      `| ${r.day} | ${r.date} | ${r.weekday} | ${r.platform} | ${r.theme} | ${r.hook} | ${cta} | ${r.post_id} | ${r.status} |`
    );
  }
  lines.push(
    ``,
    `## Week 1 focus`,
    `Establish the bottleneck diagnosis + one usable framework. Soft CTAs only until Day 10.`,
    ``,
    `## Week 2 focus`,
    `Deepen cost of status quo, handle objections, close with Fit Call CTA.`,
    ``,
    `## Notes`,
    `- Adapt length to ${platformLabel(intake.primary_platform)} norms (see SOP).`,
    `- Do not invent case-study names. Use patterns and first-person operator stories.`,
    `- Tone: ${intake.tone_keywords.join(', ')}.`
  );
  return lines.join('\n');
}

function renderPosts(intake) {
  const platform = intake.primary_platform;
  const raw = buildPosts(intake);
  const lines = [
    `# 03 — 10 ready-to-post pieces`,
    ``,
    `**Client:** ${intake.client_name}  `,
    `**Primary platform:** ${platformLabel(platform)}  `,
    `**Tone:** ${intake.tone_keywords.join(', ')}  `,
    ``,
    `Each piece is complete copy — not an outline. Paste, light-edit if needed, post. CTAs match intake preference.`,
    ``,
    `---`,
    ``,
  ];
  raw.forEach((p0, idx) => {
    const i = idx + 1;
    const p = adaptForPlatform(p0, platform);
    lines.push(`## Post ${String(i).padStart(2, '0')} — ${p.title}`);
    lines.push('');
    lines.push(`**Hook:** ${p.hook}`);
    lines.push('');
    lines.push('### Copy (ready to post)');
    lines.push('');
    lines.push(p.body.trim());
    lines.push('');
    lines.push(`**CTA:** ${p.cta}`);
    lines.push(`**Hashtags (optional):** ${p.hashtags}`);
    lines.push(`**Platform notes:** ${p.notes}`);
    if (platform === 'x' && p.x_thread) {
      lines.push('');
      lines.push('### X thread beats');
      p.x_thread.forEach((beat, j) => lines.push(`${j + 1}. ${String(beat).trim()}`));
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push(
    '*Quality bar: specific to intake, no lorem, no fake metrics, offer named sparingly, usable as-is.*'
  );
  return lines.join('\n');
}

function renderSop(intake) {
  const plat = platformLabel(intake.primary_platform);
  const slug = intake.client_slug || slugify(intake.client_name);
  return `# 04 — Posting SOP

**Client:** ${intake.client_name}  
**Primary:** ${plat}  
**Cadence:** 5 posts/week from the 14-day calendar (prefer Tue–Fri + one Mon or Sun reset).  
**Owner:** you or your VA — this is an install, not managed posting.

---

## 1. Before you post (2 minutes)
- [ ] Open \`03-posts.md\` → correct post number
- [ ] Skim \`01-brand-voice.md\` do/don’t (Standard+)
- [ ] CTA matches today’s intent (soft vs Friday hard)
- [ ] No fabricated claims added while “improving” copy
- [ ] Link/Calendly in first comment (LinkedIn) or last beat (X) / sticker (IG)

## 2. Suggested windows (US audiences — directional, not gospel)
| Platform | Window A | Window B |
|----------|----------|----------|
| LinkedIn | Tue–Thu 8:00–10:00 local | Tue–Thu 12:00–13:30 |
| X | Weekdays 8:00–9:30 / 12:00–13:00 | Evenings 19:00–21:00 sparingly |
| IG | Weekdays 11:00–13:00 | Stories: morning + lunch |

Start with **${plat}**. Don’t multi-post identical copy everywhere on day one.

## 3. How to adapt without breaking voice
- Swap CTA only: keep body; replace final paragraph with soft ↔ hard from brand voice
- Shorten for X: use thread beats under each post when provided
- IG: hook = first line before fold; design = one idea, big type, dark/clean
- Never add “10x / crush it / hustle” — banned in brand voice

## 4. Engagement loop (10 min after posting)
1. Reply to every serious comment within 2 hours if possible
2. Do not argue taste; restate the operating point once
3. Log questions that repeat → future content ideas on ops board

## 5. VA checklist (copy/paste)
\`\`\`
[ ] Correct post from 03-posts
[ ] First comment = CTA link
[ ] Spelling pass
[ ] Screenshot saved to Drive /clients/${slug}/posted/
[ ] Ops board status → Scheduled → Posted
[ ] No edits that invent testimonials
\`\`\`

## 6. Revision rules (${intake.tier})
- **starter:** no revision round included — light typos OK to fix yourself
- **standard / dwy:** one batch of revision notes in a single email; ≤48h turnaround
- **dwy:** + 7-day async tweaks (copy + calendar swaps, not new offer strategy)

## 7. When stuck
Re-read intake ICP + tone keywords. If a draft drifts into guru-speak, cut adjectives and add one number or one rule.
`;
}

function renderOpsBoard(intake, start) {
  const rows = calendarRows(intake, start);
  const lines = [
    `# 05 — Ops board`,
    ``,
    `**Client:** ${intake.client_name}  `,
    `**Pipeline:** Idea → Draft → Approved → Scheduled → Posted  `,
    ``,
    `Paste into Notion or Google Sheets. Pre-loaded from this pack.`,
    ``,
    `| ID | Day | Date | Theme | Asset | Stage | Owner | Notes |`,
    `|----|-----|------|-------|-------|-------|-------|-------|`,
  ];
  for (const r of rows) {
    const asset = r.post_id !== '—' ? `Post ${r.post_id}` : 'Outline only';
    const stage = r.post_id !== '—' ? 'Draft' : 'Idea';
    lines.push(
      `| D${String(r.day).padStart(2, '0')} | ${r.day} | ${r.date} | ${r.theme} | ${asset} | ${stage} | ${intake.client_name} | ${r.hook.slice(0, 40)} |`
    );
  }
  lines.push(
    ``,
    `## Stages legend`,
    `- **Idea** — hook only`,
    `- **Draft** — full copy in 03-posts (or drafted later)`,
    `- **Approved** — client signed off (after revision if any)`,
    `- **Scheduled** — queued in native scheduler / Buffer / etc.`,
    `- **Posted** — live + screenshot archived`,
    ``,
    `## Weekly review (15 min)`,
    `1. Move Posted items to archive view`,
    `2. Promote 2 Ideas → Draft for the following week`,
    `3. Check CTA click/reply quality — not vanity likes alone`,
    ``,
    `*Tier \`${intake.tier}\` includes this board. Share edit or comment access as sold.*`
  );
  return lines.join('\n');
}

function renderStarterSkip(kind, intake) {
  if (kind === 'brand') {
    return `# 01 — Brand voice

**Skipped — Starter tier**

${intake.client_name} purchased **Starter** ($497). Brand voice doc is included on Standard and Done-with-you.

Tone keywords on file (use while posting): ${intake.tone_keywords.join(', ')}

Upgrade path: reply to your delivery email if you want Standard assets added (quote difference).
`;
  }
  return `# 05 — Ops board

**Skipped — Starter tier**

Ops board (Notion/Docs pipeline) is included on **Standard** and **Done-with-you**.

Use \`02-calendar.md\` + a simple spreadsheet if you want a lightweight tracker meanwhile.
`;
}

function renderReadme(intake, outDirName) {
  const tier = intake.tier;
  let included;
  const extras = [];
  if (tier === 'starter') {
    included = [
      '00-intake.md',
      '02-calendar.md',
      '03-posts.md',
      '04-posting-sop.md',
      '01 / 05 skipped (Starter)',
    ];
    extras.push('Starter: no revision round; post as written.');
  } else {
    included = [
      '00-intake.md',
      '01-brand-voice.md',
      '02-calendar.md',
      '03-posts.md',
      '04-posting-sop.md',
      '05-ops-board.md',
    ];
    if (tier === 'dwy') {
      extras.push(
        'DWY: 30-min kickoff already reflected in notes; 7-day async tweaks open from delivery date.'
      );
    } else {
      extras.push('Standard: 1 revision round — send one batch of notes by email.');
    }
  }
  const files = included.map((f) => `- \`${f}\``).join('\n');
  const extra = extras.map((e) => `- ${e}`).join('\n');
  return `# START HERE — ${intake.client_name}

Your **AI Content System Install** pack is ready.

## What's inside
${files}

## How to start (20 minutes)
1. Skim **04-posting-sop.md**
2. Read **01-brand-voice.md** (if included) — 5 minutes
3. Schedule **Week 1** from **02-calendar.md** using posts **01–05** in **03-posts.md**
4. Post with links in the first comment / last thread beat
5. Track status on **05-ops-board.md** (if included)

## Support
- Email: reply to your delivery thread (${intake.email} on file)
${extra}

## Guarantee
Usable 14-day system within 72 hours of completed intake — or full refund per offer terms.

— The Ambre Group / AI Content System Install  
Pack folder: \`${outDirName}\`
`;
}

/**
 * Generate a full client pack into outDir.
 * @param {object} rawIntake
 * @param {string} outDir absolute path
 * @returns {{ outDir: string, files: string[], engine: string }}
 */
function generatePack(rawIntake, outDir) {
  const intake = normalizeIntake(rawIntake);
  const errs = validate(intake);
  if (errs.length) {
    const err = new Error('Intake invalid:\n- ' + errs.join('\n- '));
    err.status = 400;
    throw err;
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  fs.mkdirSync(outDir, { recursive: true });

  writeFile(path.join(outDir, '00-intake.md'), renderIntakeMd(intake, start));

  if (intake.tier === 'starter') {
    writeFile(path.join(outDir, '01-brand-voice.md'), renderStarterSkip('brand', intake));
  } else {
    writeFile(path.join(outDir, '01-brand-voice.md'), renderBrandVoice(intake));
  }

  writeFile(path.join(outDir, '02-calendar.md'), renderCalendar(intake, start));
  writeFile(path.join(outDir, '03-posts.md'), renderPosts(intake));
  writeFile(path.join(outDir, '04-posting-sop.md'), renderSop(intake));

  if (intake.tier === 'starter') {
    writeFile(path.join(outDir, '05-ops-board.md'), renderStarterSkip('ops', intake));
  } else {
    writeFile(path.join(outDir, '05-ops-board.md'), renderOpsBoard(intake, start));
  }

  writeFile(
    path.join(outDir, 'README-START-HERE.md'),
    renderReadme(intake, path.basename(outDir))
  );
  writeFile(path.join(outDir, 'intake.json'), JSON.stringify(intake, null, 2));

  const files = fs.readdirSync(outDir).sort();
  return { outDir, files, engine: 'node-fallback' };
}

module.exports = {
  generatePack,
  normalizeIntake,
  validate,
  slugify,
  asArray,
};
