# Myrtle365.com — UX Review #2: the features built since the first review

> **What was reviewed:** `ftv365/myrtle365` at `main` = `18fd010` — **35 commits** past the
> first review's baseline (`90fc668`). New user-facing surfaces since then: the FAN⇄TALENT
> mode toggle, show-day check-ins, RSVP party size, guest-list/attendance panels, global
> search, fan demographics on the account page, three-state ticketing, and Admin Pulse.
>
> **Method:** source read of every new route and component, plus the app rendered locally in
> Chromium (14 routes × desktop 1280 and phone 390) against a mocked backend. Claims about
> what data is or isn't used were verified by exhaustive grep across `src/` **and**
> `supabase/migrations/`, not inferred.
>
> **Scope note:** this review covers what is *new*. The eight items still open from review #1
> are listed at the end unchanged — they're tracked, not re-argued.

---

## The headline finding

### N1. The fan profile collects personal data for benefits that don't exist — HIGH

`/account` now asks every fan for **ZIP code, sex** (plus a self-describe field), **local-or-visiting
and the date their stay ends**, and **favourite genres**. Each field carries a specific,
present-tense promise:

| Field | What the form tells the fan |
|---|---|
| ZIP | *"Shows near you — and how far a venue's crowd travels."* |
| Local/visiting | *"Visitors get what's on during their stay; locals get the regular calendar."* |
| Here until | *"So we don't pitch you a show the week after you drive home."* |
| Genres | *"it sorts your Discover feed and keeps our emails to the music you actually want."* |
| All of it | *"we use it to … tell venues what their crowd looks like as a group."* |

**None of these is implemented.** `zip`, `sex`, `visitor_status`, `visiting_until`, and
`fav_genres` are parsed in `lib/account/profile-form.ts`, stored, and selected back into the
edit form — and **read by nothing else**. No query filters on them, no sort uses them, no email
references them, and `supabase/migrations/` contains no view, function, or RPC that aggregates
them; the only migration mentioning these columns is the one that created them
(`0065_fan_profile_details.sql`). Discover's filters are still tonight / weekend / town.

**Why this matters more than the "Tonight" gap in review #1.** That was a missing feature.
This is *sensitive personal data* — a person's sex, their home ZIP, and the dates they're away
from home — collected on the strength of four specific benefits, none of which the software
delivers. The asking is done unusually well (every field optional, "Rather not say" defaults, a
plain-English reason each, a self-describe option). That craft is exactly what makes the promises
persuasive, which is why the gap between them and the code is the problem.

The privacy policy's *"Counts, not names"* paragraph describes the same aggregate reporting.
Describing intended processing in a policy is normal and not itself wrong — but the account
form states it as something already happening.

