import type { AnalyticsEventRecord } from '@sil/shared';
import type { IngestEventRequest } from '@sil/shared/types';
import type { EventRepository, ProjectRecord } from '../../src/repositories/types';
export declare class InMemoryRepository implements EventRepository {
    projects: ProjectRecord[];
    records: AnalyticsEventRecord[];
    findProjectByKey(projectKey: string): Promise<ProjectRecord | null>;
    persistBatch(project: ProjectRecord, events: IngestEventRequest[]): Promise<{
        accepted: string[];
    }>;
    listAnalyticsEvents(projectId: string, from: Date, to: Date): Promise<AnalyticsEventRecord[]>;
}
