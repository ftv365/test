import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Myrtle365 — Staging',
  description: 'Live entertainment in Myrtle Beach: fans, talent, and venues. Staging environment.',
};

const NAV = [
  { href: '/talent', label: 'Talent' },
  { href: '/venues', label: 'Venues' },
  { href: '/fans', label: 'Fans' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isStaging = process.env.NEXT_PUBLIC_STAGING !== 'false';

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {isStaging && (
          <div className="no-print bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-amber-950">
            STAGING ENVIRONMENT — seeded demo data, no real payments
          </div>
        )}

        <header className="no-print border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Myrtle<span className="text-brand-600">365</span>
            </Link>
            <div className="flex gap-5 text-sm text-slate-600">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-brand-600">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

        <footer className="no-print mx-auto max-w-5xl px-4 py-10 text-xs text-slate-500">
          Myrtle365 staging · Tips go directly from fan to talent via Venmo/Zelle. Myrtle365 takes
          0% and never holds funds.
        </footer>
      </body>
    </html>
  );
}
