import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SocialBar } from '@/components/SocialBar';
import { formatAmount } from '@/lib/payments';
import { PROVIDER_LABELS, type PaymentProvider } from '@/lib/enums';
import { leaderboard, totalsForFan, totalsForTalent } from '@/lib/tips';
import { badgeFor } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: {
      socialConnections: true,
      paymentHandles: { where: { isPayout: false } },
    },
  });
  if (!profile) notFound();

  const canReceiveTips = profile.type !== 'fan' && profile.paymentHandles.length > 0;
  const genres = profile.genres?.split(',').map((g) => g.trim()).filter(Boolean) ?? [];

  return (
    <div className="space-y-8">
      <header>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-500">
          {profile.type}
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{profile.displayName}</h1>
        {profile.tagline && <p className="mt-1 text-lg text-slate-600">{profile.tagline}</p>}
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
          {profile.city && <span>{profile.city}</span>}
          {genres.map((genre) => (
            <span key={genre} className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
              {genre}
            </span>
          ))}
        </div>
      </header>

      {profile.bio && <p className="max-w-2xl text-slate-700">{profile.bio}</p>}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Find {profile.displayName} everywhere
        </h2>
        <SocialBar
          links={profile.socialConnections.map((c) => ({
            platform: c.platform,
            handle: c.handle,
            url: c.url,
          }))}
        />
      </section>

      {canReceiveTips && <TipSection profile={profile} />}

      {profile.type === 'talent' && <TalentSupport talentId={profile.id} />}
      {profile.type === 'fan' && <FanHistory fanId={profile.id} />}
    </div>
  );
}

function TipSection({
  profile,
}: {
  profile: { slug: string; displayName: string; type: string; paymentHandles: { provider: string }[] };
}) {
  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50 p-5">
      <h2 className="text-lg font-semibold text-brand-900">
        {profile.type === 'venue' ? 'Tip the performers tonight' : `Support ${profile.displayName}`}
      </h2>
      <p className="mt-1 text-sm text-brand-900/80">
        Pay directly with {profile.paymentHandles.map((h) => PROVIDER_LABELS[h.provider as PaymentProvider]).join(' or ')}.
        Myrtle365 takes 0% — the full amount goes to the artist.
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          href={`/p/${profile.slug}/tip`}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Tip / Support
        </Link>
        <Link
          href={`/p/${profile.slug}/qr`}
          className="rounded-lg border border-brand-300 bg-white px-4 py-2 font-medium text-brand-700"
        >
          Printable QR
        </Link>
      </div>
    </section>
  );
}

async function TalentSupport({ talentId }: { talentId: string }) {
  const [totals, topFans] = await Promise.all([
    totalsForTalent(talentId),
    leaderboard('fans', { talentId, limit: 5 }),
  ]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Superfans
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Reported tips" value={formatAmount(totals.totalCents)} />
        <Stat label="Confirmed" value={formatAmount(totals.confirmedCents)} />
        <Stat label="Supporters" value={String(totals.supporterCount)} />
      </div>

      {topFans.length > 0 && (
        <ol className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {topFans.map((fan) => (
            <li key={fan.profileId} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="w-5 text-sm text-slate-400">{fan.rank}</span>
                <Link href={`/p/${fan.slug}`} className="font-medium hover:text-brand-600">
                  {fan.displayName}
                </Link>
                {fan.badge && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                    {fan.badge.label}
                  </span>
                )}
              </span>
              <span className="text-sm text-slate-600">{formatAmount(fan.totalCents)}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-2 text-xs text-slate-500">
        Tips move directly through Venmo/Zelle, so these totals are self-reported by fans and
        confirmed by the artist — not audited payment records.
      </p>
    </section>
  );
}

async function FanHistory({ fanId }: { fanId: string }) {
  const totals = await totalsForFan(fanId);
  const badge = badgeFor(totals.totalCents);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Tipping history
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Artists tipped" value={String(totals.artistCount)} />
        <Stat label="Total reported" value={formatAmount(totals.totalCents)} />
        <Stat label="Badge" value={badge?.label ?? '—'} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
