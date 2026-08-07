import { PROVIDER_LABELS, type PaymentProvider } from './enums';

/**
 * Handle Handoff (Model A) link building.
 *
 * Myrtle365 is never in the money flow: we hand the fan off to the recipient's
 * own Venmo/Zelle and the payment settles there. That constrains what we can
 * build here, per provider:
 *
 *   Venmo — no marketplace API, but the documented `venmo://paycharge` scheme
 *           and the venmo.com/<handle> web URL both accept a prefilled amount
 *           and note. So we can deep-link AND generate our own QR.
 *
 *   Zelle — bank-to-bank, no public deep-link or QR spec we can construct.
 *           The honest answer is: show the handle for manual entry and let the
 *           recipient upload the QR their own banking app generates. Anything
 *           else would be a guessed URL scheme that silently fails on device.
 */

export interface HandoffInput {
  provider: PaymentProvider;
  handleOrAccount: string;
  amountCents?: number;
  note?: string;
}

export interface Handoff {
  provider: PaymentProvider;
  providerLabel: string;
  /** Native app scheme. Null when the provider has no public scheme (Zelle). */
  deepLink: string | null;
  /** Browser-openable URL. Null when the provider has no web pay URL (Zelle). */
  webUrl: string | null;
  /** What the QR should encode. Null when we cannot construct one. */
  qrPayload: string | null;
  /** Shown when the fan has to complete the payment by hand. */
  manualInstructions: string | null;
}

export function formatAmount(amountCents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100);
}

/** Venmo wants a decimal string like "10" or "12.50", not cents. */
export function centsToVenmoAmount(amountCents: number): string {
  const value = amountCents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function buildHandoff({ provider, handleOrAccount, amountCents, note }: HandoffInput): Handoff {
  const handle = handleOrAccount.trim().replace(/^@/, '');

  if (provider === 'venmo') {
    const params = new URLSearchParams({ txn: 'pay' });
    if (amountCents !== undefined) params.set('amount', centsToVenmoAmount(amountCents));
    if (note) params.set('note', note);

    const deepParams = new URLSearchParams(params);
    deepParams.set('recipients', handle);

    const webUrl = `https://venmo.com/${encodeURIComponent(handle)}?${params.toString()}`;
    return {
      provider,
      providerLabel: PROVIDER_LABELS.venmo,
      deepLink: `venmo://paycharge?${deepParams.toString()}`,
      webUrl,
      // The web URL is the right QR payload: it opens the Venmo app when one is
      // installed and degrades to the web profile when it is not.
      qrPayload: webUrl,
      manualInstructions: null,
    };
  }

  const amountText = amountCents !== undefined ? ` ${formatAmount(amountCents)}` : '';
  return {
    provider: 'zelle',
    providerLabel: PROVIDER_LABELS.zelle,
    deepLink: null,
    webUrl: null,
    qrPayload: null,
    manualInstructions:
      `Open your bank's app, choose Zelle, and send${amountText} to ${handle}.` +
      ' Zelle has no public payment link, so this step can\'t be automated.',
  };
}

/** Preset tip amounts, in cents. Locked v1 scope: $5 / $10 / $20 / custom. */
export const TIP_PRESETS_CENTS = [500, 1000, 2000] as const;

export const MIN_TIP_CENTS = 100;
export const MAX_TIP_CENTS = 50_000;

/**
 * Parses a user-typed amount ("12", "$12.50", " 12.5 ") into cents.
 * Returns null for anything unparseable or out of range — callers must treat
 * null as a validation failure rather than defaulting to a preset.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const cents = Math.round(Number.parseFloat(cleaned) * 100);
  if (!Number.isFinite(cents)) return null;
  if (cents < MIN_TIP_CENTS || cents > MAX_TIP_CENTS) return null;
  return cents;
}

/**
 * v1 takes no platform cut — 100% of every tip reaches the talent. This exists
 * so the invariant is asserted in tests rather than implied by the absence of
 * code, and so a future processed-payments phase has one place to change.
 */
export const PLATFORM_FEE_BPS = 0;

export function splitTip(amountCents: number): { toTalentCents: number; platformFeeCents: number } {
  const platformFeeCents = Math.round((amountCents * PLATFORM_FEE_BPS) / 10_000);
  return { toTalentCents: amountCents - platformFeeCents, platformFeeCents };
}
