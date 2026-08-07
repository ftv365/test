import { prisma } from './db';
import { COUNTED_TIP_STATUSES } from './enums';
import { rankLeaderboard, type LeaderboardRow, type RankedRow } from './badges';

/**
 * Aggregates counted tips (self-reported + artist-confirmed) into leaderboard
 * rows. `scope` picks the axis: top tipping fans, or top-earning talent.
 */
export async function leaderboard(
  scope: 'fans' | 'talent',
  options: { talentId?: string; limit?: number } = {},
): Promise<RankedRow[]> {
  const { talentId, limit = 25 } = options;

  const tips = await prisma.tip.findMany({
    where: {
      status: { in: COUNTED_TIP_STATUSES },
      ...(talentId ? { toTalentId: talentId } : {}),
      // A fan leaderboard can only rank identified fans; anonymous tips still
      // count toward the talent's total but have nobody to attribute.
      ...(scope === 'fans' ? { fromFanId: { not: null } } : {}),
    },
    include: {
      fromFan: { select: { id: true, slug: true, displayName: true } },
      toTalent: { select: { id: true, slug: true, displayName: true } },
    },
  });

  const byProfile = new Map<string, LeaderboardRow>();
  for (const tip of tips) {
    const subject = scope === 'fans' ? tip.fromFan : tip.toTalent;
    if (!subject) continue;

    const row = byProfile.get(subject.id) ?? {
      profileId: subject.id,
      slug: subject.slug,
      displayName: subject.displayName,
      totalCents: 0,
      tipCount: 0,
      confirmedCents: 0,
    };
    row.totalCents += tip.amountCents;
    row.tipCount += 1;
    if (tip.status === 'artist_confirmed') row.confirmedCents += tip.amountCents;
    byProfile.set(subject.id, row);
  }

  return rankLeaderboard([...byProfile.values()]).slice(0, limit);
}

export interface TipTotals {
  totalCents: number;
  confirmedCents: number;
  tipCount: number;
  supporterCount: number;
}

export async function totalsForTalent(talentId: string): Promise<TipTotals> {
  const tips = await prisma.tip.findMany({
    where: { toTalentId: talentId, status: { in: COUNTED_TIP_STATUSES } },
    select: { amountCents: true, status: true, fromFanId: true },
  });

  const supporters = new Set<string>();
  let totalCents = 0;
  let confirmedCents = 0;
  for (const tip of tips) {
    totalCents += tip.amountCents;
    if (tip.status === 'artist_confirmed') confirmedCents += tip.amountCents;
    if (tip.fromFanId) supporters.add(tip.fromFanId);
  }

  return { totalCents, confirmedCents, tipCount: tips.length, supporterCount: supporters.size };
}

export async function totalsForFan(fanId: string): Promise<TipTotals & { artistCount: number }> {
  const tips = await prisma.tip.findMany({
    where: { fromFanId: fanId, status: { in: COUNTED_TIP_STATUSES } },
    select: { amountCents: true, status: true, toTalentId: true },
  });

  const artists = new Set<string>();
  let totalCents = 0;
  let confirmedCents = 0;
  for (const tip of tips) {
    totalCents += tip.amountCents;
    if (tip.status === 'artist_confirmed') confirmedCents += tip.amountCents;
    artists.add(tip.toTalentId);
  }

  return {
    totalCents,
    confirmedCents,
    tipCount: tips.length,
    supporterCount: 0,
    artistCount: artists.size,
  };
}
