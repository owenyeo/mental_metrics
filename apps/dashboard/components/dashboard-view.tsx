'use client';

import type { AnalyticsOverview, InterventionPerformanceRow, Tier } from '@sil/shared';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
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
          error instanceof Error
            ? error.message
            : 'Unable to refresh analytics right now.',
        );
      }
    }

    void load();
  }, [apiBaseUrl, projectKey, tier]);

  const tierBreakdown = useMemo(
    () =>
      Object.entries(overview.tierDistribution).map(([name, value]) => ({
        name,
        value,
      })),
    [overview.tierDistribution],
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-slate-500">
            Service Intelligence Layer
          </p>
          <h1 className="text-4xl font-semibold text-ink">Provider Operations Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Track meaningful engagement, intervention uptake, escalation-to-care, and high-risk
            missed-help signals across your service funnel.
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
          <p className="text-sm text-slate-500">Total users</p>
          <p className="mt-3 text-3xl font-semibold">{overview.totalUsers}</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Active users</p>
          <p className="mt-3 text-3xl font-semibold">{overview.activeUsers}</p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">Intervention uptake</p>
          <p className="mt-3 text-3xl font-semibold">
            {formatPercent(overview.interventionUptakeRate)}
          </p>
        </article>
        <article className={cardStyle}>
          <p className="text-sm text-slate-500">High-risk leakage</p>
          <p className="mt-3 text-3xl font-semibold">{overview.highRiskLeakageCount}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className={cardStyle}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Journey Funnel</h2>
              <p className="text-sm text-slate-500">Key transitions across the help pathway.</p>
            </div>
          </div>
          <div className="space-y-4" data-testid="funnel-chart">
            {overview.funnel.map((step) => (
              <div key={step.step}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{step.step}</span>
                  <span>
                    {step.users} users · {formatPercent(step.conversionRate)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-coral transition-all"
                    style={{ width: `${Math.max(step.conversionRate, 6)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Tier Breakdown</h2>
          <p className="mb-4 text-sm text-slate-500">Operational distribution of support needs.</p>
          <div className="h-72" data-testid="tier-breakdown">
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
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Service Trends</h2>
          <p className="mb-4 text-sm text-slate-500">
            Daily active users, intervention starts, and completed referrals.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="activeUsers" stroke="#14213d" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="interventionsStarted"
                  stroke="#ff7f50"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="referralsCompleted"
                  stroke="#7aa095"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">High-Risk Leakage</h2>
          <p className="mb-4 text-sm text-slate-500">
            Users with signals of need but no completed help action in the selected window.
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
                    {user.tier} · {user.signalReason}
                  </p>
                  <p className="text-xs text-slate-500">{user.latestSignalAt}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
                  <tr key={`${row.interventionType}-${row.tier}`} className="border-t border-slate-100">
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

        <article className={cardStyle}>
          <h2 className="text-xl font-semibold text-ink">Recent Activity</h2>
          <p className="mb-4 text-sm text-slate-500">
            Last recorded service events for provider monitoring.
          </p>
          <div className="space-y-3" data-testid="recent-events">
            {overview.recentEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium">{event.eventName}</p>
                <p className="text-sm text-slate-500">
                  {event.userId} · {event.tier ?? 'unknown'}
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
