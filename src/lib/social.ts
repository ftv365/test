import { PLATFORM_LABELS, type SocialPlatform } from './enums';

/**
 * v1 is "link mode": the user pastes a handle or a full profile URL and we
 * normalize it. No OAuth, no API keys, no per-platform review process.
 */

const PROFILE_URL_BUILDERS: Record<SocialPlatform, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  spotify: (h) => `https://open.spotify.com/artist/${h}`,
  soundcloud: (h) => `https://soundcloud.com/${h}`,
  bandcamp: (h) => `https://${h}.bandcamp.com`,
  twitch: (h) => `https://twitch.tv/${h}`,
  x: (h) => `https://x.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  google_business: (h) => `https://search.google.com/local/writereview?placeid=${h}`,
};

/**
 * Strips the decoration users habitually paste: a leading @, a full URL, query
 * strings, and trailing slashes. Returns the bare handle.
 */
export function normalizeHandle(input: string): string {
  let handle = input.trim();
  if (!handle) return '';

  if (/^https?:\/\//i.test(handle) || handle.startsWith('www.')) {
    const withScheme = handle.startsWith('www.') ? `https://${handle}` : handle;
    try {
      const url = new URL(withScheme);
      // Last non-empty path segment is the handle for every platform we support,
      // except bandcamp where the handle lives in the subdomain.
      if (url.hostname.endsWith('bandcamp.com')) {
        handle = url.hostname.split('.')[0];
      } else {
        const segments = url.pathname.split('/').filter(Boolean);
        handle = segments.at(-1) ?? '';
      }
    } catch {
      // Not a parseable URL — fall through and treat it as a raw handle.
    }
  }

  return handle.replace(/^@/, '').replace(/\/+$/, '').trim();
}

export function buildProfileUrl(platform: SocialPlatform, handle: string): string {
  const normalized = normalizeHandle(handle);
  return PROFILE_URL_BUILDERS[platform](normalized);
}

export function platformLabel(platform: SocialPlatform): string {
  return PLATFORM_LABELS[platform];
}

/**
 * "Follow everywhere" — one tap opens every connected platform. Browsers block
 * bulk window.open, so the UI walks this list; this helper just orders it so
 * the highest-signal platforms open first.
 */
const FOLLOW_ORDER: SocialPlatform[] = [
  'instagram',
  'tiktok',
  'youtube',
  'spotify',
  'twitch',
  'soundcloud',
  'bandcamp',
  'facebook',
  'x',
  'google_business',
];

export function orderForFollowAll<T extends { platform: string }>(connections: T[]): T[] {
  return [...connections].sort((a, b) => {
    const ai = FOLLOW_ORDER.indexOf(a.platform as SocialPlatform);
    const bi = FOLLOW_ORDER.indexOf(b.platform as SocialPlatform);
    return (ai === -1 ? FOLLOW_ORDER.length : ai) - (bi === -1 ? FOLLOW_ORDER.length : bi);
  });
}
