import { describe, expect, it } from 'vitest';
import {
  MAX_TIP_CENTS,
  MIN_TIP_CENTS,
  PLATFORM_FEE_BPS,
  buildHandoff,
  centsToVenmoAmount,
  formatAmount,
  parseAmountToCents,
  splitTip,
} from '@/lib/payments';

describe('parseAmountToCents', () => {
  it('parses plain and decorated amounts', () => {
    expect(parseAmountToCents('10')).toBe(1000);
    expect(parseAmountToCents('$12.50')).toBe(1250);
    expect(parseAmountToCents('  7.05 ')).toBe(705);
  });

  it('strips thousands separators before range-checking', () => {
    // "1,000" parses cleanly to 100000 cents and is then rejected for being
    // over the cap — not rejected as unparseable.
    expect(parseAmountToCents('1,000')).toBeNull();
    expect(100_000).toBeGreaterThan(MAX_TIP_CENTS);
  });

  it('rejects junk rather than falling back to a default', () => {
    for (const input of ['', 'abc', '10.999', '-5', '1e3', '$', '5..0']) {
      expect(parseAmountToCents(input)).toBeNull();
    }
  });

  it('enforces the tip range', () => {
    expect(parseAmountToCents('0.99')).toBeNull();
    expect(parseAmountToCents('1')).toBe(MIN_TIP_CENTS);
    expect(parseAmountToCents('500')).toBe(MAX_TIP_CENTS);
    expect(parseAmountToCents('500.01')).toBeNull();
  });
});

describe('centsToVenmoAmount', () => {
  it('emits whole numbers without decimals and cents with two places', () => {
    expect(centsToVenmoAmount(1000)).toBe('10');
    expect(centsToVenmoAmount(1250)).toBe('12.50');
    expect(centsToVenmoAmount(705)).toBe('7.05');
  });

  it('never emits fractional cents', () => {
    for (const cents of [1, 99, 100, 1337, 49_999]) {
      expect(centsToVenmoAmount(cents)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });
});

describe('buildHandoff — venmo', () => {
  const handoff = buildHandoff({
    provider: 'venmo',
    handleOrAccount: '@myrtle365-demo-saltline',
    amountCents: 2000,
    note: 'Great set!',
  });

  it('strips the leading @ from the handle', () => {
    expect(handoff.webUrl).toContain('/myrtle365-demo-saltline?');
    expect(handoff.webUrl).not.toContain('@');
  });

  it('prefills amount and note on both the web URL and the deep link', () => {
    for (const link of [handoff.webUrl, handoff.deepLink]) {
      expect(link).toContain('txn=pay');
      expect(link).toContain('amount=20');
      expect(link).toContain('note=Great+set%21');
    }
  });

  it('puts the recipient in the deep link params, not the path', () => {
    expect(handoff.deepLink).toContain('recipients=myrtle365-demo-saltline');
    expect(handoff.deepLink!.startsWith('venmo://paycharge?')).toBe(true);
  });

  it('encodes the web URL as the QR payload so it works with or without the app', () => {
    expect(handoff.qrPayload).toBe(handoff.webUrl);
  });
});

describe('buildHandoff — zelle', () => {
  const handoff = buildHandoff({
    provider: 'zelle',
    handleOrAccount: 'demo@myrtle365.example',
    amountCents: 2500,
  });

  it('does not invent a deep link, web URL, or QR', () => {
    expect(handoff.deepLink).toBeNull();
    expect(handoff.webUrl).toBeNull();
    expect(handoff.qrPayload).toBeNull();
  });

  it('falls back to manual instructions carrying the amount and handle', () => {
    expect(handoff.manualInstructions).toContain('$25.00');
    expect(handoff.manualInstructions).toContain('demo@myrtle365.example');
  });
});

describe('platform cut', () => {
  it('is zero — 100% of every tip reaches the talent', () => {
    expect(PLATFORM_FEE_BPS).toBe(0);
    for (const cents of [100, 500, 1337, 50_000]) {
      const { toTalentCents, platformFeeCents } = splitTip(cents);
      expect(platformFeeCents).toBe(0);
      expect(toTalentCents).toBe(cents);
    }
  });
});

describe('formatAmount', () => {
  it('renders cents as USD', () => {
    expect(formatAmount(500)).toBe('$5.00');
    expect(formatAmount(123_456)).toBe('$1,234.56');
  });
});
