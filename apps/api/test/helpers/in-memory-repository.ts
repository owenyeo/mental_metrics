import { deriveTierFromDistressScore } from '@sil/shared';
import type { AnalyticsEventRecord } from '@sil/shared';
import type { IngestEventRequest } from '@sil/shared/types';

import type { EventRepository, ProjectRecord } from '../../src/repositories/types';

export class InMemoryRepository implements EventRepository {
  projects: ProjectRecord[] = [
    { id: 'project-1', name: 'Demo', projectKey: 'demo_project_key' },
  ];

  records: AnalyticsEventRecord[] = [];

  async findProjectByKey(projectKey: string): Promise<ProjectRecord | null> {
    return this.projects.find((project) => project.projectKey === projectKey) ?? null;
  }

  async persistBatch(project: ProjectRecord, events: IngestEventRequest[]): Promise<{ accepted: string[] }> {
    const accepted = events.map((event, index) => {
      const id = `event-${this.records.length + index + 1}`;
      this.records.push({
        id,
        userId: event.userId ?? event.anonymousId,
        occurredAt: event.occurredAt ?? new Date().toISOString(),
        eventName: event.eventName,
        tier: event.properties?.tier ?? deriveTierFromDistressScore(event.properties?.distress_score),
        interventionType: event.properties?.intervention_type as string | undefined,
        referralDestination: event.properties?.referral_destination as string | undefined,
        distressScore: event.properties?.distress_score as number | undefined,
      });
      return id;
    });

    return { accepted };
  }

  async listAnalyticsEvents(projectId: string, from: Date, to: Date): Promise<AnalyticsEventRecord[]> {
    if (projectId !== 'project-1') {
      return [];
    }

    return this.records.filter((record) => {
      const time = new Date(record.occurredAt).getTime();
      return time >= from.getTime() && time <= to.getTime();
    });
  }
}
