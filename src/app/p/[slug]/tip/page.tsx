import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TipFlow } from '@/components/TipFlow';
import { isPaymentProvider, isTipContext, type TipContext } from '@/lib/enums';

export const dynamic = 'force-dynamic';

export default async function TipPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ context?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { paymentHandles: { where: { isPayout: false } } },
  });
  if (!profile || profile.type === 'fan') notFound();

  // Staging stands in for auth: the fan picks who they are from the seeded list.
  const fans = await prisma.profile.findMany({
    where: { type: 'fan' },
    select: { slug: true, displayName: true },
    orderBy: { displayName: 'asc' },
  });

  const context: TipContext =
    query.context && isTipContext(query.context) ? query.context : 'profile';

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/p/${profile.slug}`} className="text-sm text-slate-500 hover:text-brand-600">
        ← {profile.displayName}
      </Link>

      <TipFlow
        talentSlug={profile.slug}
        talentName={profile.displayName}
        context={context}
        fanOptions={fans}
        handles={profile.paymentHandles
          .filter((h) => isPaymentProvider(h.provider))
          .map((h) => ({
            provider: h.provider as 'venmo' | 'zelle',
            handleOrAccount: h.handleOrAccount,
            qrAssetUrl: h.qrAssetUrl,
          }))}
      />
    </div>
  );
}
