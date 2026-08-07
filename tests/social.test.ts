import { describe, expect, it } from 'vitest';
import { buildProfileUrl, normalizeHandle, orderForFollowAll } from '@/lib/social';
import { LAUNCH_PLATFORMS, SOCIAL_PLATFORMS } from '@/lib/enums';

describe('normalizeHandle', () => {
  it('strips the @ users habitually type', () => {
    expect(normalizeHandle('@saltlinetrio')).toBe('saltlinetrio');
  });

  it('pulls the handle out of a pasted profile URL', () => {
    expect(normalizeHandle('https://instagram.com/saltlinetrio')).toBe('saltlinetrio');
    expect(normalizeHandle('https://www.tiktok.com/@saltlinetrio')).toBe('saltlinetrio');
    expect(normalizeHandle('https://youtube.com/@saltlinetrio?si=abc')).toBe('saltlinetrio');
    expect(normalizeHandle('www.instagram.com/saltlinetrio/')).toBe('saltlinetrio');
  });

  it('reads the bandcamp handle from the subdomain, not the path', () => {
    expect(normalizeHandle('https://saltlinetrio.bandcamp.com/album/demo')).toBe('saltlinetrio');
  });

  it('returns empty for empty input instead of throwing', () => {
    expect(normalizeHandle('   ')).toBe('');
  });
});

describe('buildProfileUrl', () => {
  it('normalizes before building, so a pasted URL round-trips', () => {
    expect(buildProfileUrl('instagram', '@saltlinetrio')).toBe('https://instagram.com/saltlinetrio');
    expect(buildProfileUrl('instagram', 'https://instagram.com/saltlinetrio/')).toBe(
      'https://instagram.com/saltlinetrio',
    );
  });

  it('uses each platform\'s own handle prefix', () => {
    expect(buildProfileUrl('tiktok', 'djkass')).toBe('https://tiktok.com/@djkass');
    expect(buildProfileUrl('youtube', 'djkass')).toBe('https://youtube.com/@djkass');
    expect(buildProfileUrl('bandcamp', 'djkass')).toBe('https://djkass.bandcamp.com');
  });

  it('builds an https URL for every supported platform', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(buildProfileUrl(platform, 'demo')).toMatch(/^https:\/\//);
    }
  });
});

describe('launch platforms', () => {
  it('matches the locked phase-1 set', () => {
    expect(LAUNCH_PLATFORMS).toEqual(['instagram', 'tiktok', 'youtube', 'spotify']);
  });
});

describe('orderForFollowAll', () => {
  it('opens the highest-signal platforms first', () => {
    const ordered = orderForFollowAll([
      { platform: 'facebook' },
      { platform: 'spotify' },
      { platform: 'instagram' },
    ]);
    expect(ordered.map((c) => c.platform)).toEqual(['instagram', 'spotify', 'facebook']);
  });

  it('pushes unknown platforms to the end without dropping them', () => {
    const ordered = orderForFollowAll([{ platform: 'myspace' }, { platform: 'tiktok' }]);
    expect(ordered.map((c) => c.platform)).toEqual(['tiktok', 'myspace']);
  });

  it('does not mutate the input array', () => {
    const input = [{ platform: 'facebook' }, { platform: 'instagram' }];
    orderForFollowAll(input);
    expect(input[0].platform).toBe('facebook');
  });
});
