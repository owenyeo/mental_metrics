export declare const EVENT_NAMES: readonly ["landing_viewed", "screening_started", "screening_completed", "intervention_viewed", "intervention_started", "intervention_completed", "resource_clicked", "chat_requested", "escalation_recommended", "referral_started", "referral_completed", "appointment_booked", "crisis_button_clicked", "feedback_submitted", "page_viewed"];
export declare const TIERS: readonly ["at_risk", "distressed", "unwell"];
export type EventName = (typeof EVENT_NAMES)[number];
export type Tier = (typeof TIERS)[number];
export declare const HELP_ACTION_EVENTS: EventName[];
export declare const HIGH_RISK_SIGNAL_EVENTS: EventName[];
