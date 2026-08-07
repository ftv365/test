import QRCode from 'qrcode';

/**
 * QRs are rendered server-side into data URLs so profile and print pages stay
 * fully server-rendered and need no client-side QR bundle.
 */
export async function qrDataUrl(payload: string, size = 320): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}
