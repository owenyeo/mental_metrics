'use client';

import type { AnalyticsOverview, InterventionPerformanceRow, Tier } from '@sil/shared';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TIER_OPTIONS: Array<Tier | 'all'> = ['all', 'at_risk', 'distressed', 'unwell'];

const cardStyle =
  'rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_45px_rgba(20,33,61,0.08)] backdrop-blur';

interface DashboardViewProps {
  initialOverview: AnalyticsOverview;
  initialInterventions: InterventionPerformanceRow[];
  apiBaseUrl: string;
  projectKey: string;
}

interface JsonErrorPayload {
  error?: string;
  message?: string;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSeconds(value: number | null) {
  if (value === null) {
    return 'N/A';
  }

  if (value >= 60) {
    return `${(value / 60).toFixed(1)} min`;
  }

  return `${value.toFixed(1)} sec`;
}

function prettifyStep(step: string) {
  return step.replaceAll('_', ' ');
}

export function DashboardView({
  initialOverview,
  initialInterventions,
  apiBaseUrl,
  projectKey,
}: DashboardViewProps) {
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [overview, setOverview] = useState(initialOverview);
  const [interventions, setInterventions] = useState(initialInterventions);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function parseJsonResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const payload = JSON.parse(body) as JsonErrorPayload;
        throw new Error(payload.message ?? payload.error ?? `Request failed with ${response.status}`);
      }

