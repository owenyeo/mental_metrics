export const EVENT_NAMES = [
  'landing_viewed',
  'access_intake_started',
  'access_step_completed',
  'screening_started',
  'screening_completed',
  'care_pathway_determined',
  'access_flow_completed',
  'intervention_viewed',
  'intervention_started',
  'intervention_completed',
  'resource_clicked',
  'chat_requested',
  'escalation_recommended',
  'referral_started',
  'referral_completed',
  'appointment_booked',
  'crisis_button_clicked',
  'feedback_submitted',
  'page_viewed',
] as const;

export const TIERS = ['at_risk', 'distressed', 'unwell'] as const;
export const ACCESS_ENDPOINTS = [
  'self_help',
  'peer_support',
  'medical_referral',
  'crisis_support',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];
export type Tier = (typeof TIERS)[number];
export type AccessEndpoint = (typeof ACCESS_ENDPOINTS)[number];

export const HELP_ACTION_EVENTS: EventName[] = [
  'intervention_completed',
  'referral_completed',
  'appointment_booked',
];

export const HIGH_RISK_SIGNAL_EVENTS: EventName[] = [
  'crisis_button_clicked',
  'escalation_recommended',
];
