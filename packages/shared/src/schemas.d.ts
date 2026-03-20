import { z } from 'zod';
export declare const tierSchema: z.ZodEnum<{
    at_risk: "at_risk";
    distressed: "distressed";
    unwell: "unwell";
}>;
export declare const eventNameSchema: z.ZodEnum<{
    landing_viewed: "landing_viewed";
    screening_started: "screening_started";
    screening_completed: "screening_completed";
    intervention_viewed: "intervention_viewed";
    intervention_started: "intervention_started";
    intervention_completed: "intervention_completed";
    resource_clicked: "resource_clicked";
    chat_requested: "chat_requested";
    escalation_recommended: "escalation_recommended";
    referral_started: "referral_started";
    referral_completed: "referral_completed";
    appointment_booked: "appointment_booked";
    crisis_button_clicked: "crisis_button_clicked";
    feedback_submitted: "feedback_submitted";
    page_viewed: "page_viewed";
}>;
export declare const eventPropertiesSchema: z.ZodPipe<z.ZodObject<{
    tier: z.ZodOptional<z.ZodEnum<{
        at_risk: "at_risk";
        distressed: "distressed";
        unwell: "unwell";
    }>>;
    intervention_type: z.ZodOptional<z.ZodString>;
    distress_score: z.ZodOptional<z.ZodNumber>;
    referral_destination: z.ZodOptional<z.ZodString>;
    session_length_sec: z.ZodOptional<z.ZodNumber>;
    source: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodOptional<z.ZodString>;
}, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
    [x: string]: unknown;
    tier?: "at_risk" | "distressed" | "unwell" | undefined;
    intervention_type?: string | undefined;
    distress_score?: number | undefined;
    referral_destination?: string | undefined;
    session_length_sec?: number | undefined;
    source?: string | undefined;
    page?: string | undefined;
    timestamp?: string | undefined;
}>>;
export declare const identifyTraitsSchema: z.ZodPipe<z.ZodObject<{
    ageBand: z.ZodOptional<z.ZodString>;
    referralSource: z.ZodOptional<z.ZodString>;
    cohort: z.ZodOptional<z.ZodString>;
}, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
    [x: string]: unknown;
    ageBand?: string | undefined;
    referralSource?: string | undefined;
    cohort?: string | undefined;
}>>;
export declare const ingestEventSchema: z.ZodObject<{
    messageId: z.ZodOptional<z.ZodString>;
    userId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    anonymousId: z.ZodString;
    sessionId: z.ZodString;
    eventName: z.ZodEnum<{
        landing_viewed: "landing_viewed";
        screening_started: "screening_started";
        screening_completed: "screening_completed";
        intervention_viewed: "intervention_viewed";
        intervention_started: "intervention_started";
        intervention_completed: "intervention_completed";
        resource_clicked: "resource_clicked";
        chat_requested: "chat_requested";
        escalation_recommended: "escalation_recommended";
        referral_started: "referral_started";
        referral_completed: "referral_completed";
        appointment_booked: "appointment_booked";
        crisis_button_clicked: "crisis_button_clicked";
        feedback_submitted: "feedback_submitted";
        page_viewed: "page_viewed";
    }>;
    occurredAt: z.ZodOptional<z.ZodString>;
    properties: z.ZodOptional<z.ZodPipe<z.ZodObject<{
        tier: z.ZodOptional<z.ZodEnum<{
            at_risk: "at_risk";
            distressed: "distressed";
            unwell: "unwell";
        }>>;
        intervention_type: z.ZodOptional<z.ZodString>;
        distress_score: z.ZodOptional<z.ZodNumber>;
        referral_destination: z.ZodOptional<z.ZodString>;
        session_length_sec: z.ZodOptional<z.ZodNumber>;
        source: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodOptional<z.ZodString>;
    }, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
        [x: string]: unknown;
        tier?: "at_risk" | "distressed" | "unwell" | undefined;
        intervention_type?: string | undefined;
        distress_score?: number | undefined;
        referral_destination?: string | undefined;
        session_length_sec?: number | undefined;
        source?: string | undefined;
        page?: string | undefined;
        timestamp?: string | undefined;
    }>>>;
    traits: z.ZodOptional<z.ZodPipe<z.ZodObject<{
        ageBand: z.ZodOptional<z.ZodString>;
        referralSource: z.ZodOptional<z.ZodString>;
        cohort: z.ZodOptional<z.ZodString>;
    }, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
        [x: string]: unknown;
        ageBand?: string | undefined;
        referralSource?: string | undefined;
        cohort?: string | undefined;
    }>>>;
}, z.core.$strip>;
export declare const ingestBatchSchema: z.ZodObject<{
    events: z.ZodArray<z.ZodObject<{
        messageId: z.ZodOptional<z.ZodString>;
        userId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        anonymousId: z.ZodString;
        sessionId: z.ZodString;
        eventName: z.ZodEnum<{
            landing_viewed: "landing_viewed";
            screening_started: "screening_started";
            screening_completed: "screening_completed";
            intervention_viewed: "intervention_viewed";
            intervention_started: "intervention_started";
            intervention_completed: "intervention_completed";
            resource_clicked: "resource_clicked";
            chat_requested: "chat_requested";
            escalation_recommended: "escalation_recommended";
            referral_started: "referral_started";
            referral_completed: "referral_completed";
            appointment_booked: "appointment_booked";
            crisis_button_clicked: "crisis_button_clicked";
            feedback_submitted: "feedback_submitted";
            page_viewed: "page_viewed";
        }>;
        occurredAt: z.ZodOptional<z.ZodString>;
        properties: z.ZodOptional<z.ZodPipe<z.ZodObject<{
            tier: z.ZodOptional<z.ZodEnum<{
                at_risk: "at_risk";
                distressed: "distressed";
                unwell: "unwell";
            }>>;
            intervention_type: z.ZodOptional<z.ZodString>;
            distress_score: z.ZodOptional<z.ZodNumber>;
            referral_destination: z.ZodOptional<z.ZodString>;
            session_length_sec: z.ZodOptional<z.ZodNumber>;
            source: z.ZodOptional<z.ZodString>;
            page: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodOptional<z.ZodString>;
        }, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
            [x: string]: unknown;
            tier?: "at_risk" | "distressed" | "unwell" | undefined;
            intervention_type?: string | undefined;
            distress_score?: number | undefined;
            referral_destination?: string | undefined;
            session_length_sec?: number | undefined;
            source?: string | undefined;
            page?: string | undefined;
            timestamp?: string | undefined;
        }>>>;
        traits: z.ZodOptional<z.ZodPipe<z.ZodObject<{
            ageBand: z.ZodOptional<z.ZodString>;
            referralSource: z.ZodOptional<z.ZodString>;
            cohort: z.ZodOptional<z.ZodString>;
        }, z.core.$catchall<z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>, z.ZodTransform<Record<string, string | number | boolean | Record<string, unknown> | unknown[] | null>, {
            [x: string]: unknown;
            ageBand?: string | undefined;
            referralSource?: string | undefined;
            cohort?: string | undefined;
        }>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const dateRangeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    tier: z.ZodOptional<z.ZodEnum<{
        at_risk: "at_risk";
        distressed: "distressed";
        unwell: "unwell";
    }>>;
}, z.core.$strip>;
export declare function sanitizeRecord(value: Record<string, unknown>): Record<string, string | number | boolean | null | unknown[] | Record<string, unknown>>;
