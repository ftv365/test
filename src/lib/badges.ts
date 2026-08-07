/**
 * Superfan badges.
 *
 * Caveat that drives every design choice here: under handle-handoff we never
 * see the money move. Totals are self-reported by fans and optionally confirmed
 * by the artist, so badges are recognition, not accounting. The UI must say so.
 */

export interface Badge {
  key: string;
  label: string;
  /** Minimum counted (self-reported or artist-confirmed) total, in cents. */
  thresholdCents: number;
  blurb: string;
}

export const BADGES: Badge[] = [
  { key: 'supporter', label: 'Supporter', thresholdCents: 500, blurb: 'Tipped at least once.' },
  { key: 'regular', label: 'Regular', thresholdCents: 5_000, blurb: 'Shows up and shows out.' },
  { key: 'superfan', label: 'Superfan', thresholdCents: 15_000, blurb: 'Top-tier support.' },
  { key: 'patron', label: 'Patron', thresholdCents: 50_000, blurb: 'Keeping the lights on.' },
];

export function badgeFor(totalCents: number): Badge | null {
  let earned: Badge | null = null;
  for (const badge of BADGES) {
    if (totalCents >= badge.thresholdCents) earned = badge;
  }
  return earned;
}

export function nextBadge(totalCents: number): { badge: Badge; remainingCents: number } | null {
  const upcoming = BADGES.find((b) => totalCents < b.thresholdCents);
  if (!upcoming) return null;
  return { badge: upcoming, remainingCents: upcoming.thresholdCents - totalCents };
}

export interface LeaderboardRow {
  profileId: string;
  slug: string;
  displayName: string;
  totalCents: number;
  tipCount: number;
  /** Only tips the recipient explicitly confirmed. */
  confirmedCents: number;
}

export interface RankedRow extends LeaderboardRow {
  rank: number;
  badge: Badge | null;
}

/**
 * Ranks by total, breaking ties by confirmed amount then tip count then name,
 * so the ordering is stable across requests. Equal totals share a rank.
 */
export function rankLeaderboard(rows: LeaderboardRow[]): RankedRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.totalCents - a.totalCents ||
      b.confirmedCents - a.confirmedCents ||
      b.tipCount - a.tipCount ||
      a.displayName.localeCompare(b.displayName),
  );

  let lastTotal: number | null = null;
  let lastRank = 0;
  return sorted.map((row, index) => {
    const rank = row.totalCents === lastTotal ? lastRank : index + 1;
    lastTotal = row.totalCents;
    lastRank = rank;
    return { ...row, rank, badge: badgeFor(row.totalCents) };
  });
}
