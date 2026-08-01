# Myrtle365.com — UX Review: Interface & Navigation

> **What was reviewed:** the live-site codebase (`ftv365/myrtle365` → `web/`, the Next.js app
> serving myrtle365.com on Vercel, at commit `90fc668`, 2026-08-01), rendered and driven locally
> in Chromium at desktop (1440×900) and mobile (390×844) sizes with a mocked backend.
> Direct access to the production URL was blocked by this environment's network policy, so all
> findings are grounded in source code + local rendering, with `file:line` references so each
> one is verifiable. Data-dependent surfaces were reviewed from code paths, not live data.
>
> **Audience assumption:** fans on phones deciding where to go tonight; talent and venue
> owners judging whether the platform looks credible enough to stake their name on. Issues are
> ordered by likely impact on those users — not by implementation effort.

---

## The five systemic problems (read these first)

Most individual findings below are symptoms of five root causes. Fixing these at the root
resolves dozens of symptoms at once.

### S1. No pending/loading feedback anywhere a user acts — HIGH

**Problem.** There is no `loading.tsx` in the entire app, no `<Suspense>`, and `useFormStatus`
is used exactly once — on an internal admin button (`admin/agents/SubmitButton.tsx:19`). Every
public form (signup, login, contact, gate, venue/artist creation, account) submits with a plain
button that never disables or changes label. Every list page is `force-dynamic`, so navigation
blocks on the server with zero visual feedback.

**Why it matters.** On venue wifi or hotel cellular — this audience's default network — every
tap looks dead for seconds. Users re-tap: double-submitted support tickets, duplicate admin
emails from the gate uploader, racing dedupe checks on venue creation, and (worst) Follow/RSVP
toggles that *undo themselves* on the second tap, leaving the fan unfollowed and convinced the
feature is broken. For a design-focused audience, an interface that doesn't acknowledge input
reads as unfinished regardless of how good it looks.

**Fix.** (a) Add `loading.tsx` skeletons to `/discover`, `/artists`, `/venues`, `/gigs` — four
small files. (b) Promote the already-written `SubmitButton` (pending label + `disabled` +
`aria-busy`) out of `/admin` and use it on every public form. (c) Give `FollowButton` /
`ShowRow`'s RSVP `useFormStatus` now and `useOptimistic` next — a follow should flip instantly.

### S2. Errors round-trip through redirects, destroying user input — HIGH

**Problem.** Every server action reports failure as `redirect("/page?error=...")`
(`lib/auth/actions.ts:72,266`, `lib/support/actions.ts:44`, `lib/talent/actions.ts:78`, etc.).
A redirect is a fresh GET: fields have no `defaultValue`, so everything typed is gone.

**Why it matters.** The contact form is the worst case: a user writes a paragraph, the RPC
fails, and the message is destroyed with a generic banner (`contact/page.tsx:77` has no
`defaultValue`). Same for the 12-field venue form on a duplicate-name rejection. Data loss on
error is the single fastest way to lose a user's trust — they will not retype.

**Fix.** Migrate forms to `useActionState` returning `{ error, values }` so the page re-renders
in place with input intact and the error next to the field that caused it. Start with
`/contact`, `/signup`, `/venues/new`, `/artists/new`.

### S3. Raw backend errors shown verbatim to end users — HIGH

**Problem.** `error.message` from Supabase/Postgres is URL-encoded and printed in the banner:
"Invalid login credentials", "Email not confirmed", up to `new row violates row-level security
policy for table "profiles"` (`lib/auth/actions.ts:72,266,362`, `lib/account/actions.ts:36,76,86`,
`lib/billing/actions.ts:22`). Bonus: `/gigs` renders `searchParams.error` directly
(`gigs/page.tsx:84`), so anyone can craft a styled, on-brand phishing message via URL.

**Why it matters.** Database jargon in a consumer UI is the clearest possible "not ready"
signal, and the error param is a spoofing surface. The repo already knows better —
`lib/venues/actions.ts:74-77` maps one Postgres error to friendly copy, and the gate's "That
password didn't match. Try again." is the best error copy in the app.

**Fix.** Map every user-visible failure to a fixed set of hand-written messages; render unknown
errors as a generic "Something went wrong — try again." Pass error *codes* in URLs, never
free text.

