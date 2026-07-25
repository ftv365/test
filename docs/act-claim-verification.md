# Act Claims — "Request More Info" + Identity Verification

> Context: When someone claims an act (Talent) or a Venue, Support gets the approval email
> (`emails/new-act-claim.html`). Approving grants access, so we need (a) a third option that
> asks the requester for proof *before* deciding, and (b) a menu of ways for Talent and Venues
> to actually prove who they are.

---

## 0. The core insight — verification piggybacks on features we're already building

Myrtle365 is already adding **social connections** (Instagram/TikTok/YouTube/Spotify) and
**Google Business** connections for venues. *Proving you control those accounts is proving you
are the act.* So the cheapest, strongest verification isn't a new KYC system — it's asking the
claimant to **connect the account the act's identity already lives on.**

This also means most claims can be **auto-approved with zero human review**, and Support only
ever sees the ambiguous ones.

---

## 1. The "Request more info" flow (third option, not a rejection)

Today the email is binary: Approve / Reject. A legit-but-underdocumented claim forces a bad
choice — reject a real artist, or approve someone we can't confirm. Fix: a middle state.

**New claim states:** `pending → needs_info → approved | rejected` (with `needs_info` able to
loop back as the requester replies).

**What the button does:** `{{requestInfoUrl}}` opens a reply to the requester with a
**canned-ask picker** so Support doesn't have to write proof requests from scratch:

- "Connect the act's Instagram / Spotify to this claim." (link back into the connect flow)
- "Add code `MYR-XXXX` to your bio/story for 10 minutes so we can confirm ownership."
- "Reply from the email on file for this act's bookings."
- (Venue) "Send the Google Business Profile link, or confirm the street address."
- Free-text for anything else.

**Behavior:**
- Claim moves to `needs_info`; **not** approved, **not** rejected — nothing is granted.
- The ask + a resume link go to the requester; their reply threads back to Support.
- Auto-expire after N days (e.g. 14) → soft-close with "reopen anytime" so stale claims don't
  sit open forever.
- The email/inbox shows the claim's current signals so Support decides with context, not blind.

---

## 2. Ways for TALENT to prove identity — ranked by leverage vs. cost

**Green = auto-verify (no human), Yellow = a signal, Red = heavy / disputes only.**

| # | Method | Strength | Notes |
|---|--------|----------|-------|
| 1 | 🟢 **Social OAuth ownership** — authorize the act's IG/TikTok/YouTube via OAuth | Strong | If they can log in as `@djswerve`, they *are* the act. Reuses the deep-connection feature. **Best auto-verify path.** |
| 2 | 🟢 **Spotify for Artists / Apple Music for Artists** | Strong | Artist-dashboard access is itself gatekept by the distributor/label — near-conclusive for musicians. Also pulls the verified checkmark + catalog. |
| 3 | 🟢 **Bio-token challenge (link-only, no OAuth)** — post a one-time code to bio/story, we verify by API or screenshot | Medium-Strong | Works on day 1 without OAuth. Time-boxed so a screenshot can't be faked from an old post. |
| 4 | 🟡 **Reply/comment from the verified account** — DM or comment a code from `@theact` to a Myrtle365 post | Medium | Cheap challenge when we lack API access to that platform. |
| 5 | 🟡 **Cross-signal triangulation** — same name + handle across 2+ connected socials, plausible follower count | Medium | Brand-new 3-follower account claiming a 500k-follower act = auto-flag, not auto-approve. |
| 6 | 🟡 **Booking/gig-history proof** — past event flyer, Bandsintown/Songkick/Eventbrite listing naming them, or a contract | Medium | Good corroboration; easy to attach in the `needs_info` reply. |
| 7 | 🟡 **Email/domain match** — requester email matches management/booking address on file | Weak-Medium | Signal only; emails are easy to spin up. |
| 8 | 🟡 **Peer vouching** — an already-verified Venue or Talent confirms "they played here" | Medium | Network trust; powerful once the graph is seeded. |
| 9 | 🔴 **Government ID + selfie liveness** — Stripe Identity / Persona / Onfido | Strong | KYC-grade. The plan deliberately **avoids KYC** for Model-A tipping, so keep this **disputes / high-value only**, not the default. |
| 10 | 🔴 **Live challenge** — short video holding a code, or a quick verification call | Strong | Last resort for contested or high-profile claims. |

---

## 3. Ways for VENUE to prove identity — venues are *places*, so lean on location + business

| # | Method | Strength | Notes |
|---|--------|----------|-------|
| 1 | 🟢 **Google Business Profile ownership** | Strong | The venue analog of Spotify-for-Artists — GBP management is already gatekept. Plan lists Google Business as a venue connection, so **reuse it as the auto-verify path.** |
| 2 | 🟢 **Website domain control** — DNS TXT record or a meta tag on the venue's site, or a verified email at that domain (`owner@thevenue.com`) | Strong | Controlling the official site ≈ controlling the business. |
| 3 | 🟡 **Postcard / mail-a-code to the street address** | Strong but slow | Google's own method. Very strong for a fixed location; days of latency, so pair with a faster signal. |
| 4 | 🟡 **Phone verification to the public listed number** | Medium-Strong | Call/text a code to the number on Google/their site — proves access to the business line. |
| 5 | 🟡 **On-site geofence + physical sign** — check in from the venue's GPS during hours, and/or post a code on the stage sign (we already generate QR tip signage) | Medium-Strong | Ties directly into the printable-QR feature in the plan. |
| 6 | 🟡 **Consistent NAP across platforms** — name/address/phone match Google + Facebook + Yelp | Medium | Cheap corroboration from data we're already pulling. |
| 7 | 🔴 **Business docs** — business license, liquor license, EIN, or a utility bill at the address | Strong | Heavy; reserve for disputes or two parties claiming the same venue. |
| 8 | 🟡 **Peer vouching** — talent who've performed there confirm the venue | Medium | Reverse of the talent-vouch; strengthens as the graph grows. |

---

## 4. Recommended model — a trust ladder, not a single gate

Route every claim by the strongest signal it already has:

- **Green — auto-approve, no email at all.** Social OAuth ownership (Talent) or Google Business
  ownership (Venue). The goal is that *most* claims never reach Support.
- **Yellow — send "Request more info."** Partial signals (name match, follower count, domain
  email). The email fires with a specific, canned ask; claim sits in `needs_info` until the
  requester supplies proof, then re-routes.
- **Red — manual review.** Conflicting claims, high-profile acts, or anything a reviewer flags →
  ID / business docs / vouching / a call.

**Design principles**
- **Cheapest sufficient proof wins** — don't demand a passport when a bio-token settles it.
- **No dead ends** — `needs_info` is always reversible; the requester can always add more.
- **Reuse, don't rebuild** — social + Google Business connections are the verification engine;
  ID/KYC stays optional and deferred, consistent with the plan's no-KYC stance for v1.

---

## 5. Data-model sketch (extends the greenfield model in the plan)

```
ClaimRequest
  id, act_id, profile_type (talent | venue),
  requester_email, requester_profile_id?,
  status (pending | needs_info | approved | rejected | expired),
  trust_level (green | yellow | red),
  created_at, decided_at?, decided_by?, expires_at?

VerificationSignal
  id, claim_id,
  kind (social_oauth | bio_token | spotify_artists | google_business |
        domain | postcard | phone | geofence | vouch | id_document | booking_proof),
  source_platform?, status (pending | passed | failed),
  detail (handle/url/code/reference), evaluated_at

InfoRequest        # one row per "Request more info" round
  id, claim_id, asked_by, template_key, message,
  sent_at, responded_at?, response_text?
```
