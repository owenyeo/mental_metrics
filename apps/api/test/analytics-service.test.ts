import { describe, expect, it } from 'vitest';

import { AnalyticsService } from '../src/services/analytics-service';
import { InMemoryRepository } from './helpers/in-memory-repository';

describe('AnalyticsService', () => {
  it('computes analytics overview from repository events', async () => {
    const repository = new InMemoryRepository();
    await repository.persistBatch(
      { id: 'project-1', name: 'Demo', projectKey: 'demo_project_key' },
      [
        {
          messageId: '22095c7c-3749-48b2-a43d-7c22aaf5369b',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          eventName: 'screening_completed',
          occurredAt: '2026-03-10T09:00:00.000Z',
          properties: { tier: 'unwell', distress_score: 9 },
        },
        {
          messageId: '75988ea6-f7a4-466c-aa37-295effd85925',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          eventName: 'referral_completed',
          occurredAt: '2026-03-10T10:00:00.000Z',
          properties: { tier: 'unwell' },
        },
      ],
    );

    const service = new AnalyticsService(repository);
    const response = await service.getOverview('project-1', {
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-12T00:00:00.000Z',
    });

    expect(response.totalUsers).toBe(1);
    expect(response.highRiskLeakageCount).toBe(0);
    expect(response.tierDistribution.unwell).toBe(1);
  });
});