### S4. Sign-in intent is captured and then thrown away — HIGH

**Problem.** 14 of 15 gated pages call bare `redirect("/login")` with no return path. The one
that passes `?next=` (`crew/add/[id]/page.tsx:18`) is wasted: `login/page.tsx:8` never reads
`next`, and `signIn` ends with an unconditional `redirect("/account")`
(`lib/auth/actions.ts:107`). Follow/RSVP for signed-out fans does the same bait-and-redirect
(`lib/engagement/actions.ts:22,54`) — the tapped action is silently dropped.

**Why it matters.** The highest-value moments — a fan taps RSVP on a specific show, a friend
opens a crew invite link — end with the user dumped on `/account` with no explanation, the show
lost, the invite lost. Every one of those is a conversion the platform worked hard to earn.

**Fix.** The correct pattern already ships in this repo: the pre-launch gate captures
`pathname + search`, round-trips it through a hidden field, and validates it with `safeNext()`
(`lib/supabase/proxy.ts:29-36`, `lib/gate/actions.ts:8-15`). Apply the same to `/login` and
`/signup`, and prefer rendering "Sign in to RSVP" *instead of* the button when signed out —
`/gigs` already does this right (`gigs/page.tsx:162-168`).

### S5. Demo-era data assumptions are live on a real site — HIGH

**Problem & fixes, four instances:**

1. **Unknown price renders as "Free."** `formatPrice` returns "Free" for `null` *and* `0`
   (`lib/catalog/format.ts:79-82`), and the AI discovery pipeline writes `price: null` for
   every scraped show without a stated price (`lib/discovery/scan.ts:154`). Every
   auto-discovered show with an unknown cover is advertised "Free" in mint green on the
   homepage and every show row. Fans will hit a $20 door and blame Myrtle365 by name.
   *Fix:* `null` → "Price TBA"; only `0` → "Free". One function, five surfaces corrected.
2. **No date floor, ascending order.** `listShows` (`lib/catalog/queries.ts:76-91`) has no
   `gte(event_date, today)` — the docstring says to add it "once listings are live," and they
   now are. Today, `/discover` leads with the *oldest* show in the DB, venue pages count past
   shows as "upcoming," and the EPK's "Upcoming shows" advertises past gigs to bookers.
3. **Dev copy in the fan UI.** The `/artists` empty state renders "No talent yet. Seed the
   database with `supabase/seed.sql`." (`artists/page.tsx:240-244`) — confirmed in local
   render. *Fix:* mirror `/venues`' "list yours above to be the first on the Strand."
4. **Orphaned prototype page is publicly reachable.** `/talent` renders `RolePlaceholder` with
   "From the prototype spec" bullets, Phase-0 notes, and a hardcoded demo Spotify playlist
   (`talent/page.tsx:11`). Anyone trimming `/talent/manage` to `/talent` lands on scaffolding.
   *Fix:* redirect `/talent` → `/artists` (or a real marketing page) until one exists.

---

## Navigation & information architecture

### N1. Two navigations, two labels, two active states for the same places — HIGH

`MainNav.tsx:11-59` renders text links (Discover / Artists / Venues / Following) *and* a
FAN / TALENT / VENUE segmented control side by side. "Artists" and "TALENT" go to the same
`/artists`; on that page **both** light up. The route says artists, the pill says talent, the
page `<h1>` says "Talent," and detail pages back-link "← Talent" to a nav item labeled
"Artists." The FAN pill goes to `/` while its siblings go to directories — the triad isn't
even symmetric.

**Why it matters.** The header is the first interaction pattern a design-literate visitor
evaluates, and this one makes them do vocabulary reconciliation before they can move. Duplicate
affordances with divergent labels read as two teams shipping two navs.

**Fix.** Pick one mental model. Either the seg control is an *audience switcher* that changes
the page's pitch (then it shouldn't duplicate destinations in the adjacent links), or it's
navigation (then delete the duplicate text links). Standardize on one name — "Talent"
everywhere or "Artists" everywhere — across nav, pills, headings, and back links.

### N2. Four product surfaces have no navigation entry at all — HIGH

`/sound-check` (TAG board), `/gigs` (gig board), `/crew` (friends), and `/messages` (on mobile)
are reachable only through in-page cross-links — chiefly a run-on paragraph of links on
`/account` (`account/page.tsx:364-379`). `/account` is functioning as the site map.

