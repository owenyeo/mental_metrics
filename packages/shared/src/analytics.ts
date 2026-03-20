import { differenceInHours, endOfDay, formatISO, isWithinInterval, parseISO, startOfDay } from 'date-fns';

import { HELP_ACTION_EVENTS, HIGH_RISK_SIGNAL_EVENTS, type Tier } from './events';
import type {
  AnalyticsEventRecord,
  AnalyticsOverview,
  DateRangeFilter,
  FunnelStep,
  InterventionPerformanceRow,
  LeakageUser,
  TrendPoint,
} from './types';
import { deriveTierFromDistressScore } from './tier';

function inRange(date: string, filter: DateRangeFilter): boolean {
  return isWithinInterval(parseISO(date), {
    start: parseISO(filter.from),
    end: parseISO(filter.to),
  });
}

function normalizeTier(record: AnalyticsEventRecord): Tier | 'unknown' {
  return record.tier ?? deriveTierFromDistressScore(record.distressScore) ?? 'unknown';
}

function userSet(events: AnalyticsEventRecord[], eventName?: string): Set<string> {
  const selected = eventName ? events.filter((event) => event.eventName === eventName) : events;
  return new Set(selected.map((event) => event.userId));
}

function conversionRate(numerator: number, denominator: number): number {
  if (!denominator) {
    return 0;
  }

  return Number(((numerator / denominator) * 100).toFixed(1));
}

function average(numbers: number[]): number | null {
  if (!numbers.length) {
    return null;
  }

  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
}

export function filterAnalyticsEvents(
  events: AnalyticsEventRecord[],
  filter: DateRangeFilter,
): AnalyticsEventRecord[] {
  return events.filter((event) => {
    if (!inRange(event.occurredAt, filter)) {
      return false;
    }

    if (filter.tier) {
      return normalizeTier(event) === filter.tier;
    }

    return true;
  });
}

export function buildFunnel(events: AnalyticsEventRecord[]): FunnelStep[] {
  const startedScreening = userSet(events, 'screening_started').size;
  const completedScreening = userSet(events, 'screening_completed').size;
  const startedIntervention = userSet(events, 'intervention_started').size;
  const completedIntervention = userSet(events, 'intervention_completed').size;
  const startedReferral = userSet(events, 'referral_started').size;
  const completedReferral = userSet(events, 'referral_completed').size;

  return [
    {
      step: 'screening_started',
      users: startedScreening,
      conversionRate: 100,
    },
    {
      step: 'screening_completed',
      users: completedScreening,
      conversionRate: conversionRate(completedScreening, startedScreening),
    },
    {
      step: 'intervention_started',
      users: startedIntervention,
      conversionRate: conversionRate(startedIntervention, completedScreening),
    },
    {
      step: 'intervention_completed',
      users: completedIntervention,
      conversionRate: conversionRate(completedIntervention, startedIntervention),
    },
    {
      step: 'referral_started',
      users: startedReferral,
      conversionRate: conversionRate(startedReferral, startedIntervention || completedScreening),
    },
    {
      step: 'referral_completed',
      users: completedReferral,
      conversionRate: conversionRate(completedReferral, startedReferral),
    },
  ];
}

export function buildInterventionPerformance(
  events: AnalyticsEventRecord[],
): InterventionPerformanceRow[] {
  const buckets = new Map<string, InterventionPerformanceRow>();

  for (const event of events) {
    if (!['intervention_started', 'intervention_completed'].includes(event.eventName)) {
      continue;
    }

    const keyTier = normalizeTier(event);
    const interventionType = event.interventionType ?? 'unspecified';
    const key = `${interventionType}:${keyTier}`;
    const row = buckets.get(key) ?? {
      interventionType,
      tier: keyTier,
      started: 0,
      completed: 0,
      completionRate: 0,
    };

    if (event.eventName === 'intervention_started') {
      row.started += 1;
    } else {
      row.completed += 1;
    }

    buckets.set(key, row);
  }

  return Array.from(buckets.values())
    .map((row) => ({
      ...row,
      completionRate: conversionRate(row.completed, row.started),
    }))
    .sort((left, right) => right.completed - left.completed);
}

export function buildTrend(events: AnalyticsEventRecord[], filter: DateRangeFilter): TrendPoint[] {
  const points = new Map<string, TrendPoint>();
  const start = startOfDay(parseISO(filter.from));
  const end = endOfDay(parseISO(filter.to));

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    const key = formatISO(cursor, { representation: 'date' });
    points.set(key, {
      date: key,
      activeUsers: 0,
      interventionsStarted: 0,
      referralsCompleted: 0,
    });
  }

  for (const [date, bucket] of points) {
    const dailyEvents = events.filter(
      (event) => formatISO(parseISO(event.occurredAt), { representation: 'date' }) === date,
    );

    bucket.activeUsers = new Set(dailyEvents.map((event) => event.userId)).size;
    bucket.interventionsStarted = dailyEvents.filter(
      (event) => event.eventName === 'intervention_started',
    ).length;
    bucket.referralsCompleted = dailyEvents.filter(
      (event) => event.eventName === 'referral_completed',
    ).length;
  }

  return Array.from(points.values());
}

