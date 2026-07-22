# Myrtle365 — Social Connections + Tipping/Payments Plan

> Scope: Add **social media connections** to the **Fan**, **Talent**, and **Venue** pages,
> plus **Venmo & Zelle** connections so fans can tip and pay talent.
> This doc is a menu of options + a phased build plan. Nothing here is locked — pick the tiers you want.

---

## 0. Assumptions (correct me if wrong)

- Myrtle365 is a live-entertainment marketplace with three profile types: **Fan**, **Talent**, **Venue**.
- "Scoca media" = **social media** connections (Instagram, TikTok, YouTube, Spotify, etc.).
- Goal is twofold: (a) richer, more credible profiles + discovery, and (b) letting money flow from fans → talent.
- Repo is currently empty, so this is a greenfield design — no existing schema to conform to.

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

> **Recommendation:** Launch with **Model A** (Venmo/Zelle handle + QR/deep-link handoff) to get tipping live fast and validate demand. If you want to monetize the payment flow itself, add **Model B via Stripe Connect** later as the "official" processed rail, keeping Venmo/Zelle as the free P2P option.

### 3b. Where tipping/pay lives
- **Talent page:** persistent "Tip / Support" button.
- **Fan page:** "You've tipped 6 artists" history + quick re-tip.
- **Venue page:** "Tip the performers tonight" + a **printable QR** for the physical venue/stage.
- **Live/event context:** tip button during a live set.

### 3c. Tipping ideas (features)
- **Tip jar with presets** — $5 / $10 / $20 / custom, one-tap.
- **QR at the venue** — table tent / stage sign → opens the artist's tip flow.
- **Song requests** — pay to request a song; tip extra to bump it up the queue (revenue + engagement).
- **Post-show prompt** — "Loved the show? Tip [Artist]." push/notification after an event.
- **Goals / crowdfunding** — talent sets a goal (new EP, tour van) with a progress bar fed by tips.
- **Superfan leaderboard + badges** — top tippers get shoutouts, badges, maybe perks (early access, meet-ups).
- **Split tips** — one tip split across a band/lineup by preset shares.
- **"Round up" / cover the fee** — fan optionally covers processing so artist gets the full amount.
- **Recurring support** — monthly patron tier per artist (Model B / Stripe only).
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

**Phase 1 — Link-only social + handle-handoff tipping (fast)**
- SocialConnection (link mode) on Fan/Talent/Venue; unified social bar; "Follow everywhere."
- PaymentHandle (Venmo/Zelle) + tip button + QR + deep links. Presets + custom amount.

**Phase 2 — Data-rich social + tipping engagement**
- OAuth for Instagram/TikTok/YouTube/Spotify → content feed, follower counts, verification.
- Tip goals, leaderboard, song requests, post-show prompts.

**Phase 3 — Ranking, growth, processed payments**
- Clout score → search ranking + recommendations; growth analytics.
- Stripe Connect (Model B) for processed tips, recurring patron tiers, venue→talent escrow payouts, 1099s.

---

## 6. Decisions I need from you

1. **Payment model:** Handle-handoff (A) only, or add processed payments (B) with a platform fee?
2. **Launch platforms:** Confirm Instagram / TikTok / YouTube / Spotify first?
3. **Do you want a platform cut** of tips? (Determines A vs B and legal setup.)
4. **Song-request tipping** — in or out for v1? (High engagement, a bit more build.)
5. **Recurring/patron support** — needed at launch, or later?
