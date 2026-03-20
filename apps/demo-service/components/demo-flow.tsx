'use client';

import { createTracker } from '@sil/sdk';
import { deriveTierFromDistressScore, type AccessEndpoint, type Tier } from '@sil/shared';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';

const tracker = createTracker();

type SupportPreference = 'self_guided' | 'someone_to_talk_to' | 'professional_support';

interface IntakeAnswers {
  ageBand: string;
  distressScore: number;
  crisisNow: boolean;
  supportPreference: SupportPreference;
}

const defaultAnswers: IntakeAnswers = {
  ageBand: '16-18',
  distressScore: 5,
  crisisNow: false,
  supportPreference: 'someone_to_talk_to',
};

const intakeSteps = [
  'welcome',
  'age_band',
  'distress_check',
  'support_preference',
  'endpoint',
] as const;

const endpointCopy: Record<
  AccessEndpoint,
  {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  }
> = {
  self_help: {
    eyebrow: 'Self-guided support',
    title: 'Start with calming tools and practical next steps',
    description:
      'You appear suitable for a self-help pathway right now. We will guide you to brief grounding tools, planning prompts, and ways to reconnect later if things feel heavier.',
    primaryCta: 'Open self-help plan',
    secondaryCta: 'Mark self-help session completed',
  },
  peer_support: {
    eyebrow: 'Conversation support',
    title: 'Connect with a supporter and follow-up resources',
    description:
      'A conversational support route looks most suitable right now. This pathway prioritises being heard quickly, then linking into more structured care if needed.',
    primaryCta: 'Request a conversation',
    secondaryCta: 'Mark chat support completed',
  },
  medical_referral: {
    eyebrow: 'Clinical referral',
    title: 'Move into a provider referral and appointment pathway',
    description:
      'Your responses suggest a stronger need for professional support. This route prepares a referral handoff and prompts the next concrete care action.',
    primaryCta: 'Start medical referral',
    secondaryCta: 'Mark referral completed',
  },
  crisis_support: {
    eyebrow: 'Urgent support',
    title: 'Escalate immediately to urgent or crisis support',
    description:
      'Your responses suggest immediate support may be needed. This pathway prioritises urgent contact options and a direct escalation handoff.',
    primaryCta: 'Open urgent support options',
    secondaryCta: 'Mark urgent handoff completed',
  },
};

async function trackAndFlush(
  eventName: Parameters<typeof tracker.track>[0],
  properties?: Parameters<typeof tracker.track>[1],
) {
  await tracker.track(eventName, properties);
  await tracker.flush();
}

function determineEndpoint(answers: IntakeAnswers): { endpoint: AccessEndpoint; tier: Tier } {
  const tier = deriveTierFromDistressScore(answers.distressScore) ?? 'at_risk';

  if (answers.crisisNow || answers.distressScore >= 9) {
    return { endpoint: 'crisis_support', tier: 'unwell' };
  }

  if (answers.supportPreference === 'professional_support' || answers.distressScore >= 8) {
    return { endpoint: 'medical_referral', tier: 'unwell' };
  }

  if (answers.supportPreference === 'someone_to_talk_to' || tier === 'distressed') {
    return { endpoint: 'peer_support', tier: 'distressed' };
  }

  return { endpoint: 'self_help', tier: 'at_risk' };
}

function endpointMeta(endpoint: AccessEndpoint) {
  if (endpoint === 'self_help') {
    return {
      referralDestination: 'self_help_library',
      interventionType: 'guided_self_help_plan',
    };
  }

  if (endpoint === 'peer_support') {
    return {
      referralDestination: 'peer_support_chat',
      interventionType: 'guided_chat_support',
    };
  }

  if (endpoint === 'medical_referral') {
    return {
      referralDestination: 'youth_mental_health_provider',
      interventionType: 'clinical_intake',
    };
  }

  return {
    referralDestination: 'urgent_support_line',
    interventionType: 'crisis_triage',
  };
}

