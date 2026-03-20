import {
  buildAnalyticsOverview,
  buildInterventionPerformance,
  dateRangeSchema,
  type AnalyticsOverview,
  type InterventionPerformanceRow,
} from '@sil/shared';
import type { DateRangeFilter } from '@sil/shared/types';

import type { EventRepository } from '../repositories/types';

export class AnalyticsService {
  constructor(private readonly repository: EventRepository) {}

  async getOverview(projectId: string, filter: DateRangeFilter): Promise<AnalyticsOverview> {
    const parsed = dateRangeSchema.parse(filter);
    const events = await this.repository.listAnalyticsEvents(
      projectId,
      new Date(parsed.from),
      new Date(parsed.to),
    );

    return buildAnalyticsOverview(events, parsed);
  }

  async getInterventions(
    projectId: string,
    filter: DateRangeFilter,
  ): Promise<InterventionPerformanceRow[]> {
    const parsed = dateRangeSchema.parse(filter);
    const events = await this.repository.listAnalyticsEvents(
      projectId,
      new Date(parsed.from),
      new Date(parsed.to),
    );

    return buildInterventionPerformance(
      parsed.tier ? events.filter((event) => event.tier === parsed.tier) : events,
    );
  }
}
