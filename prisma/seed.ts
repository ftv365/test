/**
 * Staging seed data.
 *
 * Everything here is fictional. The Venmo/Zelle handles are deliberately
 * obvious placeholders (`myrtle365-demo-*`) so a mis-tap during QA cannot send
 * real money to a real stranger's account.
 */
import { PrismaClient } from '@prisma/client';
import { buildProfileUrl } from '../src/lib/social';
import type { SocialPlatform } from '../src/lib/enums';

const prisma = new PrismaClient();

interface SeedProfile {
  type: 'fan' | 'talent' | 'venue';
  slug: string;
  displayName: string;
  tagline?: string;
  bio?: string;
  city?: string;
  genres?: string;
  socials?: Partial<Record<SocialPlatform, string>>;
  venmo?: string;
  zelle?: string;
  payoutVenmo?: string;
}

const PROFILES: SeedProfile[] = [
  {
    type: 'talent',
    slug: 'salt-line-trio',
    displayName: 'Salt Line Trio',
    tagline: 'Beach music and soul covers, three-piece.',
    bio: 'Playing the Grand Strand since 2018. Weekly residency on the boardwalk, plus private events.',
    city: 'Myrtle Beach, SC',
    genres: 'beach music,soul,covers',
    socials: { instagram: 'saltlinetrio', tiktok: 'saltlinetrio', youtube: 'saltlinetrio', spotify: '3xSaLtLiNeTrIo01' },
    venmo: 'myrtle365-demo-saltline',
    zelle: 'demo-saltline@myrtle365.example',
  },
  {
    type: 'talent',
    slug: 'dj-kass',
    displayName: 'DJ Kass',
    tagline: 'Open-format DJ. Weekends on Ocean Blvd.',
    bio: 'Hip-hop, house, and throwbacks. Available for clubs, weddings, and pool parties.',
    city: 'North Myrtle Beach, SC',
    genres: 'dj,open format,house',
    socials: { instagram: 'djkassofficial', tiktok: 'djkass', twitch: 'djkass' },
    venmo: 'myrtle365-demo-djkass',
  },
  {
    type: 'talent',
    slug: 'harbor-lights-duo',
    displayName: 'Harbor Lights Duo',
    tagline: 'Acoustic covers for patios and porches.',
    bio: 'Two guitars, two voices, zero drama. Perfect for dinner service and sunset sets.',
    city: 'Murrells Inlet, SC',
    genres: 'acoustic,covers',
    socials: { instagram: 'harborlightsduo', spotify: '7hArBoRlIgHtS02' },
    zelle: 'demo-harborlights@myrtle365.example',
  },
  {
    type: 'talent',
    slug: 'the-boardwalk-brass',
    displayName: 'The Boardwalk Brass',
    tagline: 'Seven-piece brass band. Loud, in a good way.',
    bio: 'Second-line energy for festivals, parades, and anything that needs a horn section.',
    city: 'Myrtle Beach, SC',
    genres: 'brass,funk,live band',
    socials: { instagram: 'boardwalkbrass', youtube: 'boardwalkbrass', facebook: 'boardwalkbrass' },
    venmo: 'myrtle365-demo-brass',
  },
  {
    type: 'venue',
    slug: 'the-tide-room',
    displayName: 'The Tide Room',
    tagline: 'Oceanfront bar with live music six nights a week.',
    bio: 'Capacity 220. Full kitchen until midnight. Booking talent year-round.',
    city: 'Myrtle Beach, SC',
    socials: { instagram: 'thetideroom', facebook: 'thetideroom', google_business: 'ChIJdemoTideRoom' },
    venmo: 'myrtle365-demo-tideroom',
    payoutVenmo: 'myrtle365-demo-tideroom-payouts',
  },
  {
    type: 'venue',
    slug: 'inlet-social-club',
    displayName: 'Inlet Social Club',
    tagline: 'Marsh-side patio, acoustic sets, and oysters.',
    bio: 'Smaller room, listening-friendly crowd. Books duos and solo acts Thursday–Sunday.',
    city: 'Murrells Inlet, SC',
    socials: { instagram: 'inletsocialclub', facebook: 'inletsocialclub' },
    zelle: 'demo-inlet@myrtle365.example',
  },
  {
    type: 'fan',
    slug: 'dana-r',
    displayName: 'Dana R.',
    tagline: 'Front row since 2019.',
    city: 'Conway, SC',
    socials: { instagram: 'danarides', tiktok: 'danarides' },
  },
  {
    type: 'fan',
    slug: 'marcus-t',
    displayName: 'Marcus T.',
    tagline: 'Will drive an hour for a good horn section.',
    city: 'Myrtle Beach, SC',
    socials: { instagram: 'marcust' },
  },
  { type: 'fan', slug: 'priya-s', displayName: 'Priya S.', city: 'Surfside Beach, SC' },
  { type: 'fan', slug: 'evan-w', displayName: 'Evan W.', city: 'North Myrtle Beach, SC' },
];

