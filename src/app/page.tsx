import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ProfileCard } from '@/components/ProfileCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [talent, venues, counts] = await Promise.all([
    prisma.profile.findMany({ where: { type: 'talent' }, take: 4, orderBy: { displayName: 'asc' } }),
    prisma.profile.findMany({ where: { type: 'venue' }, take: 2, orderBy: { displayName: 'asc' } }),
    prisma.profile.groupBy({ by: ['type'], _count: true }),
  ]);

  const countFor = (type: string) => counts.find((c) => c.type === type)?._count ?? 0;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Live entertainment, every day of the year.</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Myrtle365 connects fans, talent, and venues. Follow artists everywhere they post, and tip
          them directly — 100% of every tip goes to the artist.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/talent"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Browse talent
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:border-slate-400"
          >
            Superfan leaderboard
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {(['talent', 'venue', 'fan'] as const).map((type) => (
          <div key={type} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold">{countFor(type)}</p>
            <p className="text-sm capitalize text-slate-500">{type}s</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Featured talent</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {talent.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Venues</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </section>
    </div>
  );
}
