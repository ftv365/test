import Link from 'next/link';
import { leaderboard } from '@/lib/tips';
import { formatAmount } from '@/lib/payments';
import { BADGES } from '@/lib/badges';
import type { RankedRow } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Superfan leaderboard — Myrtle365' };

export default async function LeaderboardPage() {
  const [fans, talent] = await Promise.all([leaderboard('fans'), leaderboard('talent')]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Superfan leaderboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Tips are sent directly through Venmo and Zelle, so Myrtle365 never sees the transaction.
          These standings come from fans reporting their own tips and artists confirming them —
          treat them as recognition, not receipts.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <Board title="Top supporters" rows={fans} emptyText="No fan tips reported yet." />
        <Board title="Most supported talent" rows={talent} emptyText="No tips reported yet." />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map((badge) => (
            <div key={badge.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold">{badge.label}</p>
              <p className="text-xs text-slate-500">{badge.blurb}</p>
              <p className="mt-2 text-xs text-brand-700">
                {formatAmount(badge.thresholdCents)}+ reported
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Board({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: RankedRow[];
  emptyText: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.profileId} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-sm text-slate-400">{row.rank}</span>
                <Link href={`/p/${row.slug}`} className="truncate font-medium hover:text-brand-600">
                  {row.displayName}
                </Link>
                {row.badge && (
                  <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                    {row.badge.label}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="font-medium">{formatAmount(row.totalCents)}</span>
                <span className="block text-xs text-slate-400">{row.tipCount} tips</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