      throw new Error(body || `Request failed with ${response.status}`);
    }

    if (!body) {
      throw new Error('Empty response from analytics API');
    }

    if (!contentType.includes('application/json')) {
      throw new Error(body);
    }

    return JSON.parse(body) as T;
  }

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null);

        const query = new URLSearchParams({
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-31T23:59:59.999Z',
        });

        if (tier !== 'all') {
          query.set('tier', tier);
        }

        const [overviewResponse, interventionsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/v1/analytics/overview?${query.toString()}`, {
            headers: { 'x-project-key': projectKey },
          }),
          fetch(`${apiBaseUrl}/v1/analytics/interventions?${query.toString()}`, {
            headers: { 'x-project-key': projectKey },
          }),
        ]);

        setOverview(await parseJsonResponse<AnalyticsOverview>(overviewResponse));
        const interventionPayload = await parseJsonResponse<{
          items: InterventionPerformanceRow[];
        }>(interventionsResponse);
        setInterventions(interventionPayload.items);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Unable to refresh analytics right now.',
        );
      }
    }

    void load();
  }, [apiBaseUrl, projectKey, tier]);

  const tierBreakdown = useMemo(
    () => Object.entries(overview.tierDistribution).map(([name, value]) => ({ name, value })),
    [overview.tierDistribution],
  );
  const endpointBreakdown = useMemo(
    () => Object.entries(overview.endpointDistribution).map(([name, value]) => ({ name, value })),
    [overview.endpointDistribution],
  );
  const sectionTimeData = useMemo(
    () =>
      overview.sectionTimes.map((section) => ({
        ...section,
        label: prettifyStep(section.section),
      })),
    [overview.sectionTimes],
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-slate-500">
            Service Intelligence Layer
          </p>
          <h1 className="text-4xl font-semibold text-ink">Reach And Accessibility Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Track who the service is reaching, whether visitors start using support, where they
            drop out of the flow, and whether any section of the experience appears confusing or
            overloaded.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-500">Tier filter</span>
          <select
            aria-label="Tier filter"
            value={tier}
            onChange={(event) => setTier(event.target.value as Tier | 'all')}
            className="rounded-full border border-slate-200 px-3 py-1"
          >
            {TIER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dashboard refresh issue: {loadError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={cardStyle} data-testid="kpi-total-users">
          <p className="text-sm text-slate-500">Total visitors</p>
          <p className="mt-3 text-3xl font-semibold">{overview.totalVisitors}</p>
          <p className="mt-2 text-sm text-slate-500">Tracked visitors entering the platform</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Demographic capture</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.demographicCoverageRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">Visitors who provided year of birth</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Target demographic reached</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.targetDemographicRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {overview.targetDemographicUsers} visitors aged 13-24
          </p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Daily active users</p>
          <p className="mt-3 text-3xl font-semibold">{overview.dailyActiveUsers}</p>
          <p className="mt-2 text-sm text-slate-500">Most recent day in the selected window</p>
        </article>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Screening start rate</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.screeningStartRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">{overview.screeningStarts} visitors</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Chatbot start rate</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.chatbotStartRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">{overview.chatbotStarts} visitors</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Resource click rate</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.resourceClickRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">{overview.resourceClicks} visitors</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Access completion rate</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.accessCompletionRate)}
          </p>
          <p className="mt-2 text-sm text-slate-500">{overview.accessCompleted} completed journeys</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Reach And Activation Trend</h2>
          <p className="mb-4 text-sm text-slate-500">
            Daily visitors, screening starts, and resource clicks.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="visitors" stroke="#14213d" strokeWidth={2} />
                <Line type="monotone" dataKey="screeningStarts" stroke="#ff7f50" strokeWidth={2} />
                <Line type="monotone" dataKey="resourceClicks" stroke="#7aa095" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Funnel Drop-off</h2>
          <p className="mb-4 text-sm text-slate-500">
            Where accessibility may be breaking down between first visit and further help use.
          </p>
          <div className="space-y-4" data-testid="funnel-chart">
            {overview.dropOffFunnel.map((step) => (
              <div key={`${step.fromStep}-${step.toStep}`}>
                <div className="mb-1 flex justify-between gap-4 text-sm">
                  <span>
                    {prettifyStep(step.fromStep)} to {prettifyStep(step.toStep)}
                  </span>
                  <span>
                    {step.completedUsers}/{step.enteredUsers} | {formatPercent(step.dropOffRate)}{' '}
                    drop-off
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-coral transition-all"
                    style={{ width: `${Math.max(step.dropOffRate, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Time Spent Per Section</h2>
          <p className="mb-4 text-sm text-slate-500">
            Average dwell time recorded for landing, screening, and resource sections.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals />
                <Tooltip />
                <Bar dataKey="avgSeconds" radius={[10, 10, 0, 0]}>
                  {sectionTimeData.map((entry) => (
                    <Cell
                      key={entry.section}
                      fill={
                        entry.section === 'landing_page'
                          ? '#14213d'
                          : entry.section === 'screening_page'
                            ? '#ff7f50'
                            : '#7aa095'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {sectionTimeData.map((entry) => (
              <div key={entry.section} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{prettifyStep(entry.section)}</p>
                <p className="mt-2 text-xl font-semibold text-ink">
                  {formatSeconds(entry.avgSeconds)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{entry.sampleCount} samples</p>
              </div>
            ))}
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Endpoint Distribution</h2>
          <p className="mb-4 text-sm text-slate-500">
            Which help routes the service is steering visitors toward.
          </p>
          <div className="h-80" data-testid="tier-breakdown">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={endpointBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {endpointBreakdown.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'crisis_support'
                          ? '#ff7f50'
                          : entry.name === 'medical_referral'
                            ? '#f3c969'
                            : entry.name === 'peer_support'
                              ? '#7aa095'
                              : '#b6c1ca'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Tier Breakdown</h2>
          <p className="mb-4 text-sm text-slate-500">
            Operational distribution of support needs in the filtered window.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {tierBreakdown.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'unwell'
                          ? '#ff7f50'
                          : entry.name === 'distressed'
                            ? '#f3c969'
                            : entry.name === 'at_risk'
                              ? '#7aa095'
                              : '#b6c1ca'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Intervention Performance</h2>
          <p className="mb-4 text-sm text-slate-500">
            Completion performance by intervention type and tier.
          </p>
          <div className="overflow-auto" data-testid="intervention-table">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Intervention</th>
                  <th className="pb-3">Tier</th>
                  <th className="pb-3">Started</th>
                  <th className="pb-3">Completed</th>
                  <th className="pb-3">Completion</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((row) => (
                  <tr
                    key={`${row.interventionType}-${row.tier}`}
                    className="border-t border-slate-100"
                  >
                    <td className="py-3">{row.interventionType}</td>
                    <td className="py-3">{row.tier}</td>
                    <td className="py-3">{row.started}</td>
                    <td className="py-3">{row.completed}</td>
                    <td className="py-3">{formatPercent(row.completionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">High-Risk Leakage</h2>
          <p className="mb-4 text-sm text-slate-500">
            High-risk users who still have no completed help action in the selected window.
          </p>
          <div className="space-y-3" data-testid="leakage-panel">
            {overview.highRiskLeakageUsers.length === 0 ? (
              <p className="rounded-2xl bg-sage/10 px-4 py-6 text-sm text-slate-600">
                No unresolved high-risk leakage detected in this period.
              </p>
            ) : (
              overview.highRiskLeakageUsers.map((user) => (
                <div key={user.userId} className="rounded-2xl bg-rose-50 p-4">
                  <p className="font-medium text-ink">{user.userId}</p>
                  <p className="text-sm text-slate-600">
                    {user.tier} | {user.signalReason}
                  </p>
                  <p className="text-xs text-slate-500">{user.latestSignalAt}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Access Summary</h2>
          <p className="mb-4 text-sm text-slate-500">
            Supporting provider metrics for access progression and care escalation.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Access starts</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{overview.accessStarts}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Access drop-off</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{overview.accessDropOffCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Avg minutes to endpoint</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {overview.avgMinutesToEndpoint ?? 'N/A'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Referral completion</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatPercent(overview.referralCompletionRate)}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6">
        <article className={cardStyle}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">Recent Activity</h2>
              <p className="text-sm text-slate-500">
                Last recorded access and service events for provider monitoring.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500">Active users</p>
              <p className="font-semibold text-ink">{overview.activeUsers}</p>
            </div>
          </div>
          <div className="space-y-3" data-testid="recent-events">
            {overview.recentEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">{event.eventName}</p>
                <p className="text-sm text-slate-500">
                  {event.userId} | {event.page ?? event.accessEndpoint ?? event.tier ?? 'unknown'}
                </p>
                <p className="text-xs text-slate-400">{event.occurredAt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
