import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Staging smoke check: is the app up and can it reach its database? */
export async function GET() {
  try {
    const profiles = await prisma.profile.count();
    return NextResponse.json({ status: 'ok', database: 'reachable', profiles });
  } catch (error) {
    return NextResponse.json(
      { status: 'degraded', database: 'unreachable', error: String(error) },
      { status: 503 },
    );
  }
}
