import { describe, expect, it } from 'vitest';

import {
  buildAnalyticsOverview,
  buildFunnel,
  buildHighRiskLeakage,
  buildInterventionPerformance,
  deriveTierFromDistressScore,
  filterAnalyticsEvents,
} from '../src/index';
import type { AnalyticsEventRecord, DateRangeFilter } from '../src/types';

const filter: DateRangeFilter = {
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-03-10T23:59:59.999Z',
};

const events: AnalyticsEventRecord[] = [
  {
    id: 'landing-1',
    userId: 'user-1',
    eventName: 'landing_viewed',
    occurredAt: '2026-03-01T00:10:00.000Z',
    yearOfBirth: 2008,
  },
  {
    id: '0',
    userId: 'user-1',
    eventName: 'access_intake_started',
    occurredAt: '2026-03-01T00:30:00.000Z',
  },
  {
    id: '1',
    userId: 'user-1',
    eventName: 'screening_started',
    occurredAt: '2026-03-01T01:00:00.000Z',
  },
  {
    id: '2',
    userId: 'user-1',
    eventName: 'screening_completed',
    occurredAt: '2026-03-01T02:00:00.000Z',
    distressScore: 9,
    tier: 'unwell',
  },
  {
    id: '3',
    userId: 'user-1',
    eventName: 'intervention_started',
    occurredAt: '2026-03-01T05:00:00.000Z',
    interventionType: 'guided_breathing',
    tier: 'unwell',
  },
  {
    id: '4',
    userId: 'user-1',
    eventName: 'intervention_completed',
    occurredAt: '2026-03-01T06:00:00.000Z',
    interventionType: 'guided_breathing',
    tier: 'unwell',
  },
  {
    id: 'page-1',
    userId: 'user-1',
    eventName: 'page_viewed',
    occurredAt: '2026-03-01T06:05:00.000Z',
    page: 'landing_page',
    sessionLengthSec: 34,
  },
  {
    id: '5',
    userId: 'user-2',
    eventName: 'landing_viewed',
    occurredAt: '2026-03-02T00:45:00.000Z',
    yearOfBirth: 1990,
  },
  {
    id: '5a',
    userId: 'user-2',
    eventName: 'access_intake_started',
    occurredAt: '2026-03-02T01:00:00.000Z',
  },
  {
    id: '5aa',
    userId: 'user-2',
    eventName: 'screening_started',
    occurredAt: '2026-03-02T01:20:00.000Z',
  },
  {
    id: '5b',
    userId: 'user-2',
    eventName: 'care_pathway_determined',
    occurredAt: '2026-03-02T02:30:00.000Z',
    accessEndpoint: 'crisis_support',
    tier: 'unwell',
  },
  {
    id: '5c',
    userId: 'user-2',
    eventName: 'screening_completed',
    occurredAt: '2026-03-02T02:00:00.000Z',
    distressScore: 8,
    tier: 'unwell',
  },
  {
    id: '6',
    userId: 'user-2',
    eventName: 'crisis_button_clicked',
    occurredAt: '2026-03-02T03:00:00.000Z',
    tier: 'unwell',
  },
  {
    id: '7',
    userId: 'user-3',
    eventName: 'landing_viewed',
    occurredAt: '2026-03-03T00:40:00.000Z',
    yearOfBirth: 2004,
  },
  {
    id: '7a',
    userId: 'user-3',
    eventName: 'access_intake_started',
    occurredAt: '2026-03-03T01:00:00.000Z',
  },
  {
    id: '7aa',
    userId: 'user-3',
    eventName: 'screening_started',
    occurredAt: '2026-03-03T01:15:00.000Z',
  },
  {
    id: '7b',
    userId: 'user-3',
    eventName: 'care_pathway_determined',
    occurredAt: '2026-03-03T02:15:00.000Z',
    accessEndpoint: 'medical_referral',
    tier: 'distressed',
  },
  {
    id: '7c',
    userId: 'user-3',
    eventName: 'screening_completed',
    occurredAt: '2026-03-03T02:00:00.000Z',
    distressScore: 5,
    tier: 'distressed',
  },
  {
    id: '8',
    userId: 'user-3',
    eventName: 'referral_started',
    occurredAt: '2026-03-04T02:00:00.000Z',
    tier: 'distressed',
  },
  {
    id: '9',
    userId: 'user-3',
    eventName: 'referral_completed',
    occurredAt: '2026-03-05T02:00:00.000Z',
    tier: 'distressed',
  },
  {
    id: '10',
    userId: 'user-3',
    eventName: 'access_flow_completed',
    occurredAt: '2026-03-05T02:05:00.000Z',
    accessEndpoint: 'medical_referral',
    tier: 'distressed',
  },
  {
    id: '11',
    userId: 'user-3',
    eventName: 'resource_clicked',
    occurredAt: '2026-03-05T02:06:00.000Z',
  },
  {
    id: '12',
    userId: 'user-3',
    eventName: 'page_viewed',
    occurredAt: '2026-03-05T02:07:00.000Z',
    page: 'resource_page',
    sessionLengthSec: 80,
  },
];

