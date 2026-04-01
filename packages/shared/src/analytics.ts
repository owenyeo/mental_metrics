import { differenceInHours, endOfDay, formatISO, isWithinInterval, parseISO, startOfDay } from 'date-fns';

import {
  ACCESS_ENDPOINTS,
  HELP_ACTION_EVENTS,
  HIGH_RISK_SIGNAL_EVENTS,
  type AccessEndpoint,
  type Tier,
} from './events';
import type {
  AnalyticsEventRecord,
  AnalyticsOverview,
  DateRangeFilter,
  DropOffStep,
  FunnelStep,
  InterventionPerformanceRow,
  LeakageUser,
  SectionTimeMetric,
  TrendPoint,
} from './types';
import { deriveTierFromDistressScore } from './tier';

const TARGET_AGE_MIN = 13;
const TARGET_AGE_MAX = 24;
const FURTHER_RESOURCE_EVENTS = [
  'resource_clicked',
  'chat_requested',
  'intervention_started',
  'referral_started',
] as const;
const SECTION_NAMES: SectionTimeMetric['section'][] = [
  'landing_page',
  'screening_page',
  'resource_page',
];

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

function userSetForAny(events: AnalyticsEventRecord[], eventNames: readonly string[]): Set<string> {
  return new Set(
    events
      .filter((event) => eventNames.includes(event.eventName))
      .map((event) => event.userId),
  );
}

function intersectUsers(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((userId) => right.has(userId)));
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

function averageMinutes(numbers: number[]): number | null {
  if (!numbers.length) {
    return null;
  }

  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(1));
}

function latestEventWithValue<T>(
  events: AnalyticsEventRecord[],
  selector: (event: AnalyticsEventRecord) => T | null | undefined,
): T | null {
  const latest = [...events]
    .filter((event) => selector(event) !== null && selector(event) !== undefined)
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];

  return latest ? (selector(latest) ?? null) : null;
}

function ageFromYearOfBirth(yearOfBirth: number, referenceDate: string): number {
  return new Date(referenceDate).getUTCFullYear() - yearOfBirth;
}

function targetDemographicUsers(events: AnalyticsEventRecord[], referenceDate: string) {
  const byUser = new Map<string, AnalyticsEventRecord[]>();

  for (const event of events) {
    const current = byUser.get(event.userId) ?? [];
    current.push(event);
    byUser.set(event.userId, current);
  }

  let withYearOfBirth = 0;
  let inTarget = 0;

  for (const userEvents of byUser.values()) {
    const yearOfBirth = latestEventWithValue(userEvents, (event) => event.yearOfBirth);

    if (!yearOfBirth) {
      continue;
    }

    withYearOfBirth += 1;
    const age = ageFromYearOfBirth(yearOfBirth, referenceDate);
    if (age >= TARGET_AGE_MIN && age <= TARGET_AGE_MAX) {
      inTarget += 1;
    }
  }

  return {
    withYearOfBirth,
    inTarget,
  };
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
  const screeningStartedUsers = userSet(events, 'screening_started');
  const screeningCompletedUsers = intersectUsers(
    screeningStartedUsers,
    userSet(events, 'screening_completed'),
  );
  const interventionStartedUsers = intersectUsers(
    screeningCompletedUsers,
    userSet(events, 'intervention_started'),
  );
  const interventionCompletedUsers = intersectUsers(
    interventionStartedUsers,
    userSet(events, 'intervention_completed'),
  );
  const referralStartedUsers = intersectUsers(
    screeningCompletedUsers,
    userSet(events, 'referral_started'),
  );
  const referralCompletedUsers = intersectUsers(
    referralStartedUsers,
    userSet(events, 'referral_completed'),
  );

  return [
    {
      step: 'screening_started',
      users: screeningStartedUsers.size,
      conversionRate: 100,
    },
    {
      step: 'screening_completed',
      users: screeningCompletedUsers.size,
      conversionRate: conversionRate(screeningCompletedUsers.size, screeningStartedUsers.size),
    },
    {
      step: 'intervention_started',
      users: interventionStartedUsers.size,
      conversionRate: conversionRate(interventionStartedUsers.size, screeningCompletedUsers.size),
    },
    {
      step: 'intervention_completed',
      users: interventionCompletedUsers.size,
      conversionRate: conversionRate(
        interventionCompletedUsers.size,
        interventionStartedUsers.size,
      ),
    },
    {
      step: 'referral_started',
      users: referralStartedUsers.size,
      conversionRate: conversionRate(referralStartedUsers.size, screeningCompletedUsers.size),
    },
    {
      step: 'referral_completed',
      users: referralCompletedUsers.size,
      conversionRate: conversionRate(referralCompletedUsers.size, referralStartedUsers.size),
    },
  ];
}

