import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const project = await prisma.providerProject.upsert({
        where: { projectKey: process.env.DEMO_PROJECT_KEY ?? 'demo_project_key' },
        update: {},
        create: {
            name: 'Youth Support Demo Provider',
            projectKey: process.env.DEMO_PROJECT_KEY ?? 'demo_project_key',
            environment: 'demo',
        },
    });
    const identity = await prisma.identity.upsert({
        where: {
            projectId_anonymousId: {
                projectId: project.id,
                anonymousId: 'anon_demo_seed',
            },
        },
        update: {
            externalUserId: 'seed-user-1',
            traits: { cohort: 'seed' },
        },
        create: {
            projectId: project.id,
            anonymousId: 'anon_demo_seed',
            externalUserId: 'seed-user-1',
            traits: { cohort: 'seed' },
        },
    });
    const session = await prisma.session.upsert({
        where: {
            projectId_sessionKey: {
                projectId: project.id,
                sessionKey: 'session_seed_1',
            },
        },
        update: {},
        create: {
            projectId: project.id,
            identityId: identity.id,
            sessionKey: 'session_seed_1',
        },
    });
    const seedEvents = [
        ['landing_viewed', '2026-03-10T08:00:00.000Z', 'at_risk', null, null],
        ['screening_started', '2026-03-10T08:05:00.000Z', 'at_risk', null, null],
        ['screening_completed', '2026-03-10T08:12:00.000Z', 'distressed', null, 6],
        ['intervention_started', '2026-03-10T09:00:00.000Z', 'distressed', 'guided_journaling', null],
        ['intervention_completed', '2026-03-10T09:20:00.000Z', 'distressed', 'guided_journaling', null],
    ];
    for (const [eventName, occurredAt, tier, interventionType, distressScore] of seedEvents) {
        await prisma.event.upsert({
            where: {
                projectId_messageId: {
                    projectId: project.id,
                    messageId: `${session.sessionKey}:${eventName}:${occurredAt}`,
                },
            },
            update: {},
            create: {
                projectId: project.id,
                identityId: identity.id,
                sessionId: session.id,
                messageId: `${session.sessionKey}:${eventName}:${occurredAt}`,
                eventName,
                occurredAt: new Date(occurredAt),
                tier,
                interventionType,
                distressScore,
                properties: {
                    tier,
                    intervention_type: interventionType,
                    distress_score: distressScore,
                },
            },
        });
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
