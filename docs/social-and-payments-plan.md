# Myrtle365 — Social Connections + Tipping/Payments Plan

> Scope: Add **social media connections** to the **Fan**, **Talent**, and **Venue** pages,
> plus **Venmo & Zelle** connections so fans can tip and pay talent.
> This doc is a menu of options + a phased build plan.
>
> **Status:** Phase 1 (the locked v1 scope below) is implemented in this repo — see
> [`../README.md`](../README.md) for how to run it and what's deliberately left out.
> Phases 2 and 3 remain unbuilt.

## ✅ Locked decisions (v1)

- **Payment model: Handle Handoff (Model A).** Talent/venue connect their own Venmo/Zelle handle; fans pay
  them **directly** via deep link / QR. Myrtle365 is never in the money flow.
- **Platform cut: none — 100% of every tip goes to talent.** Monetize elsewhere (subscriptions, booking
  fees) later. This keeps Venmo/Zelle native and avoids money-transmission/KYC burden.
- **v1 tipping features: (1) Presets + QR tip jar, (2) Superfan leaderboard + badges.**
  Song requests and tip goals are deferred to a later phase.
- Everything below marked _(deferred)_ is out of scope for v1 but kept for the roadmap.

---

## 0. Assumptions (correct me if wrong)

- Myrtle365 is a live-entertainment marketplace with three profile types: **Fan**, **Talent**, **Venue**.
- "Scoca media" = **social media** connections (Instagram, TikTok, YouTube, Spotify, etc.).
- Goal is twofold: (a) richer, more credible profiles + discovery, and (b) letting money flow from fans → talent.
- This started as a greenfield design with no existing schema to conform to. The schema sketched in
  §4 is now live in `prisma/schema.prisma` (minus `TipGoal`, which is deferred with tip goals).

---

## 1. Social Media Connections

### 1a. Which platforms to support (by profile type)

| Platform   | Fan | Talent | Venue | Primary value |
|------------|:---:|:------:|:-----:|---------------|
| Instagram  | ✅  | ✅✅   | ✅    | Photos/reels, reach, verification |
| TikTok     | ✅  | ✅✅   | ✅    | Virality, short video |
| YouTube    |     | ✅✅   | ✅    | Long-form performance video |
| Spotify    | ✅  | ✅✅   |       | "Listen now," track credibility |
| SoundCloud |     | ✅     |       | Emerging artists / DJs |
| Bandcamp   |     | ✅     |       | Direct music sales |
| Twitch     | ✅  | ✅     | ✅    | Live status, streaming |
| X / Threads| ✅  | ✅     | ✅    | Announcements |
| Facebook   | ✅  | ✅     | ✅✅  | Events, older demos, venue pages |
| Google Business |  |     | ✅✅  | Hours, maps, reviews for venues |
| Snapchat   | ✅  | ✅     |       | Younger fan reach |

Start with **Instagram, TikTok, YouTube, Spotify** (highest ROI), then expand.

### 1b. Two connection modes (choose per platform)

1. **Lightweight (link-only)** — user pastes their handle/URL. No OAuth, no API cost, works day one.
   Powers: buttons, "follow everywhere," QR codes, profile completeness. **Recommended MVP.**
2. **Deep (OAuth + API)** — user authorizes Myrtle365. Unlocks live data: follower counts, latest posts,
   verification, "live now" status, auto-imported galleries. Higher build + review/compliance cost per platform.

> Most value at launch comes from link-only. Add OAuth per-platform where the payoff (social proof, content feed) justifies it.

---

## 2. What we USE the social connections for — options menu

Pick any combination. Grouped by ambition.

### Tier 1 — Ship first (cheap, link-only)
- **Unified social bar** on every profile — one row of platform icons.
- **"Follow everywhere" button** — fan follows talent across all their platforms in one tap.
- **Profile completeness / trust nudges** — "Add your Instagram to get 3× more bookings."
- **Social login** — Sign in with Google / Apple / Facebook for fast fan onboarding.
- **Share cards** — auto-generated graphics for a booked gig that talent/venue post to their socials.

### Tier 2 — Differentiators (needs OAuth/API on key platforms)
- **Content feed** — pull latest reels/videos/tracks into the Talent/Venue page automatically; media gallery stays fresh with zero manual upload.
- **Verification badges** — "Verified on Instagram" / cross-platform verified checkmark.
- **Clout / reach score** — aggregate followers + engagement into a single number that powers **search ranking**, **"trending talent,"** and **booking recommendations** to venues.
- **Onboarding autofill** — new talent connects Spotify/Instagram → we prefill name, bio, photo, genre.
- **"Live now" indicator** — surface when talent is live on Twitch/IG/TikTok; deep-link fans straight in.

### Tier 3 — Growth / network effects
- **Social discovery** — "Talent your friends follow," friend-graph recommendations for fans.
- **Cross-post announcements** — talent/venue announce an event once → auto-posts to all connected socials.
- **Growth analytics for talent** — dashboard: "This Myrtle365 gig drove 214 new IG followers."
- **Venue reputation** — pull Google/Facebook reviews + ratings onto the Venue page.
- **Superfan detection** — identify fans who engage + tip the most; feed into the tipping leaderboard below.

---

## 3. Payments — Venmo & Zelle for tips & paying talent

