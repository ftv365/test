import { describe, expect, it } from 'vitest';
import { BADGES, badgeFor, nextBadge, rankLeaderboard, type LeaderboardRow } from '@/lib/badges';
import { COUNTED_TIP_STATUSES } from '@/lib/enums';

const row = (over: Partial<LeaderboardRow> & { displayName: string; totalCents: number }): LeaderboardRow => ({
  profileId: over.displayName.toLowerCase(),
  slug: over.displayName.toLowerCase(),
  tipCount: 1,
  confirmedCents: 0,
  ...over,
});

describe('badgeFor', () => {
  it('awards nothing below the first threshold', () => {
    expect(badgeFor(0)).toBeNull();
    expect(badgeFor(499)).toBeNull();
  });

  it('awards the highest badge earned, not the first matched', () => {
    expect(badgeFor(500)?.key).toBe('supporter');
    expect(badgeFor(15_000)?.key).toBe('superfan');
    expect(badgeFor(999_999)?.key).toBe('patron');
  });

  it('treats each threshold as inclusive', () => {
    for (const badge of BADGES) {
      expect(badgeFor(badge.thresholdCents)?.key).toBe(badge.key);
      expect(badgeFor(badge.thresholdCents - 1)?.key).not.toBe(badge.key);
    }
  });
});

describe('nextBadge', () => {
  it('reports the gap to the next tier', () => {
    expect(nextBadge(0)).toEqual({ badge: BADGES[0], remainingCents: 500 });
    expect(nextBadge(500)?.badge.key).toBe('regular');
  });

  it('returns null once the top badge is earned', () => {
    expect(nextBadge(50_000)).toBeNull();
  });
});

describe('rankLeaderboard', () => {
  it('ranks by total descending', () => {
    const ranked = rankLeaderboard([
      row({ displayName: 'Low', totalCents: 100 }),
      row({ displayName: 'High', totalCents: 900 }),
      row({ displayName: 'Mid', totalCents: 500 }),
    ]);
    expect(ranked.map((r) => r.displayName)).toEqual(['High', 'Mid', 'Low']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('gives equal totals the same rank', () => {
    const ranked = rankLeaderboard([
      row({ displayName: 'A', totalCents: 500 }),
      row({ displayName: 'B', totalCents: 500 }),
      row({ displayName: 'C', totalCents: 100 }),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('breaks ties toward artist-confirmed money', () => {
    const ranked = rankLeaderboard([
      row({ displayName: 'SelfReported', totalCents: 500, confirmedCents: 0 }),
      row({ displayName: 'Confirmed', totalCents: 500, confirmedCents: 500 }),
    ]);
    expect(ranked[0].displayName).toBe('Confirmed');
  });

  it('is stable — same input, same order', () => {
    const rows = [
      row({ displayName: 'A', totalCents: 500 }),
      row({ displayName: 'B', totalCents: 500 }),
    ];
    expect(rankLeaderboard(rows).map((r) => r.displayName)).toEqual(
      rankLeaderboard([...rows].reverse()).map((r) => r.displayName),
    );
  });

  it('attaches the earned badge to each row', () => {
    const [top] = rankLeaderboard([row({ displayName: 'Whale', totalCents: 60_000 })]);
    expect(top.badge?.key).toBe('patron');
  });

  it('does not mutate the input array', () => {
    const rows = [row({ displayName: 'A', totalCents: 100 }), row({ displayName: 'B', totalCents: 900 })];
    rankLeaderboard(rows);
    expect(rows[0].displayName).toBe('A');
  });
});

describe('counted statuses', () => {
  it('excludes "opened" — launching the handoff is not evidence of payment', () => {
    expect(COUNTED_TIP_STATUSES).not.toContain('opened');
    expect(COUNTED_TIP_STATUSES).not.toContain('disputed');
    expect(COUNTED_TIP_STATUSES).toEqual(['self_reported', 'artist_confirmed']);
  });
});
