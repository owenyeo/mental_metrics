import type { AnalyticsOverview, InterventionPerformanceRow } from '@sil/shared';

import { DashboardView } from '../components/dashboard-view';

const fallbackOverview: AnalyticsOverview = {
  totalUsers: 0,
  totalVisitors: 0,
  activeUsers: 0,
  dailyActiveUsers: 0,
  demographicCoverageRate: 0,
  targetDemographicUsers: 0,
  targetDemographicRate: 0,
  screeningStarts: 0,
  screeningStartRate: 0,
  chatbotStarts: 0,
  chatbotStartRate: 0,
  resourceClicks: 0,
  resourceClickRate: 0,
  accessStarts: 0,
  accessCompleted: 0,
  accessCompletionRate: 0,
  accessDropOffCount: 0,
  avgMinutesToEndpoint: null,
  interventionUptakeRate: 0,
  interventionCompletionRate: 0,
  referralCompletionRate: 0,
  avgHoursToIntervention: null,
  avgHoursToReferral: null,
  highRiskLeakageCount: 0,
  tierDistribution: {
    at_risk: 0,
    distressed: 0,
    unwell: 0,
    unknown: 0,
  },
  endpointDistribution: {
    self_help: 0,
    peer_support: 0,
    medical_referral: 0,
    crisis_support: 0,
    unknown: 0,
  },
  funnel: [],
  accessFunnel: [],
  dropOffFunnel: [],
  sectionTimes: [],
  trend: [],
  highRiskLeakageUsers: [],
  recentEvents: [],
};

async function loadData<T>(url: string, projectKey: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { 'x-project-key': projectKey },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default async function Page() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const projectKey = process.env.NEXT_PUBLIC_PROJECT_KEY ?? 'demo_project_key';
  const query = 'from=2026-03-01T00:00:00.000Z&to=2026-03-31T23:59:59.999Z';

  const overview =
    (await loadData<AnalyticsOverview>(
      `${apiBaseUrl}/v1/analytics/overview?${query}`,
      projectKey,
    )) ?? fallbackOverview;
  const interventionPayload =
    (await loadData<{ items: InterventionPerformanceRow[] }>(
      `${apiBaseUrl}/v1/analytics/interventions?${query}`,
      projectKey,
    )) ?? { items: [] };

  return (
    <DashboardView
      initialOverview={overview}
      initialInterventions={interventionPayload.items}
      apiBaseUrl={apiBaseUrl}
      projectKey={projectKey}
    />
  );
}