**Fix — pick one, in this order:**
1. **Ship one consumer.** Genre-sorted Discover is the cheapest honest one: `fav_genres` is
   already stored, and `genres_text` (PR #169) makes matching trivial. That converts one promise
   into a fact this week.
2. **Move the rest to future tense** — "will help us point you at the right shows" — so the fan
   is opting into a roadmap rather than a service.
3. **Drop `sex` until something consumes it.** It's the highest-sensitivity and
   lowest-current-value of the four; collecting it for a report that doesn't exist is the
   weakest trade on the page.

---

## New findings

### N2. Ownership capabilities are silently gated behind the mode cookie — HIGH

`artists/[slug]/page.tsx:112` — `canConfirmShows = (Boolean(myBilling) && talentMode) || admin`.
The same `talentMode` gate sits on `/discover:366` and `/following:89`.

So an act owner browsing in **fan mode** visits their own act's page and the "confirm this show"
control **is not there** — no disabled state, no explanation. Whether they can administer their
own listing depends on a cookie set by a header toggle they may not remember flipping. The most
likely reading from the owner's side is "that feature is broken."

**Fix:** ownership is the real permission, not mode. Either drop `talentMode` from the condition,
or render the control disabled with *"Switch to Talent to confirm this show"* so the gate
explains itself.

### N3. The mode toggle always teleports, and never brings you back — MED

`lib/mode/actions.ts`: `switchToFan` → `/`, `switchToTalent` → `/talent/manage`, unconditionally.
It's a persistent header control styled as a view switch (FAN mint / TALENT coral), but it
behaves as navigation: tap it while reading an artist profile or working the Gig Board and you
lose your place, with no way back other than browser history. Switching back to FAN doesn't
return you either — it goes to the homepage.

**Fix:** stay on the current page when it exists in both modes, and reserve the jump for when
the current page has no talent-mode equivalent. Failing that, label the buttons with their
destination so the jump isn't a surprise.

### N4. A one-character search reports "Nothing matched" — MED

`isUsableTerm()` requires ≥2 characters, so `searchEverything` returns empty **without running a
query** — but `/search` only checks `total === 0` and renders *"Nothing matched "a"."*
(confirmed live). The user is told the Strand has nothing when the search never happened. This is
the same shape as the errors-rendering-as-empty problem from review #1.

**Fix:** distinguish the states — *"Type at least 2 characters."*

### N5. Search presents its caps as totals — MED

`LIMIT = 12` per group and 20 for shows, rendered as group headings: **"Talent (12)"**,
**"Coming up (20)"**. A fan reads that as *"there are twelve."* With a real roster it may be
sixty, and the twelve shown are alphabetical-within-verified, not "best."

**Fix:** `12+`, or "showing the first 12", or a "see all" link into the filtered directory.

### N6. Party size fires a server action on every arrow key — MED

`PartySizeSelect` calls `requestSubmit()` from the select's `onChange`. On a **closed** native
select, keyboard arrow keys change the value and fire `change` on each keypress — so a keyboard
user moving from "just me" to "+5 guests" submits the form six times, each one a server action
plus a `revalidatePath`. Mouse users are fine, which is why this is easy to miss.

**Fix:** submit on `blur`, or debounce the change handler.

### N7. Self-reported attendance is presented to venues as fact — MED

`checkInToShow` requires only that the show's `event_date` is today. No proximity check, no RSVP
prerequisite, no venue confirmation — anyone, anywhere, can tap "I'm here 🎉" for any show
running today. `AttendancePanel` then renders **"N coming · X% of cap"** in confident terms on the
venue and talent dashboards, and the component's own docstring frames it as what a venue plans a
night around.

The numbers are a reasonable *signal*; the presentation makes them a *count*. A venue staffing to
"87% of cap" deserves to know that figure is unverified RSVPs plus self-declared check-ins.

**Fix:** separate confirmed from self-reported in the rollup, or caveat the capacity percentage.

### N8. The homepage has become three consecutive stacks of near-identical cards — MED

Folding `/welcome` into home (review #1's N7) worked, but nothing re-composed the page. On a
390px phone it now runs **~3,700px**: hero → "For fans" (3 cards) → "Which are you?" (3 cards) →
"How it works" (3 numbered cards) → footer. Three 3-up card groups in a row, same rhythm, same
weight, so the eye stops distinguishing them and the audience trio — the one section that routes
talent and venues — reads as more of the same.

**Fix:** give the three sections different shapes (the audience trio as a row of links, "How it
works" as a compact numbered line), or cut one.

### N9. Small things — LOW

- **`AttendancePanel`**: the "Guest list" disclosure gives no count until you open it; and
  `requestLine()` renders "📍 Check-in" for one and "📍 Check-ins: 3" for many, so a single
  check-in reads as a label rather than a count.
- **`FanDetailsFields`**: "Here until *(visitors only)*" and the sex self-describe input are
  always visible and enabled regardless of the adjacent selection — a local sees a date field
  that does nothing.
- **`/search`**: when the sanitizer strips a query to nothing (e.g. `"..."`), the empty state
  falls back to echoing the raw input rather than the cleaned term.

---

## What got better since review #1

Worth recording, because several of these were direct fixes and they landed well:

- **`AvatarEditor`** — picking a photo now uploads immediately, and "Remove photo" is a real
  bordered button. Both were review #1 findings (the silently-lost photo and the destructive
  action styled as body text).
- **`FileSizeInput`** — size checked **before** any bytes upload, `setCustomValidity` blocks the
  submit, and the error renders inline with `role="alert"`. This was the 10MB gate-uploader
  finding.
- **Error codes** — a real vocabulary with a generic fallback, so an unrecognized code degrades
  to a message instead of silence. `checkin_not_today` is covered.
- **Focus is visible** — confirmed in-browser on the search input.
- **Footer** is a proper three-column sitemap; the nav no longer changes shape when you log in.
- **`FanDetailsFields` copy** is genuinely good practice — per-field rationale, "Rather not say"
  defaults, optional self-describe. The asking is well designed; only the using is missing.
- **Render health:** across 14 routes × 2 viewports — **no horizontal scroll, no console errors.**

---

## Still open from review #1 (verified on `18fd010`, unchanged)

| Item | Evidence |
|---|---|
| Errors not tied to their fields | `aria-invalid`: **0** occurrences |
| No responsive images | **0** `next/image`, **20** raw `<img>` |
| Filter chips truncate silently at 16 | **2** sites (`/gigs`, `/sound-check`) |
| No sort controls, no pagination | **0** |
| Page container widths | **8** distinct |
| Emoji as icon system | **134** glyphs |
| `marker:hidden` no-op (Safari triangle) | **2** sites |
| No breadcrumbs on the 4-level venue path | single back link |

---

## Suggested order

1. **N1** — decide within the week whether to ship a consumer or reword. Every day the form runs
   as-is, it collects sensitive data against claims the product doesn't meet.
2. **N2** — one-line condition change; an owner currently can't administer their own listing in
   the wrong mode.
3. **N4, N6** — both small and both clearly wrong.
4. **N5, N7** — honesty-of-numbers fixes; a little copy each.
5. **N3, N8** — design decisions worth thinking about rather than patching quickly.
6. **N9** and the carried-over eight, whenever.

*Method note: findings state what the code does at `18fd010` with file:line references. Anything
described as "used by nothing" was checked across `src/` and `supabase/migrations/`. The app was
exercised locally against a mocked backend with an empty database — so this review can see
structure, copy, and behavior, but not how any surface looks under real load. That phone pass
against live data is still outstanding.*
