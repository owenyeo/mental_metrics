'use client';

import Link from 'next/link';
import React from 'react';
import { useEffect, useState } from 'react';

import {
  quickRouteOptions,
  recommendationContent,
  type RecommendationContent,
} from './access-config';
import {
  beginDemoJourney,
  completeEndpointAction,
  ensureDemoVisitor,
  getCurrentDemoUserId,
  getDemoYearOfBirth,
  trackPage,
  trackPathwayDetermination,
  trackSectionDuration,
} from './demo-tracker';
import { SiteShell } from './site-shell';

function RouteIcon({ route }: { route: (typeof quickRouteOptions)[number]['endpoint'] }) {
  const shared = 'h-20 w-20 text-slate-900';

  if (route === 'peer_support') {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={shared} aria-hidden="true">
        <circle cx="31" cy="31" r="12" stroke="currentColor" strokeWidth="3" />
        <circle cx="62" cy="28" r="10" stroke="currentColor" strokeWidth="3" />
        <path d="M14 69c5-12 13-18 24-18s19 6 24 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M49 64c4-9 10-14 18-14 7 0 13 4 16 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M67 75H24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (route === 'medical_referral') {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={shared} aria-hidden="true">
        <rect x="24" y="16" width="48" height="64" rx="8" stroke="currentColor" strokeWidth="3" />
        <path d="M48 30v26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M35 43h26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M34 63h28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M34 71h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (route === 'crisis_support') {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={shared} aria-hidden="true">
        <path
          d="M48 14 82 76H14L48 14Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M48 35v18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="64" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 96" fill="none" className={shared} aria-hidden="true">
      <path d="M20 67c0-18 12-30 28-30s28 12 28 30" stroke="currentColor" strokeWidth="3" />
      <path d="M48 16c10 0 18 8 18 18S58 52 48 52s-18-8-18-18 8-18 18-18Z" stroke="currentColor" strokeWidth="3" />
      <path d="M48 25v18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M39 34h18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const recommendationAccent: Record<
  (typeof quickRouteOptions)[number]['endpoint'],
  { text: string; border: string; background: string }
> = {
  peer_support: {
    text: 'text-violet-600',
    border: 'border-violet-100',
    background: 'bg-violet-50',
  },
  medical_referral: {
    text: 'text-orange-500',
    border: 'border-orange-100',
    background: 'bg-orange-50',
  },
  self_help: {
    text: 'text-fuchsia-500',
    border: 'border-fuchsia-100',
    background: 'bg-fuchsia-50',
  },
  crisis_support: {
    text: 'text-rose-600',
    border: 'border-rose-100',
    background: 'bg-rose-50',
  },
};

export function WayfinderContent() {
  const [recommendation, setRecommendation] = useState<RecommendationContent | null>(null);
  const [status, setStatus] = useState('Choose the support statement that feels closest to the current need.');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const userId = ensureDemoVisitor();
    setCurrentUserId(userId ?? getCurrentDemoUserId());
    void trackPage('resource_page', 'wayfinder');

    return () => {
      void trackSectionDuration({
        page: 'resource_page',
        source: 'wayfinder',
        seconds: (Date.now() - startTime) / 1000,
      });
    };
  }, []);

  async function proceedWithQuickRoute(option: (typeof quickRouteOptions)[number]) {
    const userId = await beginDemoJourney(`wayfinder_${option.endpoint}`);
    setCurrentUserId(userId);
    await trackPathwayDetermination({
      tier: option.tier,
      endpoint: option.endpoint,
      distressScore: option.distressScore,
      source: 'wayfinder_quick_select',
    });
    setRecommendation(recommendationContent[option.endpoint]);
    setStatus(`Recommended pathway: ${recommendationContent[option.endpoint].label}.`);
  }

  async function handleQuickRoute(option: (typeof quickRouteOptions)[number]) {
    await proceedWithQuickRoute(option);
  }

  async function handlePrimaryAction() {
    if (!recommendation) {
      return;
    }

    await completeEndpointAction({
      endpoint: recommendation.endpoint,
      tier: recommendation.tier,
      primaryAction: true,
    });
    setStatus(`Primary endpoint action completed for ${recommendation.label.toLowerCase()}.`);
  }

  async function handleSecondaryAction() {
    if (!recommendation) {
      return;
    }

    await completeEndpointAction({
      endpoint: recommendation.endpoint,
      tier: recommendation.tier,
      primaryAction: false,
    });
    setStatus(`Follow-through recorded for ${recommendation.label.toLowerCase()}.`);
  }

  return (
    <SiteShell active="wayfinder">
      <section className="grid gap-8 px-1 py-10 lg:grid-cols-[1.18fr_0.82fr]">
        <section className="rounded-[2rem] border border-white/75 bg-white/88 p-8 shadow-[0_30px_70px_rgba(31,59,77,0.08)]">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Care and support guide</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            Choosing the care and support best suited for you
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            You may require different levels of support at different points along your mental health
            journey. Choose the statement that fits best, and we will track the route through the
            access journey for the provider dashboard.
          </p>

          <div className="mt-8 space-y-5">
            {quickRouteOptions.map((option) => {
              const accent = recommendationAccent[option.endpoint];
              const recommendationLabel =
                option.endpoint === 'peer_support'
                  ? 'Recommended action: Enquiry and Support'
                  : option.endpoint === 'medical_referral'
                    ? 'Recommended action: Medical Advice'
                    : option.endpoint === 'self_help'
                      ? 'Recommended action: Self-Help Resources'
                      : 'Recommended action: Urgent Support';

              return (
                <button
                  key={option.endpoint}
                  type="button"
                  onClick={() => void handleQuickRoute(option)}
                  className={`w-full rounded-[1.75rem] border ${accent.border} ${accent.background} p-6 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(31,59,77,0.08)]`}
                >
                  <div className="grid gap-5 md:grid-cols-[108px_1fr] md:items-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-white">
                      <RouteIcon route={option.endpoint} />
                    </div>

                    <div>
                      <h2 className="text-[1.45rem] font-semibold leading-8 text-slate-900">
                        {option.title}
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-700">{option.description}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{option.cue}</p>
                      <p className={`mt-4 text-base font-semibold ${accent.text}`}>{recommendationLabel}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-sm leading-7 text-slate-600">
            If you are unsure of your needs or do not feel ready to choose a support route yet, use the
            guided questionnaire instead.
          </p>
          <Link
            href="/questionnaire"
            className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
          >
            Start the questionnaire
          </Link>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-emerald-100 bg-white/92 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">Selected recommendation</p>
            {recommendation ? (
              <>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">{recommendation.title}</h2>
                <p className="mt-3 text-sm font-medium text-emerald-800">{recommendation.summary}</p>
                <p className="mt-4 text-sm leading-7 text-slate-600">{recommendation.details}</p>
                <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-slate-700">
                  Measured tier: <span className="font-semibold text-slate-900">{recommendation.tier}</span>
                </div>
                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => void handlePrimaryAction()}
                    className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-medium text-white"
                  >
                    {recommendation.primaryCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSecondaryAction()}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-medium text-slate-700"
                  >
                    {recommendation.secondaryCta}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                Select one of the support cards to generate a recommended route and begin a measured
                access journey.
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/75 bg-white/88 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Live tracking</p>
            <p className="mt-4 text-base leading-7 text-slate-800" data-testid="wayfinder-status">
              {status}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Current simulated user:{' '}
              <span className="font-medium text-slate-800">{currentUserId ?? 'none yet'}</span>
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Year of birth:{' '}
              <span className="font-medium text-slate-800">
                {getDemoYearOfBirth() ?? 'not provided'}
              </span>
            </p>
            {!getDemoYearOfBirth() ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-7 text-slate-700">
                Demographic reach is optional. If you want to help the service understand who it is
                reaching, use the questionnaire path to share year of birth without blocking access
                to support.
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </SiteShell>
  );
}
