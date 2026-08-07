# Myrtle365 — staging

Staging environment for Myrtle365.com: a live-entertainment marketplace connecting
**fans**, **talent**, and **venues** on the Grand Strand.

This repo implements the **locked v1 scope** from
[`docs/social-and-payments-plan.md`](docs/social-and-payments-plan.md):

- **Link-only social connections** on all three profile types, with a unified social bar and
  "Follow everywhere."
- **Handle-handoff tipping (Model A)** — talent/venues connect their own Venmo/Zelle; fans are
  deep-linked or shown a QR and pay them **directly**. Myrtle365 is never in the money flow and
  takes **0%**.
- **Presets + QR tip jar**, including a printable table-tent QR for venues.
- **Superfan leaderboard + badges**, built on self-reported and artist-confirmed tips.

Phase 2/3 items (OAuth, content feeds, clout score, Stripe Connect, tip goals, song requests) are
deliberately **not** built — see the roadmap in the plan doc.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run setup      # prisma generate + db push + seed
npm run dev        # http://localhost:3000
```

`npm run setup` creates a local SQLite database at `prisma/staging.db` and seeds ten fictional
profiles with social links, payment handles, and a spread of tips.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Generate client, push schema, seed |
| `npm run db:reset` | Delete the SQLite file and rebuild it from scratch |
| `npm run db:seed` | Re-seed (idempotent — wipes and reloads) |
| `npm run lint` / `npm run typecheck` / `npm test` | The three CI gates |

### Environment

See `.env.example`. Three variables:

- `DATABASE_URL` — SQLite file in staging; point at Postgres for production.
- `NEXT_PUBLIC_SITE_URL` — absolute origin baked into printable QR codes. A phone scanning a table
  tent is not on `localhost`, so this **must** be set to the real staging URL when deployed.
- `NEXT_PUBLIC_STAGING` — renders the amber "STAGING" banner. Set to `false` in production.

---

## What's here

```
src/app/                    Next.js App Router
  page.tsx                  Home / discovery
  talent, venues, fans/     Directory pages per profile type
  p/[slug]/                 Profile page
  p/[slug]/tip/             Tip flow (presets, custom, provider choice)
  p/[slug]/qr/              Printable venue/stage QR sign
  leaderboard/              Superfan leaderboard + badge tiers
  api/tips/                 Open a tip; advance its status
  api/qr/, api/health/      QR rendering; staging smoke check
src/lib/                    Domain logic (all unit-tested)
  payments.ts               Venmo/Zelle handoff links, amount parsing, 0% split
  social.ts                 Handle normalization, profile URLs, follow ordering
  badges.ts                 Badge tiers, leaderboard ranking
  tips.ts                   Tip aggregation
  enums.ts                  String-column unions (SQLite has no native enums)
prisma/                     Schema + seed data
tests/                      Vitest unit tests
```

---

## The one thing to understand: tips are records of intent, not payments

Under handle-handoff, money moves **inside Venmo or Zelle**. Myrtle365 never sees the transaction,
so a `Tip` row is a claim about a payment, not the payment itself:

| Status | Meaning |
|---|---|
| `opened` | The fan launched the handoff. **Not** evidence money moved — excluded from all totals. |
| `self_reported` | The fan tapped "I sent the tip." Counts toward leaderboards. |
| `artist_confirmed` | The recipient confirmed receipt. Counts, and wins leaderboard ties. |
| `disputed` | Recipient says it didn't arrive. Excluded. |

Transitions are one-directional and enforced server-side, so a confirmed tip can't be walked
backwards to inflate or deflate standings. Every surface showing totals says plainly that they are
self-reported. If exact amounts ever need to be authoritative, that requires processed payments
(Stripe Connect, Model B) — phase 3.

### Provider capabilities differ, and the UI reflects that

- **Venmo** — the documented `venmo://paycharge` scheme and `venmo.com/<handle>` web URL both accept
  a prefilled amount and note, so we deep-link *and* generate our own QR.
- **Zelle** — bank-to-bank, no public deep-link or QR spec. We show the handle for manual entry and
  let the recipient upload the QR their own banking app generates (`PaymentHandle.qrAssetUrl`).
  Guessing a URL scheme here would silently fail on device, so we don't.

---

## Known gaps before this leaves staging

These are deliberate omissions, not oversights:

1. **No authentication.** The tip flow has a "tipping as" dropdown standing in for a signed-in fan,
   and `POST /api/tips/:id/status` does not check *who* is confirming — anyone with a tip ID can mark
   it `artist_confirmed`. Gating confirmation on the authenticated recipient is the first thing to
   build on top of this.
2. **No rate limiting** on tip creation, so leaderboard standings are trivially inflatable.
3. **No profile editing UI.** Profiles, socials, and payment handles come from the seed script;
   onboarding flows aren't built.
4. **SQLite.** Fine for staging, wrong for production — swap the Prisma provider to Postgres.
5. **No events/bookings model.** `Tip.eventId` and the `event` context exist in the schema but
   nothing populates them yet.

---

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, a production build, and a seeded
smoke test that boots the server and checks `/api/health`, a profile page, and the leaderboard.
