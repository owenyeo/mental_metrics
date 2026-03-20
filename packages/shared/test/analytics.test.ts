import { describe, expect, it } from 'vitest';

import {
  buildAnalyticsOverview,
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
    id: '5',
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
    expect(result).toHaveLength(3);
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
    expect(overview.interventionUptakeRate).toBeCloseTo(33.3, 1);
    expect(overview.referralCompletionRate).toBe(100);
    expect(overview.avgHoursToIntervention).toBe(3);
    expect(overview.highRiskLeakageCount).toBe(1);
    expect(overview.funnel.find((step) => step.step === 'screening_completed')?.users).toBe(3);
  });
});
