import { PrismaClient } from '@prisma/client';
import { deriveTierFromDistressScore } from '@sil/shared';
import type { AnalyticsEventRecord } from '@sil/shared';
import type { IngestEventRequest } from '@sil/shared/types';

import type { EventRepository, ProjectRecord } from './types';

interface PrismaAnalyticsEvent {
  id: string;
  userKey: string;
  eventName: string;
  occurredAt: Date;
  tier: string | null;
  interventionType: string | null;
  referralDestination: string | null;
  distressScore: number | null;
  identity: {
    externalUserId: string | null;
    anonymousId: string;
  };
}

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findProjectByKey(projectKey: string): Promise<ProjectRecord | null> {
    return this.prisma.providerProject.findUnique({
      where: { projectKey },
      select: { id: true, name: true, projectKey: true },
    });
  }

  async persistBatch(project: ProjectRecord, events: IngestEventRequest[]): Promise<{ accepted: string[] }> {
    const accepted: string[] = [];

    for (const event of events) {
      const identity = await this.prisma.identity.upsert({
        where: {
          projectId_anonymousId: {
            projectId: project.id,
            anonymousId: event.anonymousId,
          },
        },
        update: {
          externalUserId: event.userId ?? undefined,
          traits: event.traits,
        },
        create: {
          projectId: project.id,
          externalUserId: event.userId ?? undefined,
          anonymousId: event.anonymousId,
          traits: event.traits,
        },
      });

      const session = await this.prisma.session.upsert({
        where: {
          projectId_sessionKey: {
            projectId: project.id,
            sessionKey: event.sessionId,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          identityId: identity.id,
          sessionKey: event.sessionId,
        },
      });

      const tier = event.properties?.tier ?? deriveTierFromDistressScore(event.properties?.distress_score);

      const persisted = await this.prisma.event.upsert({
        where: {
          projectId_messageId: {
            projectId: project.id,
            messageId: event.messageId ?? `${event.sessionId}:${event.eventName}:${event.occurredAt}`,
          },
        },
        update: {},
        create: {
          projectId: project.id,
          identityId: identity.id,
          sessionId: session.id,
          messageId: event.messageId ?? `${event.sessionId}:${event.eventName}:${event.occurredAt}`,
          userKey: event.userId ?? event.anonymousId,
          eventName: event.eventName,
          occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
          tier,
          interventionType: event.properties?.intervention_type as string | undefined,
          distressScore: event.properties?.distress_score as number | undefined,
          referralDestination: event.properties?.referral_destination as string | undefined,
          properties: event.properties,
        },
      });

      accepted.push(persisted.id);
    }

    return { accepted };
  }

  async listAnalyticsEvents(projectId: string, from: Date, to: Date): Promise<AnalyticsEventRecord[]> {
    const events = (await this.prisma.event.findMany({
      where: {
        projectId,
        occurredAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        occurredAt: 'asc',
      },
      include: {
        identity: true,
      },
    })) as PrismaAnalyticsEvent[];

    return events.map((event): AnalyticsEventRecord => ({
      id: event.id,
      userId: event.userKey,
      occurredAt: event.occurredAt.toISOString(),
      eventName: event.eventName as AnalyticsEventRecord['eventName'],
      tier: event.tier as AnalyticsEventRecord['tier'],
      interventionType: event.interventionType,
      referralDestination: event.referralDestination,
      distressScore: event.distressScore,
    }));
  }
}