export function buildAccessFunnel(events: AnalyticsEventRecord[]): FunnelStep[] {
  const intakeStartedUsers = userSet(events, 'access_intake_started');
  const fallbackScreeningStartedUsers = userSet(events, 'screening_started');
  const effectiveIntakeUsers =
    intakeStartedUsers.size > 0 ? intakeStartedUsers : fallbackScreeningStartedUsers;
  const screeningCompletedUsers = intersectUsers(
    effectiveIntakeUsers,
    userSet(events, 'screening_completed'),
  );
  const pathwayDeterminationUsers = intersectUsers(
    screeningCompletedUsers.size > 0 ? screeningCompletedUsers : effectiveIntakeUsers,
    userSet(events, 'care_pathway_determined'),
  );
  const accessCompletedUsers = intersectUsers(
    pathwayDeterminationUsers.size > 0 ? pathwayDeterminationUsers : screeningCompletedUsers,
    userSet(events, 'access_flow_completed'),
  );

  return [
    {
      step: 'access_intake_started',
      users: effectiveIntakeUsers.size,
      conversionRate: 100,
    },
    {
      step: 'screening_completed',
      users: screeningCompletedUsers.size,
      conversionRate: conversionRate(screeningCompletedUsers.size, effectiveIntakeUsers.size),
    },
    {
      step: 'care_pathway_determined',
      users: pathwayDeterminationUsers.size,
      conversionRate: conversionRate(
        pathwayDeterminationUsers.size,
        screeningCompletedUsers.size || effectiveIntakeUsers.size,
      ),
    },
    {
      step: 'access_flow_completed',
      users: accessCompletedUsers.size,
      conversionRate: conversionRate(
        accessCompletedUsers.size,
        pathwayDeterminationUsers.size || screeningCompletedUsers.size,
      ),
    },
  ];
}

export function buildDropOffFunnel(events: AnalyticsEventRecord[]): DropOffStep[] {
  const landingUsers = userSet(events, 'landing_viewed');
  const cohortStart = landingUsers.size > 0 ? landingUsers : userSet(events);
  const screeningStartedUsers = intersectUsers(cohortStart, userSet(events, 'screening_started'));
  const screeningCompletedUsers = intersectUsers(
    screeningStartedUsers,
    userSet(events, 'screening_completed'),
  );
  const furtherResourceUsers = intersectUsers(
    screeningCompletedUsers,
    userSetForAny(events, FURTHER_RESOURCE_EVENTS),
  );

  return [
    {
      fromStep: 'landing_viewed',
      toStep: 'screening_started',
      enteredUsers: cohortStart.size,
      completedUsers: screeningStartedUsers.size,
      conversionRate: conversionRate(screeningStartedUsers.size, cohortStart.size),
      dropOffRate: conversionRate(cohortStart.size - screeningStartedUsers.size, cohortStart.size),
    },
    {
      fromStep: 'screening_started',
      toStep: 'screening_completed',
      enteredUsers: screeningStartedUsers.size,
      completedUsers: screeningCompletedUsers.size,
      conversionRate: conversionRate(screeningCompletedUsers.size, screeningStartedUsers.size),
      dropOffRate: conversionRate(
        screeningStartedUsers.size - screeningCompletedUsers.size,
        screeningStartedUsers.size,
      ),
    },
    {
      fromStep: 'screening_completed',
      toStep: 'further_resource_use',
      enteredUsers: screeningCompletedUsers.size,
      completedUsers: furtherResourceUsers.size,
      conversionRate: conversionRate(furtherResourceUsers.size, screeningCompletedUsers.size),
      dropOffRate: conversionRate(
        screeningCompletedUsers.size - furtherResourceUsers.size,
        screeningCompletedUsers.size,
      ),
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
      visitors: 0,
      screeningStarts: 0,
      chatStarts: 0,
      resourceClicks: 0,
      interventionsStarted: 0,
      referralsCompleted: 0,
      accessCompletions: 0,
    });
  }

  for (const [date, bucket] of points) {
    const dailyEvents = events.filter(
      (event) => formatISO(parseISO(event.occurredAt), { representation: 'date' }) === date,
    );

    bucket.activeUsers = new Set(dailyEvents.map((event) => event.userId)).size;
    bucket.visitors = userSet(dailyEvents, 'landing_viewed').size;
    bucket.screeningStarts = userSet(dailyEvents, 'screening_started').size;
    bucket.chatStarts = userSet(dailyEvents, 'chat_requested').size;
    bucket.resourceClicks = userSet(dailyEvents, 'resource_clicked').size;
    bucket.interventionsStarted = userSet(dailyEvents, 'intervention_started').size;
    bucket.referralsCompleted = userSet(dailyEvents, 'referral_completed').size;
    bucket.accessCompletions = userSet(dailyEvents, 'access_flow_completed').size;
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

function buildMinutesToEndpoint(events: AnalyticsEventRecord[]): number | null {
  const byUser = new Map<string, AnalyticsEventRecord[]>();

  for (const event of events) {
    const current = byUser.get(event.userId) ?? [];
    current.push(event);
    byUser.set(event.userId, current);
  }

  const durations: number[] = [];

  for (const userEvents of byUser.values()) {
    const startEvent = userEvents
      .filter((event) => event.eventName === 'access_intake_started')
      .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())[0];
    const endEvent = userEvents
      .filter((event) => ['care_pathway_determined', 'access_flow_completed'].includes(event.eventName))
      .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())[0];

    if (startEvent && endEvent) {
      const minutes =
        (parseISO(endEvent.occurredAt).getTime() - parseISO(startEvent.occurredAt).getTime()) /
        (1000 * 60);
      if (minutes >= 0) {
        durations.push(minutes);
      }
    }
  }

  return averageMinutes(durations);
}

