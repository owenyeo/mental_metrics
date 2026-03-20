import type { AnalyticsEventRecord } from '@sil/shared';
import type { IngestEventRequest } from '@sil/shared/types';

export interface ProjectRecord {
  id: string;
  name: string;
  projectKey: string;
}

export interface PersistContext {
  projectId: string;
}

export interface EventRepository {
  findProjectByKey(projectKey: string): Promise<ProjectRecord | null>;
  persistBatch(project: ProjectRecord, events: IngestEventRequest[]): Promise<{ accepted: string[] }>;
  listAnalyticsEvents(projectId: string, from: Date, to: Date): Promise<AnalyticsEventRecord[]>;
}
