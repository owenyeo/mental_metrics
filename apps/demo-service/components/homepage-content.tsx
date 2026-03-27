'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import React from 'react';

import {
  beginDemoJourney,
  completeEndpointAction,
  getCurrentDemoUserId,
  trackAndFlush,
  trackPage,
  trackPathwayDetermination,
} from './demo-tracker';
import { SiteShell } from './site-shell';

const urgentContacts = [
  { name: 'Emergency services', detail: '995', href: 'tel:995' },
  { name: 'Samaritans of Singapore', detail: '1767', href: 'tel:1767' },
  { name: 'IMH Mental Health Helpline', detail: '6389 2222', href: 'tel:+6563892222' },
];

export function HomepageContent() {
  const [status, setStatus] = useState('Ready to help someone take the first step.');

  useEffect(() => {
    void trackPage('home', 'homepage');
    void trackAndFlush('landing_viewed', { source: 'homepage' });
  }, []);

  async function handleUrgentSupport() {
    const userId = await beginDemoJourney('homepage_urgent_support');
    await trackPathwayDetermination({
      tier: 'unwell',
      endpoint: 'crisis_support',
      distressScore: 10,
      source: 'homepage_urgent_support',
    });
    await completeEndpointAction({
      endpoint: 'crisis_support',
      tier: 'unwell',
      primaryAction: true,
    });
    setStatus(`Urgent support options opened for ${userId}.`);
  }

  return (
    <SiteShell active="home">
      <section className="grid gap-8 px-1 py-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
        <div className="rounded-[2rem] border border-white/75 bg-white/88 p-8 shadow-[0_30px_70px_rgba(31,59,77,0.08)] backdrop-blur">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">
            Youth mental health support
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-slate-900">
            Find a support option that fits what you need right now.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            This demo mirrors the tone of a public support service: calm, clear, and easy to act on.
            Under the surface, every key step is tracked into the Service Intelligence Layer so
            providers can measure access, drop-off, escalation, and pathway completion.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/wayfinder"
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Find support now
            </Link>
            <Link
              href="/questionnaire"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Take the questionnaire
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Low pressure</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start with quick routes if you already know what would help.
              </p>
            </div>
            <div className="rounded-3xl bg-amber-50 p-5">
              <p className="text-sm font-medium text-amber-800">Clear next steps</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Every route leads to a concrete endpoint such as self-help, chat, or referral.
              </p>
            </div>
            <div className="rounded-3xl bg-rose-50 p-5">
              <p className="text-sm font-medium text-rose-800">Urgent help first</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Crisis and emergency options stay visible so immediate intervention is never buried.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-rose-100 bg-white/92 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-rose-700">Need help right away?</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Immediate support</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              If someone feels unsafe or may be in immediate danger, prioritise urgent support now.
            </p>

            <div className="mt-5 space-y-3">
              {urgentContacts.map((contact) => (
                <a
                  key={contact.name}
                  href={contact.href}
                  className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-4 text-sm text-slate-700 transition hover:bg-rose-100"
                >
                  <span>{contact.name}</span>
                  <span className="font-semibold text-slate-900">{contact.detail}</span>
                </a>
              ))}
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-500">
              Demo content only. Providers should verify emergency and crisis contacts before
              production use.
            </p>

            <button
              type="button"
              onClick={() => void handleUrgentSupport()}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-medium text-white"
            >
              Open urgent support options
            </button>
          </section>

          <section className="rounded-[2rem] border border-white/75 bg-white/88 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Demo analytics status</p>
            <p className="mt-4 text-base leading-7 text-slate-800" data-testid="homepage-status">
              {status}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Current simulated user:{' '}
              <span className="font-medium text-slate-800">
                {getCurrentDemoUserId() ?? 'none yet'}
              </span>
            </p>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