**Why it matters.** Features that aren't in the nav effectively don't exist. Sound Check and
the Gig Board are the platform's differentiators for talent, and a musician exploring the site
cold will never find them.

**Fix.** Add them to the header for signed-in users (grouped under a "For talent" item if the
bar is tight) and to the footer for everyone. The footer is currently one line (FAQ · Contact ·
brand) with acres of unused space — see N5.

### N3. Signed-in mobile users lose the directories — HIGH

The mobile strip's contents change by auth state (`AuthNav.tsx:175-224`): signed out it's
Discover / Artists / Venues; signed in it becomes Discover / Following / ✉ / 🔔 — Artists and
Venues vanish, and the desktop nav is `hidden md:flex`. The only remaining path to the two core
directories is decoding the unlabeled TALENT/VENUE pills crammed in the top row. There is no
hamburger or drawer anywhere.

**Fix.** Keep the five essentials (Discover, Artists, Venues, Following, Account) stable in the
mobile strip regardless of auth state; move ✉/🔔 into the top row where signed-in space frees up
(Log in / Sign up disappear). Navigation that mutates when you log in breaks spatial memory
exactly for your most engaged users.

### N4. Weak and inconsistent current-location signals — MED

Active nav state is a subtle `text-mute` → `text-cream` shift with no underline/pill and no
`aria-current` (`MainNav.tsx:32-34`). "Following" uses a different active-match rule than its
siblings (`:42` vs `:19`). Clicking "Following" lands on a page headed "Your scene"
(`following/page.tsx:37`). 15 pages ship no `<title>`, so every venue-management screen and
login step is an identical "Myrtle365 — Where the Strand plays" tab in history. There's no root
`not-found.tsx`, so a mistyped artist slug gets Next's bare default 404 with no way back.

**Fix.** Add a visible active indicator + `aria-current="page"`; make click-label match page
heading; add `metadata` to the 15 title-less pages; add a branded `not-found.tsx` with a search
box and links to Discover/Artists/Venues.

### N5. Footer is missing the things footers exist for — MED (HIGH once payments are on)

