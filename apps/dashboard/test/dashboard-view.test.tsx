import type { AnalyticsOverview, InterventionPerformanceRow } from '@sil/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardView } from '../components/dashboard-view';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  Cell: () => null,
}));

const overview: AnalyticsOverview = {
  totalUsers: 12,
  activeUsers: 8,
  dailyActiveUsers: 5,
  interventionUptakeRate: 66.7,
  interventionCompletionRate: 60,
  referralCompletionRate: 50,
  avgHoursToIntervention: 6,
  avgHoursToReferral: 12,
  highRiskLeakageCount: 1,
  tierDistribution: {
    at_risk: 3,
    distressed: 5,
    unwell: 4,
    unknown: 0,
  },
  funnel: [
    { step: 'screening_started', users: 12, conversionRate: 100 },
    { step: 'screening_completed', users: 10, conversionRate: 83.3 },
  ],
  trend: [
    { date: '2026-03-01', activeUsers: 3, interventionsStarted: 1, referralsCompleted: 0 },
  ],
  highRiskLeakageUsers: [
    { userId: 'user-1', tier: 'unwell', latestSignalAt: '2026-03-01T01:00:00.000Z', signalReason: 'crisis_button_clicked' },
  ],
  recentEvents: [
    { id: '1', eventName: 'screening_completed', occurredAt: '2026-03-01T01:00:00.000Z', tier: 'distressed', interventionType: null, referralDestination: null, userId: 'user-2' },
  ],
};

const interventions: InterventionPerformanceRow[] = [
  { interventionType: 'guided_breathing', tier: 'distressed', started: 6, completed: 3, completionRate: 50 },
];

describe('DashboardView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/interventions')) {
          return { ok: true, json: async () => ({ items: interventions }) } as Response;
        }

        return { ok: true, json: async () => overview } as Response;
      }),
    );
  });

  it('renders KPI cards and tables', () => {
    render(
      <DashboardView
        initialOverview={overview}
        initialInterventions={interventions}
        apiBaseUrl="http://localhost:4000"
        projectKey="demo_project_key"
      />,
    );

    expect(screen.getByTestId('kpi-total-users')).toHaveTextContent('12');
    expect(screen.getByTestId('funnel-chart')).toHaveTextContent('screening_completed');
    expect(screen.getByTestId('intervention-table')).toHaveTextContent('guided_breathing');
    expect(screen.getByTestId('leakage-panel')).toHaveTextContent('crisis_button_clicked');
  });

  it('refetches on tier filter change', async () => {
    const fetchSpy = vi.mocked(global.fetch);

    render(
      <DashboardView
        initialOverview={overview}
        initialInterventions={interventions}
        apiBaseUrl="http://localhost:4000"
        projectKey="demo_project_key"
      />,
    );

    fireEvent.change(screen.getByLabelText('Tier filter'), {
      target: { value: 'unwell' },
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });
});