### 3a. ⚠️ Important reality check (read before building)

Venmo and Zelle are **not built to be marketplace payment processors**:
- **Venmo** has no public API for a platform to charge fans and split funds. What *is* available: **deep links / QR** to a user's Venmo (`venmo.com/u/<handle>`, `venmo://`), and Venmo-as-a-button *inside PayPal Checkout* (Venmo is PayPal-owned).
- **Zelle** is bank-to-bank with **no marketplace/developer API**. It's realistically **handle- or QR-based** only.

**Two models — pick per your risk appetite:**

| | **Model A: Handle Handoff (recommended MVP)** | **Model B: Platform-processed** |
|---|---|---|
| How | Talent connects their Venmo/Zelle handle; fan is deep-linked / shown a QR; money moves **directly** fan→talent | Myrtle365 processes the charge, holds funds, pays out |
| Venmo/Zelle fit | ✅ Native | ❌ Not really — needs **Stripe Connect** or **PayPal/Venmo Checkout** |
| Platform fee | Hard (you're not in the flow) | ✅ Easy to take a cut |
| Compliance/liability | Low (P2P, you're a directory) | High (money transmission, KYC, 1099s, chargebacks) |
| Build cost | Low | High |

> **✅ Chosen: Model A.** Venmo/Zelle handle + QR/deep-link handoff, **0% platform cut, 100% to talent.**
> Model B (Stripe Connect, processed) is _(deferred)_ — kept in the roadmap only if we later decide to
> monetize the payment flow or need escrow/1099s.

### 3b. Where tipping/pay lives
- **Talent page:** persistent "Tip / Support" button.
- **Fan page:** "You've tipped 6 artists" history + quick re-tip.
- **Venue page:** "Tip the performers tonight" + a **printable QR** for the physical venue/stage.
- **Live/event context:** tip button during a live set.

### 3c. Tipping ideas (features)

**In v1:**
- **Tip jar with presets** — $5 / $10 / $20 / custom, one-tap, then deep-link/QR to the artist's Venmo/Zelle.
- **QR at the venue** — table tent / stage sign → opens the artist's tip flow.
- **Superfan leaderboard + badges** — top tippers get shoutouts, badges, maybe perks (early access, meet-ups).
  - Note: with handle-handoff, we don't see the money move, so tips are **self-/artist-confirmed** for the
    leaderboard (e.g. fan taps "I tipped," artist can confirm, or count tip-flow opens). Good enough for v1;
    exact amounts become authoritative only under processed payments _(deferred)_.

**Deferred (later phases):**
- **Song requests** — pay to request a song; tip extra to bump it up the queue.
- **Post-show prompt** — "Loved the show? Tip [Artist]." push after an event.
- **Goals / crowdfunding** — talent sets a goal (new EP, tour van) with a progress bar.
- **Split tips** — one tip split across a band/lineup by preset shares.
- **"Round up" / cover the fee** — relevant only under processed payments.
- **Recurring support** — monthly patron tier per artist (processed / Stripe only).
- **Gift a tip** — fan tips on behalf of a friend, with a note.

### 3d. Paying talent (venue → talent)
- Venue can **connect its own Venmo/Zelle** to pay booked talent (Model A), or
- Use processed payouts (Model B) for **escrow / pay-on-completion** with a booking record + receipts + 1099 support.

---

## 4. Data model sketch (greenfield)

```
Profile (id, type: fan|talent|venue, display_name, ...)

SocialConnection
  id, profile_id, platform (enum), handle, url,
  mode (link | oauth), oauth_token?, follower_count?,
  verified?, last_synced_at

PaymentHandle
  id, profile_id, provider (venmo | zelle | stripe | paypal),
  handle_or_account, qr_asset_url, is_payout (bool), verified?

Tip
  id, from_fan_id, to_talent_id, amount, currency,
  provider, context (profile | event | song_request | goal),
  event_id?, note?, status, created_at

TipGoal (id, talent_id, title, target_amount, current_amount, ends_at)
```

---

## 5. Phased roadmap

**Phase 1 — v1 (link-only social + handle-handoff tipping) ← locked scope**
- SocialConnection (link mode) on Fan/Talent/Venue; unified social bar; "Follow everywhere."
- PaymentHandle (Venmo/Zelle) + tip button + **presets/custom amount** + **QR + deep links**, 0% cut.
- **Superfan leaderboard + badges** (self-/artist-confirmed tip counts).

**Phase 2 — Data-rich social + tipping engagement _(deferred)_**
- OAuth for Instagram/TikTok/YouTube/Spotify → content feed, follower counts, verification.
- Tip goals, song requests, post-show prompts.

**Phase 3 — Ranking, growth, processed payments _(deferred)_**
- Clout score → search ranking + recommendations; growth analytics.
- Stripe Connect (Model B) for processed tips, recurring patron tiers, venue→talent escrow payouts, 1099s.

---

## 6. Decisions — resolved ✅

1. **Payment model:** Handle-handoff (Model A) only for v1. ✅
2. **Platform cut:** None — 100% to talent. ✅
3. **v1 tipping features:** Presets + QR, and Superfan leaderboard + badges. ✅
4. **Launch social platforms:** Instagram / TikTok / YouTube / Spotify (proposed — confirm anytime).
5. **Song requests / tip goals / recurring:** deferred to later phases. ✅