`SiteFooter.tsx:14-41` is a single centered line. No Terms of Service, no Privacy Policy — on a
site running Stripe subscriptions, hosting fan-uploaded media, and sending email/SMS. No
sitemap links (the natural home for N2's missing surfaces), no supply-side CTA ("List your
venue" / "Claim your act"), no copyright. It also renders the configurable `brand_name`
("FTV365") next to "Myrtle365" branding with no explanation.

**Fix.** Terms + Privacy pages are a launch blocker, not polish. Then a standard 3-column
footer: Fans (Discover, Calendar, Map) · Talent & Venues (Sound Check, Gig Board, Claim, List)
· Company (FAQ, Contact, Terms, Privacy).

### N6. Home's show rows all point at the same generic page — MED

Every row in the hero's "On the Strand" card links to `/discover` (`page.tsx:107-108`) — five
distinct-looking shows, one undifferentiated destination. `ShowRow` proves the per-entity links
exist (`ShowRow.tsx:115,125`). Also, each row shows `event_time ?? date` (`page.tsx:127`): a
show with a time set displays "9:00 PM" with **no day** — a fan can't tell tonight from next
Thursday in the one card whose job is answering "what's playing tonight?"

**Fix.** Link each row to its artist (or the discover view filtered to that show's date), and
always render the date, adding time when present.

### N7. Duplicated/orphaned marketing pages — MED

`/welcome` (full marketing page, arguably better structured than home) and `/fans` (re-renders
home's `FanFeatures`) have **zero inbound links**; three pages pitch the same message. Meanwhile
"Browse tonight's shows" CTAs on `/welcome` and `/fans` link to `/discover`, which has no
"tonight" concept at all (see D3).

**Fix.** Fold `/welcome`'s "Which are you?" and "How it works" sections into home (or link
`/welcome` from signup/QR flows it was built for), delete `/fans`, and make every
"tonight" CTA land on a discover view actually filtered to today.

---

## Discovery & content

### D1. `/discover` — the primary fan surface — has no search, no filters, no pagination — HIGH

`/artists` and `/venues` both have name search + town filter + URL-persisted state (done well:
`artists/page.tsx:16-23`, shareable and back-button-safe). `/discover` — the page every CTA
funnels to — has only a view toggle. No town, genre, price, or date-range narrowing; up to 200
rows in one unpaginated list (`discover/page.tsx:154-167`).

**Fix.** Lift the existing town-filter pattern from `/venues`, add a date quick-filter row —
**Tonight · This weekend · Pick a date** — and genre chips. The components and URL-state
pattern already exist in the codebase.

### D2. The calendar has no "today" marker and drops you out of calendar view — HIGH

The month grid highlights days with shows but nothing marks the current day
(`CalendarView.tsx:52-93`) — on a nightlife calendar, "which square is tonight?" is the whole
point. Tapping a day links to `/discover?date=...` *without* `view=calendar`, so the user is
ejected to list view with no way back except re-toggling; comparing three candidate nights
costs three round trips. On a 390px phone, day cells are ~45px wide with act names at 9px —
illegible (verified in local render).

**Fix.** Ring today's cell; preserve `view=calendar` on day links (render the day's shows
under the grid); switch to an agenda list below `sm`.

### D3. "Tonight" is promised on four pages and delivered on none — HIGH

The hero shouts "What's Playing Tonight?"; `/welcome`, `/fans`, and `FanFeatures` all say
"Browse tonight's shows." But there is no relative-date formatting anywhere
(`formatShowDate` always returns "Sat, May 9" — `lib/catalog/format.ts:66-76`), no
tonight filter, and (S5.2) the list currently leads with the oldest show. `LocalTime` — a
correctly built hydration-safe local-time component — is used only in `/admin` and
`/messages`; showtimes fans plan around never pass through it. Show times themselves are
free-text ("9pm", "doors 8, show 9", "TBD") because the venue form is a bare text input
(`venues/manage/[id]/page.tsx:353-357`).

**Fix.** Add "Tonight / Tomorrow / Fri" prefixes in `formatShowDate`; default `/discover` to
today-forward with a Tonight chip; use `type="time"` (or validated parsing) at entry so times
can sort and render consistently.

### D4. Follow/RSVP give zero feedback and hide their toggle nature — HIGH

Beyond S1/S4: the buttons flip between "Follow"/"Following ✓" with no pending state and no
hint that tapping "Going ✓" *cancels* the RSVP. A slow network plus an impatient double-tap
un-follows. Contrast `/gigs`, which renders "✓ Applied" plus an explicit "Withdraw" button
(`gigs/page.tsx:176-188`) — the right pattern, already in the app.

Related: on unverified shows the RSVP/ticket affordances are silently absent
(`ShowRow.tsx:104-108`) with no explanation, so fans see inconsistent rows and assume bugs.
A one-line "RSVP opens when this show is confirmed" fixes the perception.

### D5. The media lightbox has the right ARIA but not the behavior — HIGH (accessibility)

`MediaOverlay.tsx` gets the semantics right (`role="dialog"`, `aria-modal`, Escape listener, a
real `<button>` backdrop) — but focus never moves into it, isn't trapped, isn't restored on
close; the page scrolls behind it on touch; backdrop and ✕ both announce as "Close". And it
shows exactly one item — browsing a 12-photo fan gallery is open → close → tap, twelve times,
with no swipe, no arrows, no "3 of 12" counter, on a phone-first crowd-photo feature.
(Meanwhile `AddDiscoveryButton.tsx:93-149` is a second modal with *none* of the dialog
semantics — two dialogs, two standards.)

**Fix.** Move focus in on open, trap, restore on close, lock body scroll; add prev/next with
arrow keys and swipe; give `AddDiscoveryButton` the same treatment. (Also: `ClipTile.tsx:48`
autoplays Cloudflare Stream without `muted=true`, which iOS blocks — the tapped clip stalls on
a black frame and the tap looks broken.)

### D6. Errors are indistinguishable from emptiness — MED

Every catalog query swallows errors into `[]` (`lib/catalog/queries.ts:90,107,143,187,249`),
and there is no error boundary on any public route. A Supabase outage renders as "No shows yet
— check back soon." — users leave, and nobody files a report. Similarly, `confirmShow` failures
redirect with `?error=` to three pages that never read the param (`lib/shows/actions.ts:29-38`
vs `discover/page.tsx:23`) — a venue owner pasting a bad ticket URL sees the page reload
unchanged, forever.

**Fix.** Add a root `error.tsx` ("Something broke — refresh or tell us"), and render the
`error` param on the three confirm surfaces (`/gigs` already does).

### D7. The map's pins are unlabeled 24px targets, and one zone is mislocated — MED

`StrandMap.tsx:132`: 24×24px pins (WCAG minimum, half the iOS-recommended 44pt) whose venue
name lives only in `title` — which doesn't exist on touch. On a phone the map is anonymous
numbered dots that full-page-navigate when tapped. The codebase already learned this lesson:
`UnverifiedBadge.tsx:6` documents replacing a `title` tooltip because it "never worked on
touch." Also `lowcountry` venues silently pin to central Myrtle Beach because `ZONE_SEGMENTS`
defines four of the five zones (`StrandMap.tsx:24-29` vs `format.ts:40-44`) — a Georgetown
venue appears ~40 miles from home.

**Fix.** Larger pins with a tap-to-peek card (name, tonight's show, "View venue"), and add the
missing zone segment.

### D8. Cards omit the one datum that drives the decision — MED

Artist cards show genre, rating, home town — but not *whether they're playing soon*
(`artists/page.tsx:68-107`); `/venues` already shows "N shows listed," so the join pattern
exists (`lib/catalog/queries.ts:133`). Show rows never render `act_type` even though it's
selected, so a fan can't tell a tribute band from a comedy night without tapping. EPKs never
embed audio: `SpotifyEmbed` is built and tested but only used on the orphaned `/talent` demo
page — a booker evaluating an act can't hear them without leaving the EPK.

---

## Forms & account flows (beyond S1–S3)

### F1. Signup: password rules stated nowhere, no show/hide, no confirm, dead-end on typo'd email — MED

`signup/page.tsx:110-117` has `minLength={8}` with no visible hint (the reset form *does* say
"At least 8 characters"); the working show/hide toggle from `GatePasswordField` is used only on
the gate; and "Check your email" offers no resend and doesn't display the address it sent to —
a typo'd email is unrecoverable self-service (`:20-39`). Combined with F2 this can lock users
out entirely.

### F2. "Email not confirmed" at login is a hard dead end — HIGH

The raw Supabase string renders with no "resend confirmation" action (`login/page.tsx:23-27`) —
and signup has none either. A confirmation email in spam means the account is permanently
stuck, with support the only path out.

### F3. MFA backup codes: shown once with no copy/download, and can silently not exist — HIGH

`MfaSetup.tsx:201-219` renders the ten codes as plain text — "This is the only time they're
shown" — with no copy button (the repo has `CopyLink`), no download, no "I saved these"
gate. Worse, if the insert fails, `issueBackupCodes` returns `[]` *after deleting the old
codes* (`lib/auth/actions.ts:203-216`), the panel simply doesn't render, and the user ends up
with 2FA on and zero recovery codes, no error shown. Given that entering a backup code
tears down all MFA factors by design (`:156-176`) — itself unexplained on the verify screen —
recovery hygiene here is the difference between a locked-out user and a support ticket.

(Positive: `MfaSetup` is otherwise the best-built interactive surface in the app — real
pending states, numbered steps, manual-entry fallback, transcription-safe code alphabet.)

### F4. Gate submissions can fail invisibly and the honeypot fakes success — MED

The venue/talent uploader's error message renders *inside a collapsed `<details>`*
(`gate/page.tsx:119,127-131`): after the error redirect, the accordion is closed, so a venue
owner whose 12MB PDF was rejected sees nothing — form, file, and message gone. The honeypot
short-circuits to the *success* screen (`lib/submissions/actions.ts:33-34`) on a field named
`website`, which autofill genuinely populates — real submissions can be silently discarded
while the user is thanked. This is also the only form on the site using placeholder-as-label
throughout (`:156-173`).

**Fix.** `open` the details when `submitError` is present; rename/harden the honeypot; add
real labels; validate the 10MB cap client-side before upload.

### F5. Account page: the Save button next to the avatar picker doesn't save the avatar — MED

Avatar upload and profile save are separate forms (`account/page.tsx:105-122` vs `:141-184`);
picking a photo then clicking the prominent "Save profile" silently discards the photo and
confirms "Profile saved." "Remove photo" is a destructive action styled as body text
(`:124-131`). Long-page actions (launch code at `:397`) redirect to the top, hiding their own
result banners.

---

## Visual & interaction craft

*(Findings from the design-system sweep — the layer a design-savvy audience judges first.)*

### V1. Native form controls render light-mode on a dark site — HIGH, one-line fix

Nothing declares `color-scheme: dark` (absent from `globals.css` and layout metadata). The app
has 16 `<select>`, 3 `type="date"`, 8 `type="file"` — all render with UA-default light-mode
chrome: date inputs show dark glyphs on the dark `bg-surface-2` (effectively invisible,
`venues/manage/[id]/page.tsx:347`), select popups open white, file inputs and scrollbars render
light. There's also no `themeColor`, so mobile browser chrome stays white against the dark UI.

**Fix.** `export const viewport = { colorScheme: "dark", themeColor: "#0b1f26" }` in
`layout.tsx`. This is the highest polish-per-character change available.

### V2. The palette is AA-solid, but opacity modifiers quietly break it — HIGH

Every base token pair passes AA comfortably (`mute` on `brand` is 7.68:1; `cream` 14.84:1) —
the system is genuinely well built. But 85 usages layer `/NN` opacity on `text-mute`:
placeholders at `text-mute/45` measure **2.39:1** (the gate page — the first screen every
preview visitor sees — uses it three times), and `/60`–`/70` carry real content: calendar day
numbers, the "Tap a day" / "Tap a pin" instructions, message previews. Separately,
`--color-line` (#244049) measures **1.2–1.5:1** against the backgrounds it borders — and that
border is the *only* visible edge of every secondary button ("Follow artists", RSVP, Log out),
every card, and every input. Secondary CTAs read as floating text.

**Fix.** Add real tokens (`mute-2`, `line-strong`) at ≥3:1 instead of ad-hoc opacity; audit the
85 `/NN` usages against them.

### V3. Keyboard focus is invisible or missing — HIGH

Zero `focus-visible` styles in the codebase; 86 `focus:outline-none` declarations replace the
UA ring with a 1px border-color change. `InviteButton.tsx:66` suppresses the outline with no
replacement. Worst: the signup account-type picker (`signup/page.tsx:71-77`) uses `sr-only`
radios, so the native focus ring has literally nowhere to render — a keyboard user tabbing
FAN/TALENT/VENUE gets no indication at all, and selection state is a 1px border + 10% tint
(color-only). `aria-current` appears 0 times; the selected conversation in `/messages` uses
`bg-white/5` — *identical* to the hover style on the same element (`messages/page.tsx:131`), so
there is no way to tell which thread is open. The mobile nav strip is a bare `<div>` (no `<nav>`
landmark exists on phones), and there's no skip link.

**Fix.** A global `focus-visible` ring (2px mint, offset) restores keyboard usability in one
CSS rule; add a visible checked state to the signup cards; distinct selected style in messages;
`<nav>` + `aria-current` in both nav bars.

### V4. Touch targets: the core fan action is 22px tall — HIGH

Nothing in the app reaches the 44px Apple/Android guideline except the hero CTA (48px).
Measured: RSVP/Going toggle **22px** (`ShowRow.tsx:68-69`), checkboxes 16px, map pins 24px,
Discover view pills 28px, mobile nav icons 32px, all text inputs 38px. For a phone-first
nightlife audience, the single most important button on the site (RSVP) is also one of the
smallest.

**Fix.** Set a floor: `min-h-11` on primary interactive controls, `py-2` minimum on pills;
padding is free on mobile.

### V5. The brand's visual voice doesn't survive past the marketing pages — HIGH for this audience

- **Typography:** Anton (the display face) appears on 5 of ~48 pages; `/discover`, `/artists`,
  `/venues`, artist detail, EPK, signup all render their h1 in generic Inter Bold across five
  competing heading recipes. The site's typographic identity evaporates exactly when the user
  enters the product. (One page even fakes Anton bold — the font ships weight 400 only.)
- **Color code:** the app documents "Fan = mint, Talent = coral, Venue = sky"
  (`welcome/page.tsx:9`) and honors it everywhere — except the homepage, which teaches
  Talent = gold, Venues = coral, and hovers all three cards mint (`page.tsx:6-28,184`).
- **Componentization:** 55 hand-rolled button recipes (23 mint variants, 32 ghost variants),
  20+ padding combinations, six border radii with no rule, eight different page container
  widths — the content column visibly jumps width on almost every navigation — and a type
  scale with no 16px: body is 14px, a third of the UI is 12px, 74 declarations sit below 12px.
- **Iconography:** 179 emoji serve as the icon system (📍 ⚠ 🎟 ←/→), which render as
  platform-dependent color bitmaps that can't be recolored — while real SVG icons already
  exist in `AuthNav`/`VerifiedBadge`/`SocialBar`. Two incompatible icon languages.

**Why it matters.** A design-focused audience reads this instantly as inconsistency; it also
makes every future change slower.

**Fix.** Extract `Button`, `PageContainer`, and `Heading` components (the census above is the
spec); apply `font-display` to all page h1s; fix home's accent mapping; pick lucide-style SVG
icons and migrate the top 10 emoji.

### V6. Feedback states are silent to assistive tech and color-only — MED

45 error/success banners; zero `role="alert"` or `aria-live` in the codebase; zero
`aria-invalid`/`aria-describedby` against 40 `required` fields. The only error signal is coral
text — which itself measures 4.44:1 on its tinted background, under AA. Disabled styling is
opacity-only in 6 places (dropping already-muted text under 3:1).

### V7. Mobile layout is fluid, not designed — MED

54 of 85 component files contain zero responsive utilities; responsive thinking concentrates
in the two marketing pages. Specific casualties: the artist-detail header row (h1 + up to four
controls, no `flex-wrap`, no `min-w-0` — `artists/[slug]/page.tsx:138`) can overflow the
viewport on the most-shared page type; signup's three radio cards squeeze to ~88px each; in
`/messages` below 1024px the 70vh conversation list stacks *above* the thread, so a phone user
scrolls past a full screen of list to reach the message they tapped. Calendar cells: 9px act
names in ~46px cells (see D2). Also ~168px of header chrome before content on a 667px phone.

### V8. Craft details a design audience will catch — LOW each, additive

- No `prefers-reduced-motion` guards on 219 transitions and three infinite `animate-pulse` dots.
- `hover:bg-coral/85` *reduces* CTA contrast on hover (6.06 → 4.67:1) — hover should strengthen.
- Interactive-row hover is `bg-white/5` — at the threshold of perception on this background.
- 20 raw `<img>` tags (2 with dimensions, 2 lazy) — user-uploaded banners ship full-resolution
  with layout shift on a media-first product; `next/image` is imported once.
- FAQ/gate accordions hide the disclosure marker with `marker:hidden`, a no-op — Safari shows a
  stray native triangle next to the custom "+" (`UnverifiedBadge` does it correctly).
- The EPK — the one page artists will print/PDF — has no print stylesheet, so it prints
  near-white-on-white (`/admin/qr` has one; the pattern exists).
- Grid↔List toggles change artist names from `<h2>` to `<span>`, rewriting the document outline.
- Off-palette hardcoded hexes in the map, admin, and a stray orange drop-shadow in the header.

---

## What's working well (keep these)

- **Home page communication:** headline, geography-specific explainer, one dominant CTA, and
  real inventory above the fold instead of stock photography. First-visit comprehension is fast.
- **URL-persisted filter state** on `/artists` and `/venues` — shareable, refresh-safe,
  back-button-safe; filter-aware empty states echo the query and offer "Clear filters."
- **Result-count subtitles** ("12 acts matching 'x' in Conway.") — better than most shipped apps.
- **Unread badges** (`AuthNav.tsx:61-68`): parallel-fetched, capped at 9+, and the count is in
  the `aria-label` — correct in all four render sites.
- **The gate page** turns a password wall into an onramp (fan signup card, venue/talent
  uploader, human error copy, proper show/hide password toggle).
- **`/gigs` interaction states** — "Sign in to apply" instead of a dead button; "✓ Applied" with
  explicit "Withdraw."
- **`ClipTile`'s tap-to-play architecture** — static thumbnail, iframe mounts on demand; zero
  data cost to browse.
- **Date plumbing** (`format.ts`, `calendar.ts`) is timezone-drift-safe by construction; and
  `MfaSetup` + admin `SubmitButton` prove the team knows the right interaction patterns — they
  just haven't been applied outside `/admin`.
- **The core palette is genuinely well built** — every base token pair clears AA with room to
  spare; the failures all come from opacity modifiers layered on top, not the tokens.
- **The tri-accent system (fan=mint / talent=coral / venue=sky) is a real, documented design
  decision** executed consistently everywhere except home.
- **`VerifiedBadge` / `UnverifiedBadge`** are textbook accessible components (the latter's
  comment even explains *why* it replaced a `title` tooltip); `alt` coverage on images is 100%;
  checkboxes use `accent-mint` instead of being rebuilt.
- Local render at 390px showed **no horizontal scroll and no console errors** on any of the 19
  routes tested — the responsive foundations are sound (the gaps are in per-page layout, V7).

---

## Prioritized punch list

**P0 — trust breakers (do before wider launch)**
1. `formatPrice`: `null` → "Price TBA", not "Free" (S5.1)
2. Date floor + today-first ordering in `listShows` (S5.2)
3. Remove dev copy from `/artists` empty state; retire `/talent` placeholder (S5.3–4)
4. Pending state on all public submit buttons; stop double-submits (S1)
5. Stop destroying typed input on form errors — `useActionState`, starting with `/contact` (S2)
6. Human error messages; never render raw `error.message` or free-text URL errors (S3)
7. Resend-confirmation path at login/signup (F2); backup-code copy/download + failure surfacing (F3)
8. Terms & Privacy in the footer (N5)
9. `color-scheme: dark` + `themeColor` (V1 — one line, fixes every native control)

**P1 — major friction**
10. `?next=` honored end-to-end at login; "Sign in to RSVP" pattern for signed-out actions (S4)
11. One nav model: kill the duplicate seg/links, one name for Talent/Artists (N1)
12. Sound Check / Gig Board / Crew into nav + footer (N2); stable mobile strip across auth states (N3)
13. Tonight/This-weekend filters + town filter on `/discover` (D1); "Tonight/Tomorrow" relative dates (D3)
14. Calendar: today marker, stay-in-calendar day links, agenda view on mobile (D2)
15. Follow/RSVP optimistic feedback; explain missing RSVP on unverified shows (D4)
16. Focus-visible ring + signup radio focus/checked states; distinct selected style in messages (V3)
17. 44px floor on primary touch targets, starting with RSVP (V4)
18. Contrast tokens for placeholders/borders instead of `/NN` opacity (V2)
19. Focus management + prev/next in `MediaOverlay`; `muted=true` on Stream autoplay (D5)
20. Root `error.tsx` + `not-found.tsx`; render confirm errors on the three deaf surfaces (D6, N4)

**P2 — polish & credibility**
21. Loading skeletons for the four list routes (S1a)
22. Active-nav indicator + `aria-current`; page titles on the 15 title-less routes (N4)
23. Home show rows: per-entity links, always show the date (N6)
24. Extract `Button` / `PageContainer` / `Heading`; Anton on product h1s; fix home's accent
    mapping; one icon system (V5)
25. Map: labeled tap-to-peek pins, fix `lowcountry` zone (D7)
26. Next-show info on artist cards; `act_type` on show rows; `SpotifyEmbed` on EPKs (D8)
27. Merge `/welcome` into home; retire `/fans` (N7)
28. Gate uploader: visible errors, real labels, client-side size check (F4)
29. Avatar/profile single-form merge; button-styled "Remove photo" (F5)
30. `role="alert"` on error banners; `aria-invalid`/`aria-describedby` on failed fields (V6)
31. Responsive pass on the product pages — artist-detail header wrap, messages stack order,
    signup radio cards (V7); reduced-motion guards, image dimensions, EPK print styles (V8)

---

*Method note: four parallel code-review passes (forms/feedback, navigation/IA,
discovery/content, visual/accessibility) over `web/src`, cross-checked against a live local
render (Chromium, mocked Supabase, 19 routes × 2 viewports). File:line references point at
`ftv365/myrtle365` commit `90fc668`.*
