import { z } from 'zod';
import { EVENT_NAMES, TIERS } from './events';
const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonValueSchema = z.lazy(() => z.union([scalarSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]));
export const tierSchema = z.enum(TIERS);
export const eventNameSchema = z.enum(EVENT_NAMES);
export const eventPropertiesSchema = z
    .object({
    tier: tierSchema.optional(),
    intervention_type: z.string().min(1).max(120).optional(),
    distress_score: z.number().min(0).max(10).optional(),
    referral_destination: z.string().min(1).max(120).optional(),
    session_length_sec: z.number().int().min(0).max(60 * 60 * 12).optional(),
    source: z.string().min(1).max(120).optional(),
    page: z.string().min(1).max(120).optional(),
    timestamp: z.string().datetime().optional(),
})
    .catchall(jsonValueSchema)
    .transform((value) => sanitizeRecord(value));
export const identifyTraitsSchema = z
    .object({
    ageBand: z.string().min(1).max(40).optional(),
    referralSource: z.string().min(1).max(80).optional(),
    cohort: z.string().min(1).max(80).optional(),
})
    .catchall(jsonValueSchema)
    .transform((value) => sanitizeRecord(value));
export const ingestEventSchema = z.object({
    messageId: z.string().uuid().optional(),
    userId: z.string().min(1).max(120).optional().nullable(),
    anonymousId: z.string().min(6).max(120),
    sessionId: z.string().min(6).max(120),
    eventName: eventNameSchema,
    occurredAt: z.string().datetime().optional(),
    properties: eventPropertiesSchema.optional(),
    traits: identifyTraitsSchema.optional(),
});
export const ingestBatchSchema = z.object({
    events: z.array(ingestEventSchema).min(1).max(100),
});
export const dateRangeSchema = z
    .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    tier: tierSchema.optional(),
})
    .refine((value) => new Date(value.from) <= new Date(value.to), {
    message: '`from` must be before `to`',
    path: ['from'],
});
export function sanitizeRecord(value) {
    const forbiddenKeys = new Set([
        'email',
        'phone',
        'name',
        'address',
        'message',
        'notes',
        'transcript',
    ]);
    return Object.entries(value).reduce((acc, [key, entry]) => {
        if (forbiddenKeys.has(key.toLowerCase())) {
            return acc;
        }
        acc[key] = entry;
        return acc;
    }, {});
}
