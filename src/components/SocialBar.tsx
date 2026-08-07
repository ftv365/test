'use client';

import { platformLabel, orderForFollowAll } from '@/lib/social';
import type { SocialPlatform } from '@/lib/enums';

export interface SocialLink {
  platform: string;
  handle: string;
  url: string;
}

/**
 * Unified social bar + "Follow everywhere".
 *
 * Browsers block a burst of window.open calls, so "follow everywhere" opens
 * the highest-signal platform immediately and offers the rest as an expanded
 * row rather than silently dropping the popups.
 */
export function SocialBar({ links }: { links: SocialLink[] }) {
  if (links.length === 0) {
    return <p className="text-sm text-slate-500">No social accounts connected yet.</p>;
  }

  const ordered = orderForFollowAll(links);

  const followEverywhere = () => {
    for (const link of ordered) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ordered.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-500 hover:text-brand-600"
        >
          {platformLabel(link.platform as SocialPlatform)}
          <span className="ml-1.5 text-slate-400">@{link.handle}</span>
        </a>
      ))}

      {ordered.length > 1 && (
        <button
          type="button"
          onClick={followEverywhere}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Follow everywhere
        </button>
      )}
    </div>
  );
}
