'use client';

import { useEffect, useState } from 'react';
import React from 'react';

import {
  defaultQuestionnaireAnswers,
  determineQuestionnaireRecommendation,
  type QuestionnaireAnswers,
  type SupportPreference,
} from './access-config';
import {
  beginDemoJourney,
  completeEndpointAction,
  ensureDemoVisitor,
  getCurrentDemoUserId,
  getDemoYearOfBirth,
  trackAndFlush,
  trackPage,
  trackPathwayDetermination,
  trackSectionDuration,
} from './demo-tracker';
import { SiteShell } from './site-shell';

const steps = ['intro', 'age', 'distress', 'preference', 'recommendation'] as const;

export function QuestionnaireContent() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultQuestionnaireAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('Start when you are ready. We will guide one step at a time.');
  const [started, setStarted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const userId = ensureDemoVisitor();
    setCurrentUserId(userId ?? getCurrentDemoUserId());
    void trackPage('screening_page', 'questionnaire');

    return () => {
      void trackSectionDuration({
        page: 'screening_page',
        source: 'questionnaire',
        seconds: (Date.now() - startTime) / 1000,
      });
    };
  }, []);

  const recommendation = determineQuestionnaireRecommendation(answers);
  const activeStep = steps[currentStep];

  async function startQuestionnaire() {
    const userId = await beginDemoJourney('questionnaire');
    setStarted(true);
    setCurrentUserId(userId);
    setCurrentStep(1);
    setStatus(`Questionnaire started for ${userId}.`);
  }

  async function goNext() {
    if (!started) {
      await startQuestionnaire();
      return;
    }

    if (activeStep === 'age') {
      await trackAndFlush('access_step_completed', {
        intake_step: 'age_band',
        source: answers.ageBand,
      });
      setCurrentStep(2);
      return;
    }

    if (activeStep === 'distress') {
      await trackAndFlush('access_step_completed', {
        intake_step: 'distress_check',
        distress_score: answers.distressScore,
        tier: recommendation.tier,
      });
      setCurrentStep(3);
      return;
    }

    if (activeStep === 'preference') {
      await trackAndFlush('access_step_completed', {
        intake_step: 'support_preference',
        source: answers.supportPreference,
      });
      await trackPathwayDetermination({
        tier: recommendation.tier,
        endpoint: recommendation.endpoint,
        distressScore: answers.distressScore,
        source: 'questionnaire',
      });
      setCurrentStep(4);
      setStatus(`Recommended pathway: ${recommendation.label}.`);
    }
  }

  async function handlePrimaryAction() {
    await completeEndpointAction({
      endpoint: recommendation.endpoint,
      tier: recommendation.tier,
      primaryAction: true,
    });
    setStatus(`Primary endpoint action completed for ${recommendation.label.toLowerCase()}.`);
  }

  async function handleSecondaryAction() {
    await completeEndpointAction({
      endpoint: recommendation.endpoint,
      tier: recommendation.tier,
      primaryAction: false,
    });
    setStatus(`Follow-through recorded for ${recommendation.label.toLowerCase()}.`);
  }

  return (
    <SiteShell active="questionnaire">
      <section className="grid gap-8 px-1 py-10 lg:grid-cols-[1.04fr_0.96fr]">
        <section className="rounded-[2rem] border border-white/75 bg-white/88 p-8 shadow-[0_30px_70px_rgba(31,59,77,0.08)]">
          <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Guided questionnaire</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
            If you feel overwhelmed, answer a few simple questions and we will recommend a route.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            This takes the same access metrics and wraps them in a calmer guided experience so
            providers can compare completion, escalation, and endpoint follow-through across
            different entry paths.
          </p>

          <div className="mt-8 flex gap-2">
            {steps.slice(1).map((step, index) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  index <= Math.max(currentStep - 1, 0) ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {currentStep === 0 ? (
            <div className="mt-8 rounded-[1.75rem] bg-slate-50 p-6">
              <p className="text-base leading-8 text-slate-700">
                We will ask about age band, how intense things feel today, and what kind of support
                is most manageable right now.
              </p>
              <button
                type="button"
                onClick={() => void startQuestionnaire()}
                className="mt-6 rounded-full bg-emerald-700 px-6 py-3 text-sm font-medium text-white"
              >
                Start questionnaire
              </button>
            </div>
          ) : null}

          {activeStep === 'age' ? (
            <div className="mt-8">
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
            </div>
          ) : null}

          {activeStep === 'distress' ? (
            <div className="mt-8 space-y-5">
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
                    setAnswers((previous) => ({ ...previous, crisisNow: event.target.checked }))
                  }
                />
                I feel unsafe right now or need urgent support.
              </label>
            </div>
          ) : null}

          {activeStep === 'preference' ? (
            <div className="mt-8 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                What kind of support feels most manageable today?
              </p>
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

          {currentStep > 0 && currentStep < 4 ? (
            <button
              type="button"
              onClick={() => void goNext()}
              className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-medium text-white"
            >
              {activeStep === 'preference' ? 'See my recommendation' : 'Next'}
            </button>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-emerald-100 bg-white/92 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">Recommendation</p>
            {currentStep === 4 ? (
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
                Your recommendation will appear here after the questionnaire is complete.
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/75 bg-white/88 p-7 shadow-[0_25px_60px_rgba(31,59,77,0.08)]">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Live tracking</p>
            <p className="mt-4 text-base leading-7 text-slate-800" data-testid="questionnaire-status">
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
          </section>
        </aside>
      </section>
    </SiteShell>
  );
}