export function DemoFlow() {
  const [identified, setIdentified] = useState(false);
  const [answers, setAnswers] = useState<IntakeAnswers>(defaultAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [endpoint, setEndpoint] = useState<AccessEndpoint | null>(null);
  const [tier, setTier] = useState<Tier>('distressed');
  const [status, setStatus] = useState('Ready to guide a young person to the right support route.');

  useEffect(() => {
    tracker.init({
      ingestUrl: process.env.NEXT_PUBLIC_INGEST_URL ?? 'http://localhost:4000/v1/events/ingest',
      projectKey: process.env.NEXT_PUBLIC_PROJECT_KEY ?? 'demo_project_key',
      flushIntervalMs: 1000,
    });

    void tracker.page('youth_landing');
    void trackAndFlush('landing_viewed', { source: 'youth_homepage' });
  }, []);

  const derived = useMemo(() => determineEndpoint(answers), [answers]);
  const activeStep = intakeSteps[currentStep];

  async function startIntake() {
    const userId = `demo-user-${Date.now()}`;
    tracker.identify(userId, { cohort: 'mindline-style-demo', ageBand: answers.ageBand });
    setIdentified(true);
    setCurrentStep(1);
    await trackAndFlush('access_intake_started', {
      source: 'find_support_now',
      intake_step: 'welcome',
    });
    await trackAndFlush('screening_started', { source: 'find_support_now' });
    setStatus(`Access intake started for ${userId}.`);
  }

  async function nextStep() {
    if (activeStep === 'age_band') {
      await trackAndFlush('access_step_completed', {
        intake_step: 'age_band',
        source: answers.ageBand,
      });
    }

    if (activeStep === 'distress_check') {
      const nextTier = deriveTierFromDistressScore(answers.distressScore) ?? 'at_risk';
      setTier(nextTier);
      await trackAndFlush('access_step_completed', {
        intake_step: 'distress_check',
        distress_score: answers.distressScore,
        tier: nextTier,
      });
    }

    if (activeStep === 'support_preference') {
      const nextTier = derived.tier;
      const nextEndpoint = derived.endpoint;
      const metadata = endpointMeta(nextEndpoint);

      setTier(nextTier);
      setEndpoint(nextEndpoint);

      await trackAndFlush('access_step_completed', {
        intake_step: 'support_preference',
        source: answers.supportPreference,
      });
      await trackAndFlush('screening_completed', {
        distress_score: answers.distressScore,
        tier: nextTier,
      });
      await trackAndFlush('care_pathway_determined', {
        tier: nextTier,
        access_endpoint: nextEndpoint,
        referral_destination: metadata.referralDestination,
        intervention_type: metadata.interventionType,
      });

      if (nextTier === 'unwell') {
        await trackAndFlush('escalation_recommended', {
          tier: nextTier,
          access_endpoint: nextEndpoint,
          referral_destination: metadata.referralDestination,
        });
      }

      setCurrentStep(4);
      setStatus(`Endpoint determined: ${nextEndpoint}.`);
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, intakeSteps.length - 1));
  }

  async function completeEndpoint(primaryAction: boolean) {
    if (!endpoint) {
      return;
    }

    const metadata = endpointMeta(endpoint);

    if (primaryAction) {
      if (endpoint === 'self_help') {
        await trackAndFlush('intervention_viewed', {
          tier,
          access_endpoint: endpoint,
          intervention_type: metadata.interventionType,
        });
        await trackAndFlush('resource_clicked', {
          tier,
          access_endpoint: endpoint,
          source: 'self_help_plan',
        });
      } else if (endpoint === 'peer_support') {
        await trackAndFlush('chat_requested', {
          tier,
          access_endpoint: endpoint,
          referral_destination: metadata.referralDestination,
        });
      } else if (endpoint === 'medical_referral') {
        await trackAndFlush('referral_started', {
          tier,
          access_endpoint: endpoint,
          referral_destination: metadata.referralDestination,
        });
      } else {
        await trackAndFlush('crisis_button_clicked', {
          tier: 'unwell',
          access_endpoint: endpoint,
        });
        await trackAndFlush('referral_started', {
          tier: 'unwell',
          access_endpoint: endpoint,
          referral_destination: metadata.referralDestination,
        });
      }

      await trackAndFlush('access_flow_completed', {
        tier,
        access_endpoint: endpoint,
        referral_destination: metadata.referralDestination,
        intervention_type: metadata.interventionType,
      });
      setStatus(`Primary endpoint action completed: ${endpoint}.`);
      return;
    }

    if (endpoint === 'self_help') {
      await trackAndFlush('intervention_started', {
        tier,
        access_endpoint: endpoint,
        intervention_type: metadata.interventionType,
      });
      await trackAndFlush('intervention_completed', {
        tier,
        access_endpoint: endpoint,
        intervention_type: metadata.interventionType,
        session_length_sec: 420,
      });
    } else {
      await trackAndFlush('referral_completed', {
        tier,
        access_endpoint: endpoint,
        referral_destination: metadata.referralDestination,
      });
      await trackAndFlush('appointment_booked', {
        tier,
        access_endpoint: endpoint,
      });
    }

    setStatus(`Follow-through action completed for ${endpoint}.`);
  }

  function resetJourney() {
    tracker.reset();
    setIdentified(false);
    setAnswers(defaultAnswers);
    setCurrentStep(0);
    setEndpoint(null);
    setTier('distressed');
    setStatus('Journey reset. Ready for a new access flow.');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(126,172,160,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,192,114,0.16),transparent_28%),linear-gradient(180deg,#f8fbf7_0%,#eef5f3_100%)] text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/70 bg-white/85 px-6 py-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-emerald-700">Youth support demo</p>
            <h1 className="text-lg font-semibold text-slate-900">Find support that fits right now</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-2">Support articles</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Chat options</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Professional help</span>
          </nav>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/75 bg-white/85 p-8 shadow-[0_30px_80px_rgba(31,59,77,0.10)] backdrop-blur">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">Mindline-inspired intake</p>
            <h2 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight text-slate-900">
              A calmer first step toward the support route that matches your situation.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              This simplified demo mirrors the welcoming, youth-facing vibe of a public mental health
              support site, while turning the intake journey into measurable access analytics for
              providers.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-800">Talk things through</p>
                <p className="mt-2 text-sm text-slate-600">
                  Route someone to peer or chat support when speaking to a person is the best next step.
                </p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-800">Start gently</p>
                <p className="mt-2 text-sm text-slate-600">
                  Offer self-help tools and structured next steps when low-intensity support is suitable.
                </p>
              </div>
              <div className="rounded-3xl bg-rose-50 p-5">
                <p className="text-sm font-medium text-rose-800">Escalate early</p>
                <p className="mt-2 text-sm text-slate-600">
                  Identify when the service should move directly into referral or urgent support.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-[1.75rem] bg-slate-900 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.25em] text-white/60">How this is measured</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold">{identified ? 'Live' : 'Ready'}</p>
                  <p className="mt-1 text-sm text-white/70">Intake state</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{endpoint ?? 'pending'}</p>
                  <p className="mt-1 text-sm text-white/70">Endpoint route</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{tier}</p>
                  <p className="mt-1 text-sm text-white/70">Tier signal</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-emerald-100 bg-white/90 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">Support finder</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Start an access journey</h3>
              </div>
              <button
                type="button"
                onClick={resetJourney}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
              >
                Reset
              </button>
            </div>

            {currentStep === 0 ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-3xl bg-emerald-50 p-5 text-sm text-slate-700">
                  This intake starts tracking access the moment a user begins the questionnaire. The
                  API then measures whether they reach a concrete endpoint such as self-help,
                  conversation support, clinical referral, or urgent support.
                </div>
                <button
                  type="button"
                  onClick={() => void startIntake()}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-base font-medium text-white"
                >
                  Find support now
                </button>
              </div>
            ) : null}

            {currentStep >= 1 && currentStep < 4 ? (
              <div className="mt-8 space-y-6">
                <div className="flex gap-2">
                  {intakeSteps.slice(1, 5).map((stepName, index) => (
                    <div
                      key={stepName}
                      className={`h-2 flex-1 rounded-full ${
                        index <= currentStep - 1 ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {activeStep === 'age_band' ? (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Which age group fits best?</span>
                    <select
                      value={answers.ageBand}
                      onChange={(event) =>
                        setAnswers((previous) => ({ ...previous, ageBand: event.target.value }))
                      }
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <option value="13-15">13-15</option>
                      <option value="16-18">16-18</option>
                      <option value="19-24">19-24</option>
                    </select>
                  </label>
                ) : null}

                {activeStep === 'distress_check' ? (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        How intense do things feel today?
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={answers.distressScore}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            distressScore: Number(event.target.value),
                          }))
                        }
                        className="mt-4 w-full"
                      />
                      <div className="mt-2 flex justify-between text-sm text-slate-500">
                        <span>1 calmer</span>
                        <span className="font-medium text-slate-900">{answers.distressScore}/10</span>
                        <span>10 intense</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-4 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={answers.crisisNow}
                        onChange={(event) =>
                          setAnswers((previous) => ({
                            ...previous,
                            crisisNow: event.target.checked,
                          }))
                        }
                      />
                      I feel unsafe right now or need urgent support.
                    </label>
                  </div>
                ) : null}

                {activeStep === 'support_preference' ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">What kind of support feels possible today?</p>
                    {[
                      ['self_guided', 'Start with self-help tools and resources'],
                      ['someone_to_talk_to', 'Talk to someone first and figure out next steps'],
                      ['professional_support', 'Move toward professional support or referral'],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 ${
                          answers.supportPreference === value
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="supportPreference"
                          value={value}
                          checked={answers.supportPreference === value}
                          onChange={(event) =>
                            setAnswers((previous) => ({
                              ...previous,
                              supportPreference: event.target.value as SupportPreference,
                            }))
                          }
                        />
                        <span className="text-sm text-slate-700">{label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void nextStep()}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-base font-medium text-white"
                >
                  {activeStep === 'support_preference' ? 'See my support route' : 'Next'}
                </button>
              </div>
            ) : null}

            {currentStep === 4 && endpoint ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-[1.75rem] bg-emerald-50 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
                    {endpointCopy[endpoint].eyebrow}
                  </p>
                  <h4 className="mt-3 text-2xl font-semibold text-slate-900">
                    {endpointCopy[endpoint].title}
                  </h4>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {endpointCopy[endpoint].description}
                  </p>
                  <p className="mt-4 text-sm text-slate-500">Measured tier: {tier}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void completeEndpoint(true)}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-base font-medium text-white"
                >
                  {endpointCopy[endpoint].primaryCta}
                </button>
                <button
                  type="button"
                  onClick={() => void completeEndpoint(false)}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-base font-medium text-slate-800"
                >
                  {endpointCopy[endpoint].secondaryCta}
                </button>
              </div>
            ) : null}

            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Latest status</p>
              <p className="mt-3 text-base leading-7 text-slate-800" data-testid="demo-status">
                {status}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
