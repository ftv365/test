import { prisma } from '@/lib/db';
import { ProfileCard } from '@/components/ProfileCard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Talent — Myrtle365' };

export default async function TalentPage() {
  const profiles = await prisma.profile.findMany({
    where: { type: 'talent' },
    orderBy: { displayName: 'asc' },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Talent</h1>
      <p className="mt-1 text-slate-600">Musicians, DJs, comedians, and performers across the Grand Strand.</p>

      {profiles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No profiles yet. Run <code className="font-mono">npm run db:seed</code> to load staging data.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
