'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import React from 'react';

import {
  quickRouteOptions,
  recommendationContent,
  type RecommendationContent,
} from './access-config';
import {
  beginDemoJourney,
  completeEndpointAction,
  getCurrentDemoUserId,
  trackPage,
  trackPathwayDetermination,
} from './demo-tracker';
import { SiteShell } from './site-shell';

export function WayfinderContent() {
  const [recommendation, setRecommendation] = useState<RecommendationContent | null>(null);
  const [status, setStatus] = useState('Choose the statement that feels closest to what is needed.');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    void trackPage('wayfinder', 'wayfinder');
    setCurrentUserId(getCurrentDemoUserId());
  }, []);

  async function handleQuickRoute(option: (typeof quickRouteOptions)[number]) {
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
      <section className="grid gap-8 px-1 py-10 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[2rem] border border-white/75 bg-white/88 p-8 shadow-[0_30px_70px_rgba(31,59,77,0.08)]">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Wayfinder</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            Pick the closest need and we will suggest the most suitable next step.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            This page is designed to be understandable at a glance. Each card starts a fresh simulated
            user journey so the dashboard can measure access outcomes cleanly.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {quickRouteOptions.map((option) => (
              <button
                key={option.endpoint}
                type="button"
                onClick={() => void handleQuickRoute(option)}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{option.cue}</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">{option.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-[1.75rem] bg-slate-900 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.25em] text-white/60">Need more guidance?</p>
            <h2 className="mt-3 text-2xl font-semibold">Use the questionnaire instead</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
              If choosing a route feels too hard or overwhelming, the questionnaire turns the same
              access journey into a more supported step-by-step experience.
            </p>
            <Link
              href="/questionnaire"
              className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900"
            >
              Start the questionnaire
            </Link>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-emerald-100 bg-white/92 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">Recommended path</p>
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
                Pick one of the cards to generate a recommendation and trigger an access journey.
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
          </section>
        </aside>
      </section>
    </SiteShell>
  );
}