describe('tier logic', () => {
  it('derives tiers from distress score', () => {
    expect(deriveTierFromDistressScore(2)).toBe('at_risk');
    expect(deriveTierFromDistressScore(5)).toBe('distressed');
    expect(deriveTierFromDistressScore(9)).toBe('unwell');
  });
});

describe('analytics helpers', () => {
  it('filters by date range and tier', () => {
    const result = filterAnalyticsEvents(events, { ...filter, tier: 'distressed' });
    expect(result).toHaveLength(5);
  });

  it('calculates intervention performance', () => {
    const rows = buildInterventionPerformance(events);
    expect(rows[0]).toMatchObject({
      interventionType: 'guided_breathing',
      tier: 'unwell',
      started: 1,
      completed: 1,
      completionRate: 100,
    });
  });

  it('identifies high-risk leakage', () => {
    const leakage = buildHighRiskLeakage(events);
    expect(leakage).toHaveLength(1);
    expect(leakage[0]).toMatchObject({
      userId: 'user-2',
      signalReason: 'crisis_button_clicked',
    });
  });

  it('builds the overview summary', () => {
    const overview = buildAnalyticsOverview(events, filter);
    expect(overview.totalUsers).toBe(3);
    expect(overview.totalVisitors).toBe(3);
    expect(overview.targetDemographicUsers).toBe(2);
    expect(overview.targetDemographicRate).toBeCloseTo(66.7, 1);
    expect(overview.screeningStartRate).toBe(100);
    expect(overview.resourceClickRate).toBeCloseTo(33.3, 1);
    expect(overview.accessStarts).toBe(3);
    expect(overview.accessCompleted).toBe(1);
    expect(overview.endpointDistribution.medical_referral).toBe(1);
    expect(overview.interventionUptakeRate).toBeCloseTo(33.3, 1);
    expect(overview.referralCompletionRate).toBe(100);
    expect(overview.avgHoursToIntervention).toBe(3);
    expect(overview.highRiskLeakageCount).toBe(1);
    expect(overview.sectionTimes.find((section) => section.section === 'landing_page')?.avgSeconds).toBe(34);
    expect(overview.funnel.find((step) => step.step === 'screening_completed')?.users).toBe(3);
  });

  it('caps stage conversion by prior-step cohort membership', () => {
    const funnel = buildFunnel([
      {
        id: 'a',
        userId: 'user-a',
        eventName: 'screening_started',
        occurredAt: '2026-03-01T01:00:00.000Z',
      },
      {
        id: 'b',
        userId: 'user-a',
        eventName: 'screening_completed',
        occurredAt: '2026-03-01T02:00:00.000Z',
      },
      {
        id: 'c',
        userId: 'user-b',
        eventName: 'screening_completed',
        occurredAt: '2026-03-01T03:00:00.000Z',
      },
    ]);

    expect(funnel[0]).toMatchObject({ step: 'screening_started', users: 1, conversionRate: 100 });
    expect(funnel[1]).toMatchObject({ step: 'screening_completed', users: 1, conversionRate: 100 });
  });
});
