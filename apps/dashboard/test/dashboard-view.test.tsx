import type { AnalyticsOverview, InterventionPerformanceRow } from '@sil/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardView } from '../components/dashboard-view';

function mockJsonResponse(payload: unknown): Response {
  return {
    ok: true,
    headers: {
      get: () => 'application/json',
    },
    text: async () => JSON.stringify(payload),
  } as Response;
}

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
  totalVisitors: 18,
  activeUsers: 8,
  dailyActiveUsers: 5,
  demographicCoverageRate: 66.7,
  targetDemographicUsers: 11,
  targetDemographicRate: 61.1,
  screeningStarts: 9,
  screeningStartRate: 50,
  chatbotStarts: 4,
  chatbotStartRate: 22.2,
  resourceClicks: 6,
  resourceClickRate: 33.3,
  accessStarts: 10,
  accessCompleted: 7,
  accessCompletionRate: 70,
  accessDropOffCount: 3,
  avgMinutesToEndpoint: 4.5,
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
  endpointDistribution: {
    self_help: 3,
    peer_support: 4,
    medical_referral: 2,
    crisis_support: 1,
    unknown: 0,
  },
  funnel: [
    { step: 'screening_started', users: 12, conversionRate: 100 },
    { step: 'screening_completed', users: 10, conversionRate: 83.3 },
  ],
  accessFunnel: [
    { step: 'access_intake_started', users: 10, conversionRate: 100 },
    { step: 'screening_completed', users: 9, conversionRate: 90 },
  ],
  dropOffFunnel: [
    {
      fromStep: 'landing_viewed',
      toStep: 'screening_started',
      enteredUsers: 18,
      completedUsers: 9,
      conversionRate: 50,
      dropOffRate: 50,
    },
  ],
  sectionTimes: [
    { section: 'landing_page', avgSeconds: 42, sampleCount: 5 },
    { section: 'screening_page', avgSeconds: 95, sampleCount: 4 },
    { section: 'resource_page', avgSeconds: 61, sampleCount: 3 },
  ],
  trend: [
    {
      date: '2026-03-01',
      activeUsers: 3,
      visitors: 4,
      screeningStarts: 2,
      chatStarts: 1,
      resourceClicks: 1,
      interventionsStarted: 1,
      referralsCompleted: 0,
      accessCompletions: 2,
    },
  ],
  highRiskLeakageUsers: [
    {
      userId: 'user-1',
      tier: 'unwell',
      latestSignalAt: '2026-03-01T01:00:00.000Z',
      signalReason: 'crisis_button_clicked',
    },
  ],
  recentEvents: [
    {
      id: '1',
      eventName: 'care_pathway_determined',
      occurredAt: '2026-03-01T01:00:00.000Z',
      tier: 'distressed',
      accessEndpoint: 'peer_support',
      interventionType: null,
      referralDestination: null,
      page: null,
      userId: 'user-2',
    },
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
          return mockJsonResponse({ items: interventions });
        }

        return mockJsonResponse(overview);
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

    expect(screen.getByTestId('kpi-total-users')).toHaveTextContent('18');
    expect(screen.getByTestId('funnel-chart')).toHaveTextContent('landing viewed to screening started');
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
