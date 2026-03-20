'use client';

import { createTracker } from '@sil/sdk';
import { deriveTierFromDistressScore, type Tier } from '@sil/shared';
import React from 'react';
import { useEffect, useState } from 'react';

const tracker = createTracker();

const distressOptions = [2, 5, 8, 9];

async function trackAndFlush(
  eventName: Parameters<typeof tracker.track>[0],
  properties?: Parameters<typeof tracker.track>[1],
) {
  await tracker.track(eventName, properties);
  await tracker.flush();
}

function tierCopy(tier: Tier) {
  if (tier === 'at_risk') {
    return 'You may benefit from a low-intensity self-guided intervention.';
  }

  if (tier === 'distressed') {
    return 'A guided intervention and follow-up support is recommended.';
  }

  return 'A higher-support pathway and referral escalation is recommended.';
}

export function DemoFlow() {
  const [identified, setIdentified] = useState(false);
  const [distressScore, setDistressScore] = useState(5);
  const [tier, setTier] = useState<Tier>('distressed');
  const [status, setStatus] = useState('Ready to simulate a youth support journey.');

  useEffect(() => {
    tracker.init({
      ingestUrl:
        process.env.NEXT_PUBLIC_INGEST_URL ?? 'http://localhost:4000/v1/events/ingest',
      projectKey: process.env.NEXT_PUBLIC_PROJECT_KEY ?? 'demo_project_key',
      flushIntervalMs: 1000,
    });

    void tracker.page('demo_service_home');
    void trackAndFlush('landing_viewed', { source: 'demo_service_home' });
  }, []);

  function identifyDemoUser() {
    const userId = `demo-user-${Date.now()}`;
    tracker.identify(userId, { cohort: 'demo' });
    setIdentified(true);
    setStatus(`Identified ${userId}.`);
  }

  async function startScreening() {
    await trackAndFlush('screening_started', { source: 'hero_cta' });
    setStatus('Screening started.');
  }

  async function completeScreening() {
    const nextTier = deriveTierFromDistressScore(distressScore) ?? 'at_risk';
    setTier(nextTier);
    await trackAndFlush('screening_completed', {
      distress_score: distressScore,
      tier: nextTier,
    });
    if (nextTier === 'unwell') {
      await trackAndFlush('escalation_recommended', {
        tier: nextTier,
        source: 'screening_result',
      });
    }
    setStatus(`Screening completed. Tier result: ${nextTier}.`);
  }

  async function startIntervention() {
    await trackAndFlush('intervention_started', {
      tier,
      intervention_type: tier === 'at_risk' ? 'self_reflection' : 'guided_breathing',
    });
    setStatus('Intervention started.');
  }

  async function completeIntervention() {
    await trackAndFlush('intervention_completed', {
      tier,
      intervention_type: tier === 'at_risk' ? 'self_reflection' : 'guided_breathing',
      session_length_sec: 640,
    });
    setStatus('Intervention completed.');
  }

  async function startReferral() {
    await trackAndFlush('referral_started', {
      tier,
      referral_destination: tier === 'unwell' ? 'crisis_line' : 'peer_support_team',
    });
    setStatus('Referral started.');
  }

  async function completeReferral() {
    await trackAndFlush('referral_completed', {
      tier,
      referral_destination: tier === 'unwell' ? 'crisis_line' : 'peer_support_team',
    });
    await trackAndFlush('appointment_booked', { tier });
    setStatus('Referral completed and appointment booked.');
  }

  async function triggerCrisis() {
    await trackAndFlush('crisis_button_clicked', { tier: 'unwell' });
    setStatus('Crisis support action simulated.');
  }

  async function abandonFlow() {
    await trackAndFlush('feedback_submitted', {
      tier,
      source: 'abandonment_reason_modal',
    });
    setStatus('Journey abandoned after feedback submission.');
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] bg-white/85 p-8 shadow-[0_24px_60px_rgba(31,59,77,0.12)]">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Demo Service</p>
          <h1 className="mt-3 text-4xl font-semibold text-tide">
            Youth mental health support journey simulator
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            This app simulates a provider integrating the SDK. Move a demo user through screening,
            intervention, and escalation steps to see the provider dashboard update.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void identifyDemoUser()}
              className="rounded-2xl bg-tide px-5 py-4 text-left text-white"
            >
              <span className="block text-sm uppercase tracking-[0.2em] text-white/70">Step 1</span>
              <span className="mt-1 block text-lg font-medium">Identify demo user</span>
            </button>
            <button
              type="button"
              onClick={() => void startScreening()}
              className="rounded-2xl bg-peach px-5 py-4 text-left text-white"
            >
              <span className="block text-sm uppercase tracking-[0.2em] text-white/70">Step 2</span>
              <span className="mt-1 block text-lg font-medium">Start screening</span>
            </button>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
            <label className="block text-sm font-medium text-slate-700">
              Distress score
              <select
                aria-label="Distress score"
                value={distressScore}
                onChange={(event) => setDistressScore(Number(event.target.value))}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                {distressOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void completeScreening()}
              className="mt-4 rounded-xl bg-mint px-4 py-3 font-medium text-slate-900"
            >
              Complete screening
            </button>
            <p className="mt-4 text-sm text-slate-600">
              Current tier result: <strong>{tier}</strong>. {tierCopy(tier)}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void startIntervention()}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left"
            >
              Start intervention
            </button>
            <button
              type="button"
              onClick={() => void completeIntervention()}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left"
            >
              Complete intervention
            </button>
            <button
              type="button"
              onClick={() => void startReferral()}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left"
            >
              Start referral
            </button>
            <button
              type="button"
              onClick={() => void completeReferral()}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left"
            >
              Complete referral
            </button>
            <button
              type="button"
              onClick={() => void triggerCrisis()}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left"
            >
              Trigger crisis support
            </button>
            <button
              type="button"
              onClick={() => void abandonFlow()}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left"
            >
              Abandon journey
            </button>
          </div>
        </section>

        <aside className="rounded-[2rem] bg-tide p-8 text-white shadow-[0_24px_60px_rgba(31,59,77,0.18)]">
          <h2 className="text-2xl font-semibold">Simulation state</h2>
          <p className="mt-4 text-white/75">
            Use this panel during demos to narrate what the provider platform should pick up.
          </p>

          <dl className="mt-8 space-y-5">
            <div>
              <dt className="text-sm uppercase tracking-[0.2em] text-white/60">Identity linked</dt>
              <dd className="mt-1 text-lg">{identified ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-[0.2em] text-white/60">Tier</dt>
              <dd className="mt-1 text-lg">{tier}</dd>
            </div>
            <div>
              <dt className="text-sm uppercase tracking-[0.2em] text-white/60">Latest status</dt>
              <dd className="mt-1 text-lg" data-testid="demo-status">
                {status}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
