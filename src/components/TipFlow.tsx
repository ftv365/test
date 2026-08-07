'use client';

import { useState } from 'react';
import {
  TIP_PRESETS_CENTS,
  buildHandoff,
  formatAmount,
  parseAmountToCents,
} from '@/lib/payments';
import { PROVIDER_LABELS, type PaymentProvider, type TipContext } from '@/lib/enums';

export interface TipHandle {
  provider: PaymentProvider;
  handleOrAccount: string;
  qrAssetUrl: string | null;
}

export interface FanOption {
  slug: string;
  displayName: string;
}

interface Props {
  talentSlug: string;
  talentName: string;
  handles: TipHandle[];
  fanOptions: FanOption[];
  context: TipContext;
}

type Stage = 'choose' | 'handoff' | 'reported';

export function TipFlow({ talentSlug, talentName, handles, fanOptions, context }: Props) {
  const [provider, setProvider] = useState<PaymentProvider>(handles[0]?.provider ?? 'venmo');
  const [presetCents, setPresetCents] = useState<number | null>(TIP_PRESETS_CENTS[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [fanSlug, setFanSlug] = useState<string>(fanOptions[0]?.slug ?? '');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<Stage>('choose');
  const [tipId, setTipId] = useState<string | null>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = handles.find((h) => h.provider === provider);
  const amountCents = presetCents ?? parseAmountToCents(customAmount);
  const amountInvalid = amountCents === null;

  const handoff =
    handle && amountCents !== null
      ? buildHandoff({
          provider,
          handleOrAccount: handle.handleOrAccount,
          amountCents,
          note: note || `Tip for ${talentName} via Myrtle365`,
        })
      : null;

  if (handles.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {talentName} hasn&apos;t connected a Venmo or Zelle handle yet.
      </p>
    );
  }

  async function startHandoff() {
    if (amountCents === null || !handoff) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          talentSlug,
          fanSlug: fanSlug || null,
          amountCents,
          provider,
          context,
          note: note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start the tip.');

      setTipId(data.tip.id);
      setStage('handoff');

      if (handoff.qrPayload) {
        const qrRes = await fetch(`/api/qr?text=${encodeURIComponent(handoff.qrPayload)}`);
        if (qrRes.ok) setQrSrc((await qrRes.json()).dataUrl);
      }

      // Only Venmo has a link we can actually open. Zelle stays manual.
      if (handoff.webUrl) window.open(handoff.webUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function markTipped() {
    if (!tipId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tips/${tipId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'self_reported' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not record the tip.');
      setStage('reported');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      {stage === 'choose' && (
        <>
          <div>
            <h2 className="text-lg font-semibold">Tip {talentName}</h2>
            <p className="mt-1 text-sm text-slate-600">
              100% goes straight to {talentName}. Myrtle365 takes no cut and never touches the
              money.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Amount</legend>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS_CENTS.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => {
                    setPresetCents(cents);
                    setCustomAmount('');
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    presetCents === cents
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {formatAmount(cents)}
                </button>
              ))}
              <input
                inputMode="decimal"
                placeholder="Custom"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setPresetCents(null);
                }}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                aria-label="Custom tip amount"
              />
            </div>
            {presetCents === null && customAmount !== '' && amountInvalid && (
              <p className="mt-2 text-xs text-red-600">Enter an amount between $1 and $500.</p>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Pay with</legend>
            <div className="flex gap-2">
              {handles.map((h) => (
                <button
                  key={h.provider}
                  type="button"
                  onClick={() => setProvider(h.provider)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    provider === h.provider
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {PROVIDER_LABELS[h.provider]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              placeholder="Great set tonight!"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {fanOptions.length > 0 && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tipping as</span>
              <select
                value={fanSlug}
                onChange={(e) => setFanSlug(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {fanOptions.map((fan) => (
                  <option key={fan.slug} value={fan.slug}>
                    {fan.displayName}
                  </option>
                ))}
                <option value="">Anonymous</option>
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Staging stand-in for signed-in identity — there is no auth yet.
              </span>
            </label>
          )}

          <button
            type="button"
            disabled={amountInvalid || busy}
            onClick={startHandoff}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white disabled:bg-slate-300"
          >
            {amountCents !== null
              ? `Tip ${formatAmount(amountCents)} with ${PROVIDER_LABELS[provider]}`
              : 'Choose an amount'}
          </button>
        </>
      )}

      {stage === 'handoff' && handoff && (
        <>
          <h2 className="text-lg font-semibold">Finish in {handoff.providerLabel}</h2>

          {handoff.manualInstructions ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <p>{handoff.manualInstructions}</p>
              <p className="mt-3 font-mono text-base font-semibold">{handle?.handleOrAccount}</p>
              {handle?.qrAssetUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={handle.qrAssetUrl}
                  alt={`${talentName}'s Zelle QR code`}
                  className="mt-3 h-40 w-40"
                />
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                We opened {handoff.providerLabel} in a new tab. Didn&apos;t open?{' '}
                <a
                  className="font-medium text-brand-600 underline"
                  href={handoff.webUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tap here
                </a>
                {handoff.deepLink && (
                  <>
                    {' '}
                    or{' '}
                    <a className="font-medium text-brand-600 underline" href={handoff.deepLink}>
                      open the app
                    </a>
                  </>
                )}
                .
              </p>
              {qrSrc && (
                <div>
                  <p className="mb-2 text-slate-600">Or scan with your phone:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrSrc} alt="Tip QR code" className="h-44 w-44 rounded-lg border" />
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={markTipped}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:bg-slate-400"
          >
            I sent the tip
          </button>
          <p className="text-xs text-slate-500">
            We can&apos;t see payments made in Venmo or Zelle, so this is how the tip gets counted.
            {talentName} can confirm it afterwards.
          </p>
        </>
      )}

      {stage === 'reported' && (
        <div className="space-y-2 text-center">
          <p className="text-2xl">🎉</p>
          <h2 className="text-lg font-semibold">Thanks for supporting {talentName}</h2>
          <p className="text-sm text-slate-600">
            Your tip is logged as self-reported and counts toward the superfan leaderboard once{' '}
            {talentName} confirms it.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