export function buildHighRiskLeakage(events: AnalyticsEventRecord[]): LeakageUser[] {
  const byUser = new Map<string, AnalyticsEventRecord[]>();

  for (const event of events) {
    const group = byUser.get(event.userId) ?? [];
    group.push(event);
    byUser.set(event.userId, group);
  }

  const leakageUsers: LeakageUser[] = [];

  for (const [userId, userEvents] of byUser) {
    const sortedEvents = [...userEvents].sort(
      (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
    );
    const helpCompleted = sortedEvents.some((event) => HELP_ACTION_EVENTS.includes(event.eventName));
    const signalEvent = [...sortedEvents]
      .reverse()
      .find((event) => {
        const tier = normalizeTier(event);
        const elevatedDistress = (event.distressScore ?? 0) >= 8;

        return (
          HIGH_RISK_SIGNAL_EVENTS.includes(event.eventName) ||
          tier === 'unwell' ||
          elevatedDistress
        );
      });

    if (!helpCompleted && signalEvent) {
      leakageUsers.push({
        userId,
        tier: normalizeTier(signalEvent),
        latestSignalAt: signalEvent.occurredAt,
        signalReason:
          signalEvent.eventName === 'screening_completed'
            ? 'high_distress_screening'
            : signalEvent.eventName,
      });
    }
  }

  return leakageUsers.sort(
    (left, right) => new Date(right.latestSignalAt).getTime() - new Date(left.latestSignalAt).getTime(),
  );
}

function buildTimeToEvent(
  events: AnalyticsEventRecord[],
  fromName: string,
  toName: string,
): number | null {
  const byUser = new Map<string, AnalyticsEventRecord[]>();

  for (const event of events) {
    const current = byUser.get(event.userId) ?? [];
    current.push(event);
    byUser.set(event.userId, current);
  }

  const durations: number[] = [];

  for (const userEvents of byUser.values()) {
    const startEvent = userEvents
      .filter((event) => event.eventName === fromName)
      .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())[0];
    const endEvent = userEvents
      .filter((event) => event.eventName === toName)
      .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())[0];

    if (startEvent && endEvent && parseISO(endEvent.occurredAt) >= parseISO(startEvent.occurredAt)) {
      durations.push(differenceInHours(parseISO(endEvent.occurredAt), parseISO(startEvent.occurredAt)));
    }
  }

  return average(durations);
}

export function buildAnalyticsOverview(
  events: AnalyticsEventRecord[],
  filter: DateRangeFilter,
): AnalyticsOverview {
  const filtered = filterAnalyticsEvents(events, filter);
  const funnel = buildFunnel(filtered);
  const leakageUsers = buildHighRiskLeakage(filtered);
  const interventionStartedUsers = userSet(filtered, 'intervention_started').size;
  const interventionCompletedUsers = userSet(filtered, 'intervention_completed').size;
  const referralStartedUsers = userSet(filtered, 'referral_started').size;
  const referralCompletedUsers = userSet(filtered, 'referral_completed').size;
  const screeningCompletedUsers = userSet(filtered, 'screening_completed').size;
  const tiers: AnalyticsOverview['tierDistribution'] = {
    at_risk: 0,
    distressed: 0,
    unwell: 0,
    unknown: 0,
  };

  for (const userId of userSet(filtered)) {
    const latest = filtered
      .filter((event) => event.userId === userId)
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];
    tiers[normalizeTier(latest)] += 1;
  }

  return {
    totalUsers: userSet(filtered).size,
    activeUsers: userSet(filtered).size,
    dailyActiveUsers: buildTrend(filtered, filter).slice(-1)[0]?.activeUsers ?? 0,
    interventionUptakeRate: conversionRate(interventionStartedUsers, screeningCompletedUsers),
    interventionCompletionRate: conversionRate(
      interventionCompletedUsers,
      interventionStartedUsers,
    ),
    referralCompletionRate: conversionRate(referralCompletedUsers, referralStartedUsers),
    avgHoursToIntervention: buildTimeToEvent(filtered, 'screening_completed', 'intervention_started'),
    avgHoursToReferral: buildTimeToEvent(filtered, 'escalation_recommended', 'referral_completed'),
    highRiskLeakageCount: leakageUsers.length,
    tierDistribution: tiers,
    funnel,
    trend: buildTrend(filtered, filter),
    highRiskLeakageUsers: leakageUsers,
    recentEvents: filtered
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        eventName: event.eventName,
        occurredAt: event.occurredAt,
        tier: normalizeTier(event) === 'unknown' ? null : (normalizeTier(event) as Tier),
        interventionType: event.interventionType ?? null,
        referralDestination: event.referralDestination ?? null,
        userId: event.userId,
      })),
  };
}