/** [fanSlug | null, talentSlug, dollars, status, context] */
const TIPS: Array<[string | null, string, number, 'opened' | 'self_reported' | 'artist_confirmed', 'profile' | 'event' | 'venue_qr']> = [
  ['dana-r', 'salt-line-trio', 20, 'artist_confirmed', 'venue_qr'],
  ['dana-r', 'salt-line-trio', 50, 'artist_confirmed', 'event'],
  ['dana-r', 'the-boardwalk-brass', 20, 'self_reported', 'profile'],
  ['dana-r', 'dj-kass', 10, 'artist_confirmed', 'event'],
  ['marcus-t', 'the-boardwalk-brass', 100, 'artist_confirmed', 'event'],
  ['marcus-t', 'the-boardwalk-brass', 20, 'self_reported', 'venue_qr'],
  ['marcus-t', 'salt-line-trio', 10, 'self_reported', 'profile'],
  ['priya-s', 'harbor-lights-duo', 25, 'artist_confirmed', 'venue_qr'],
  ['priya-s', 'dj-kass', 5, 'self_reported', 'profile'],
  ['evan-w', 'dj-kass', 5, 'self_reported', 'event'],
  // An opened-but-never-reported tip: the fan launched Venmo and we never heard
  // back. Must NOT appear in any total.
  ['evan-w', 'salt-line-trio', 40, 'opened', 'profile'],
  // Anonymous tip: counts for the talent, has no fan to rank.
  [null, 'salt-line-trio', 15, 'self_reported', 'venue_qr'],
];

async function main() {
  // Idempotent: wipe and rebuild so `npm run db:seed` is safe to re-run.
  await prisma.tip.deleteMany();
  await prisma.socialConnection.deleteMany();
  await prisma.paymentHandle.deleteMany();
  await prisma.profile.deleteMany();

  const idBySlug = new Map<string, string>();

  for (const p of PROFILES) {
    const profile = await prisma.profile.create({
      data: {
        type: p.type,
        slug: p.slug,
        displayName: p.displayName,
        tagline: p.tagline ?? null,
        bio: p.bio ?? null,
        city: p.city ?? null,
        genres: p.genres ?? null,
      },
    });
    idBySlug.set(p.slug, profile.id);

    for (const [platform, handle] of Object.entries(p.socials ?? {})) {
      await prisma.socialConnection.create({
        data: {
          profileId: profile.id,
          platform,
          handle,
          url: buildProfileUrl(platform as SocialPlatform, handle),
          mode: 'link',
        },
      });
    }

    if (p.venmo) {
      await prisma.paymentHandle.create({
        data: { profileId: profile.id, provider: 'venmo', handleOrAccount: p.venmo },
      });
    }
    if (p.zelle) {
      await prisma.paymentHandle.create({
        data: { profileId: profile.id, provider: 'zelle', handleOrAccount: p.zelle },
      });
    }
    if (p.payoutVenmo) {
      await prisma.paymentHandle.create({
        data: {
          profileId: profile.id,
          provider: 'venmo',
          handleOrAccount: p.payoutVenmo,
          isPayout: true,
        },
      });
    }
  }

  for (const [fanSlug, talentSlug, dollars, status, context] of TIPS) {
    const toTalentId = idBySlug.get(talentSlug);
    if (!toTalentId) throw new Error(`Seed references unknown talent: ${talentSlug}`);

    await prisma.tip.create({
      data: {
        fromFanId: fanSlug ? (idBySlug.get(fanSlug) ?? null) : null,
        toTalentId,
        amountCents: dollars * 100,
        provider: 'venmo',
        context,
        status,
        confirmedAt: status === 'artist_confirmed' ? new Date() : null,
      },
    });
  }

  console.log(`Seeded ${PROFILES.length} profiles and ${TIPS.length} tips.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
