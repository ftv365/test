import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPaymentProvider, isTipContext } from '@/lib/enums';
import { MAX_TIP_CENTS, MIN_TIP_CENTS } from '@/lib/payments';

/**
 * Opens a handle-handoff tip.
 *
 * This records intent only — status starts at "opened". The money moves inside
 * Venmo/Zelle where we have no visibility, so nothing here should be read as a
 * settled payment.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { talentSlug, fanSlug, amountCents, provider, context, note } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof talentSlug !== 'string' || !talentSlug) {
    return NextResponse.json({ error: 'talentSlug is required.' }, { status: 400 });
  }
  if (typeof provider !== 'string' || !isPaymentProvider(provider)) {
    return NextResponse.json({ error: 'provider must be "venmo" or "zelle".' }, { status: 400 });
  }
  if (
    typeof amountCents !== 'number' ||
    !Number.isInteger(amountCents) ||
    amountCents < MIN_TIP_CENTS ||
    amountCents > MAX_TIP_CENTS
  ) {
    return NextResponse.json(
      { error: `amountCents must be an integer between ${MIN_TIP_CENTS} and ${MAX_TIP_CENTS}.` },
      { status: 400 },
    );
  }

  const tipContext = typeof context === 'string' && isTipContext(context) ? context : 'profile';

  const talent = await prisma.profile.findUnique({ where: { slug: talentSlug } });
  if (!talent) {
    return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
  }
  if (talent.type === 'fan') {
    return NextResponse.json({ error: 'Fans cannot receive tips.' }, { status: 400 });
  }

  const recipientHandle = await prisma.paymentHandle.findFirst({
    where: { profileId: talent.id, provider, isPayout: false },
  });
  if (!recipientHandle) {
    return NextResponse.json(
      { error: `${talent.displayName} has not connected ${provider}.` },
      { status: 400 },
    );
  }

  let fanId: string | null = null;
  if (typeof fanSlug === 'string' && fanSlug) {
    const fan = await prisma.profile.findUnique({ where: { slug: fanSlug } });
    if (!fan) return NextResponse.json({ error: 'Fan not found.' }, { status: 404 });
    fanId = fan.id;
  }

  const tip = await prisma.tip.create({
    data: {
      fromFanId: fanId,
      toTalentId: talent.id,
      amountCents,
      provider,
      context: tipContext,
      note: typeof note === 'string' && note ? note.slice(0, 140) : null,
      status: 'opened',
    },
  });

  return NextResponse.json({ tip: { id: tip.id, status: tip.status } }, { status: 201 });
}
