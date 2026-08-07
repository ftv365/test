import { NextResponse } from 'next/server';
import { qrDataUrl } from '@/lib/qr';

const MAX_QR_PAYLOAD = 512;

/** Renders a QR as a data URL so client components don't ship a QR library. */
export async function GET(request: Request) {
  const text = new URL(request.url).searchParams.get('text');
  if (!text) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
  }
  if (text.length > MAX_QR_PAYLOAD) {
    return NextResponse.json({ error: 'text is too long to encode.' }, { status: 400 });
  }

  return NextResponse.json({ dataUrl: await qrDataUrl(text) });
}
