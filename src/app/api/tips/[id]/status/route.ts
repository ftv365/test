import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { TipStatus } from '@/lib/enums';

/**
 * Advances a tip's status.
 *
 * Allowed transitions are deliberately narrow: a fan self-reports, the
 * recipient confirms or disputes. Nothing walks a tip backwards, so a confirmed
 * tip can't be quietly downgraded to inflate or deflate a leaderboard.
 *
 * NOTE (staging): there is no auth yet, so "who is allowed to confirm" is not
 * enforced. Before this leaves staging, artist_confirmed/disputed must be
 * gated on the authenticated recipient.
 */
const ALLOWED_TRANSITIONS: Record<TipStatus, TipStatus[]> = {
  opened: ['self_reported'],
  self_reported: ['artist_confirmed', 'disputed'],
  artist_confirmed: [],
  disputed: [],
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (typeof status !== 'string' || !(status in ALLOWED_TRANSITIONS)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }

  const tip = await prisma.tip.findUnique({ where: { id } });
  if (!tip) return NextResponse.json({ error: 'Tip not found.' }, { status: 404 });

  const nextStatus = status as TipStatus;
  const allowed = ALLOWED_TRANSITIONS[tip.status as TipStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Cannot move a tip from "${tip.status}" to "${nextStatus}".` },
      { status: 409 },
    );
  }

  const updated = await prisma.tip.update({
    where: { id },
    data: {
      status: nextStatus,
      confirmedAt: nextStatus === 'artist_confirmed' ? new Date() : tip.confirmedAt,
    },
  });

  return NextResponse.json({ tip: { id: updated.id, status: updated.status } });
}
