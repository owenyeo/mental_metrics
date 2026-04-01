import type { AccessEndpoint, EventName, Tier } from './events';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EventProperties {
  tier?: Tier;
  access_endpoint?: AccessEndpoint;
  intake_step?: string;
  intervention_type?: string;
  distress_score?: number;
  referral_destination?: string;
  session_length_sec?: number;
  source?: string;
  page?: string;
  year_of_birth?: number;
  timestamp?: string;
  [key: string]: JsonValue | undefined;
}

export interface TrackerConfig {
  ingestUrl: string;
  projectKey: string;
  flushIntervalMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export interface IdentifyTraits {
  ageBand?: string;
  yearOfBirth?: number;
  referralSource?: string;
  cohort?: string;
  [key: string]: JsonValue | undefined;
}

export interface SdkEventInput {
  eventName: EventName;
  userId?: string | null;
  anonymousId: string;
  sessionId: string;
  occurredAt?: string;
  properties?: EventProperties;
  traits?: IdentifyTraits;
  idempotencyKey?: string;
}

export interface IngestEventRequest {
  messageId?: string;
  userId?: string | null;
  anonymousId: string;
  sessionId: string;
  eventName: EventName;
  occurredAt?: string;
  properties?: EventProperties;
  traits?: IdentifyTraits;
}

export interface IngestBatchRequest {
  events: IngestEventRequest[];
}

export interface DateRangeFilter {
  from: string;
  to: string;
  tier?: Tier;
}

export interface RecentEventItem {
  id: string;
  eventName: EventName;
  occurredAt: string;
  tier?: Tier | null;
  accessEndpoint?: AccessEndpoint | null;
  interventionType?: string | null;
  referralDestination?: string | null;
  page?: string | null;
  userId: string;
}

export interface FunnelStep {
  step: string;
  users: number;
  conversionRate: number;
}

export interface DropOffStep {
  fromStep: string;
  toStep: string;
  enteredUsers: number;
  completedUsers: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface SectionTimeMetric {
  section: 'landing_page' | 'screening_page' | 'resource_page';
  avgSeconds: number | null;
  sampleCount: number;
}

export interface InterventionPerformanceRow {
  interventionType: string;
  tier: Tier | 'unknown';
  started: number;
  completed: number;
  completionRate: number;
}

export interface TrendPoint {
  date: string;
  activeUsers: number;
  visitors: number;
  screeningStarts: number;
  chatStarts: number;
  resourceClicks: number;
  interventionsStarted: number;
  referralsCompleted: number;
  accessCompletions: number;
}

export interface LeakageUser {
  userId: string;
  tier: Tier | 'unknown';
  latestSignalAt: string;
  signalReason: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  totalVisitors: number;
  activeUsers: number;
  dailyActiveUsers: number;
  demographicCoverageRate: number;
  targetDemographicUsers: number;
  targetDemographicRate: number;
  screeningStarts: number;
  screeningStartRate: number;
  chatbotStarts: number;
  chatbotStartRate: number;
  resourceClicks: number;
  resourceClickRate: number;
  accessStarts: number;
  accessCompleted: number;
  accessCompletionRate: number;
  accessDropOffCount: number;
  avgMinutesToEndpoint: number | null;
  interventionUptakeRate: number;
  interventionCompletionRate: number;
  referralCompletionRate: number;
  avgHoursToIntervention: number | null;
  avgHoursToReferral: number | null;
  highRiskLeakageCount: number;
  tierDistribution: Record<Tier | 'unknown', number>;
  endpointDistribution: Record<AccessEndpoint | 'unknown', number>;
  funnel: FunnelStep[];
  accessFunnel: FunnelStep[];
  dropOffFunnel: DropOffStep[];
  sectionTimes: SectionTimeMetric[];
  trend: TrendPoint[];
  highRiskLeakageUsers: LeakageUser[];
  recentEvents: RecentEventItem[];
}

export interface AnalyticsEventRecord {
  id: string;
  userId: string;
  occurredAt: string;
  eventName: EventName;
  tier?: Tier | null;
  accessEndpoint?: AccessEndpoint | null;
  interventionType?: string | null;
  referralDestination?: string | null;
  distressScore?: number | null;
  intakeStep?: string | null;
  page?: string | null;
  sessionLengthSec?: number | null;
  yearOfBirth?: number | null;
}
