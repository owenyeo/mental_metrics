import { ingestBatchSchema } from '@sil/shared';
import type { IngestBatchRequest } from '@sil/shared/types';

import type { EventRepository } from '../repositories/types';

export class IngestionService {
  constructor(private readonly repository: EventRepository) {}

  async ingest(projectKey: string, payload: IngestBatchRequest) {
    const project = await this.repository.findProjectByKey(projectKey);

    if (!project) {
      return {
        status: 401 as const,
        body: { error: 'Invalid project key' },
      };
    }

    const parsed = ingestBatchSchema.parse(payload) as IngestBatchRequest;
    const accepted = await this.repository.persistBatch(project, parsed.events);

    return {
      status: 202 as const,
      body: accepted,
    };
  }
}
