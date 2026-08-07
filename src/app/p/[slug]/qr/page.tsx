import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { qrDataUrl } from '@/lib/qr';

export const dynamic = 'force-dynamic';

/**
 * Printable table tent / stage sign.
 *
 * The QR points at the Myrtle365 tip page rather than straight at Venmo: that
 * keeps the amount presets, works when the artist later changes handles, and
 * lets the venue_qr context be attributed. A phone scanning this is not on
 * localhost, so the origin comes from NEXT_PUBLIC_SITE_URL.
 */
export default async function PrintableQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { paymentHandles: { where: { isPayout: false } } },
  });
  if (!profile || profile.type === 'fan') notFound();

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const tipUrl = `${origin.replace(/\/$/, '')}/p/${profile.slug}/tip?context=venue_qr`;
  const dataUrl = await qrDataUrl(tipUrl, 512);

  return (
    <div className="mx-auto max-w-md">
      <p className="no-print mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        Print this page (⌘P) for the table or stage. QR points to{' '}
        <span className="font-mono break-all">{tipUrl}</span>
      </p>

      <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Tip the artist
        </p>
        <h1 className="mt-2 text-3xl font-bold">{profile.displayName}</h1>
        {profile.tagline && <p className="mt-1 text-slate-600">{profile.tagline}</p>}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`Tip ${profile.displayName}`} className="mx-auto mt-6 h-64 w-64" />

        <p className="mt-4 text-lg font-medium">Scan to tip</p>
        <p className="mt-1 text-sm text-slate-600">
          {profile.paymentHandles.map((h) => `${h.provider}: ${h.handleOrAccount}`).join('  ·  ')}
        </p>
        <p className="mt-4 text-xs text-slate-500">
          100% goes to the artist. Myrtle365 takes no cut.
        </p>
      </div>
    </div>
  );
}
