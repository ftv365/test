// SQLite has no native enums, so these unions are the source of truth for the
// String columns in prisma/schema.prisma. Keep the two in sync.

export const PROFILE_TYPES = ['fan', 'talent', 'venue'] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export const SOCIAL_PLATFORMS = [
  'instagram',
  'tiktok',
  'youtube',
  'spotify',
  'soundcloud',
  'bandcamp',
  'twitch',
  'x',
  'facebook',
  'google_business',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Phase 1 launch set — the rest are wired but not surfaced in onboarding. */
export const LAUNCH_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'youtube', 'spotify'];

export const CONNECTION_MODES = ['link', 'oauth'] as const;
export type ConnectionMode = (typeof CONNECTION_MODES)[number];

/** v1 is handle-handoff only; stripe/paypal are reserved for phase 3. */
export const PAYMENT_PROVIDERS = ['venmo', 'zelle'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const TIP_CONTEXTS = ['profile', 'event', 'venue_qr'] as const;
export type TipContext = (typeof TIP_CONTEXTS)[number];

export const TIP_STATUSES = ['opened', 'self_reported', 'artist_confirmed', 'disputed'] as const;
export type TipStatus = (typeof TIP_STATUSES)[number];

/**
 * Statuses that count toward leaderboards and totals. "opened" only means the
 * fan launched the Venmo/Zelle handoff — it is not evidence money moved.
 */
export const COUNTED_TIP_STATUSES: TipStatus[] = ['self_reported', 'artist_confirmed'];

export function isProfileType(v: string): v is ProfileType {
  return (PROFILE_TYPES as readonly string[]).includes(v);
}

export function isSocialPlatform(v: string): v is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(v);
}

export function isPaymentProvider(v: string): v is PaymentProvider {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(v);
}

export function isTipContext(v: string): v is TipContext {
  return (TIP_CONTEXTS as readonly string[]).includes(v);
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  twitch: 'Twitch',
  x: 'X',
  facebook: 'Facebook',
  google_business: 'Google Business',
};

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  venmo: 'Venmo',
  zelle: 'Zelle',
};
