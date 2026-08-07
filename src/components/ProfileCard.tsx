import Link from 'next/link';

export interface ProfileCardData {
  slug: string;
  displayName: string;
  tagline: string | null;
  city: string | null;
  genres: string | null;
  type: string;
}

export function ProfileCard({ profile }: { profile: ProfileCardData }) {
  const genres = profile.genres?.split(',').map((g) => g.trim()).filter(Boolean) ?? [];

  return (
    <Link
      href={`/p/${profile.slug}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-400 hover:shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{profile.displayName}</h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-500">
          {profile.type}
        </span>
      </div>
      {profile.tagline && <p className="mt-1 text-sm text-slate-600">{profile.tagline}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {profile.city && <span>{profile.city}</span>}
        {genres.map((genre) => (
          <span key={genre} className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
            {genre}
          </span>
        ))}
      </div>
    </Link>
  );
}
