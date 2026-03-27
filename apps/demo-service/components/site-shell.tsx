import Link from 'next/link';
import type { ReactNode } from 'react';
import React from 'react';

export function SiteShell({
  active,
  children,
}: {
  active: 'home' | 'wayfinder' | 'questionnaire';
  children: ReactNode;
}) {
  const navItems = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/wayfinder', label: 'Wayfinder', key: 'wayfinder' },
    { href: '/questionnaire', label: 'Questionnaire', key: 'questionnaire' },
  ] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(116,171,154,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(240,194,129,0.18),transparent_26%),linear-gradient(180deg,#f8fbf7_0%,#eef4f2_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <header className="rounded-full border border-white/70 bg-white/85 px-6 py-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                YM
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">
                  Youth support demo
                </p>
                <p className="text-base font-semibold text-slate-900">A calmer way to find support</p>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition ${
                    active === item.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