function buildSectionTimes(events: AnalyticsEventRecord[]): SectionTimeMetric[] {
  return SECTION_NAMES.map((section) => {
    const relevant = events.filter(
      (event) =>
        event.eventName === 'page_viewed' &&
        event.page === section &&
        typeof event.sessionLengthSec === 'number',
    );

    return {
      section,
      avgSeconds: average(relevant.map((event) => event.sessionLengthSec as number)),
      sampleCount: relevant.length,
    };
  });
}

function buildEndpointDistribution(
  events: AnalyticsEventRecord[],
): Record<AccessEndpoint | 'unknown', number> {
  const distribution: Record<AccessEndpoint | 'unknown', number> = {
    self_help: 0,
    peer_support: 0,
    medical_referral: 0,
    crisis_support: 0,
    unknown: 0,
  };

  const byUser = new Map<string, AnalyticsEventRecord[]>();
  for (const event of events) {
    const current = byUser.get(event.userId) ?? [];
    current.push(event);
    byUser.set(event.userId, current);
  }

  for (const userEvents of byUser.values()) {
    const latestEndpointEvent = [...userEvents]
      .filter((event) => event.eventName === 'care_pathway_determined' || event.eventName === 'access_flow_completed')
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];

    if (!latestEndpointEvent?.accessEndpoint) {
      distribution.unknown += 1;
      continue;
    }

    distribution[latestEndpointEvent.accessEndpoint] += 1;
  }

  return distribution;
}

export function buildAnalyticsOverview(
  events: AnalyticsEventRecord[],
  filter: DateRangeFilter,
): AnalyticsOverview {
  const filtered = filterAnalyticsEvents(events, filter);
  const funnel = buildFunnel(filtered);
  const accessFunnel = buildAccessFunnel(filtered);
  const dropOffFunnel = buildDropOffFunnel(filtered);
  const leakageUsers = buildHighRiskLeakage(filtered);
  const totalVisitors = userSet(filtered, 'landing_viewed').size || userSet(filtered).size;
  const screeningStartedUsers = userSet(filtered, 'screening_started').size;
  const chatbotStartedUsers = userSet(filtered, 'chat_requested').size;
  const resourceClickUsers = userSet(filtered, 'resource_clicked').size;
  const accessStartedUsers =
    userSet(filtered, 'access_intake_started').size || screeningStartedUsers;
  const accessCompletedUsers = userSet(filtered, 'access_flow_completed').size;
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

  const demographicSummary = targetDemographicUsers(
    filtered.filter((event) => event.eventName === 'landing_viewed' || event.eventName === 'screening_started'),
    filter.to,
  );

  return {
    totalUsers: userSet(filtered).size,
    totalVisitors,
    activeUsers: userSet(filtered).size,
    dailyActiveUsers: buildTrend(filtered, filter).slice(-1)[0]?.activeUsers ?? 0,
    demographicCoverageRate: conversionRate(demographicSummary.withYearOfBirth, totalVisitors),
    targetDemographicUsers: demographicSummary.inTarget,
    targetDemographicRate: conversionRate(demographicSummary.inTarget, totalVisitors),
    screeningStarts: screeningStartedUsers,
    screeningStartRate: conversionRate(screeningStartedUsers, totalVisitors),
    chatbotStarts: chatbotStartedUsers,
    chatbotStartRate: conversionRate(chatbotStartedUsers, totalVisitors),
    resourceClicks: resourceClickUsers,
    resourceClickRate: conversionRate(resourceClickUsers, totalVisitors),
    accessStarts: accessStartedUsers,
    accessCompleted: accessCompletedUsers,
    accessCompletionRate: conversionRate(accessCompletedUsers, accessStartedUsers),
    accessDropOffCount: Math.max(
      accessStartedUsers - userSet(filtered, 'care_pathway_determined').size,
      0,
    ),
    avgMinutesToEndpoint: buildMinutesToEndpoint(filtered),
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
    endpointDistribution: buildEndpointDistribution(
      filtered.filter((event) => event.eventName === 'care_pathway_determined' || event.eventName === 'access_flow_completed'),
    ),
    funnel,
    accessFunnel,
    dropOffFunnel,
    sectionTimes: buildSectionTimes(filtered),
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
        accessEndpoint: event.accessEndpoint ?? null,
        interventionType: event.interventionType ?? null,
        referralDestination: event.referralDestination ?? null,
        page: event.page ?? null,
        userId: event.userId,
      })),
  };
}
