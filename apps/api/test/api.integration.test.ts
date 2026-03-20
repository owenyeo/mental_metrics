import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { InMemoryRepository } from './helpers/in-memory-repository';

describe('API integration', () => {
  it('accepts valid ingestion payloads', async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);

    const response = await request(app)
      .post('/v1/events/ingest')
      .set('x-project-key', 'demo_project_key')
      .send({
        events: [
          {
            messageId: 'edc6cd1f-8707-4a0e-ae59-fbe7921f0bd9',
            anonymousId: 'anon-1',
            sessionId: 'session-1',
            eventName: 'screening_completed',
            occurredAt: '2026-03-10T08:12:00.000Z',
            properties: {
              distress_score: 8,
              tier: 'unwell',
            },
          },
        ],
      });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toHaveLength(1);
  });

  it('rejects malformed payloads', async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);

    const response = await request(app)
      .post('/v1/events/ingest')
      .set('x-project-key', 'demo_project_key')
      .send({
        events: [
          {
            anonymousId: 'short',
            sessionId: 'session-1',
            eventName: 'not_real',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('enforces project key authentication', async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);

    const response = await request(app).post('/v1/events/ingest').send({ events: [] });
    expect(response.status).toBe(401);
  });

  it('returns overview analytics', async () => {
    const repository = new InMemoryRepository();
    await repository.persistBatch(
      { id: 'project-1', name: 'Demo', projectKey: 'demo_project_key' },
      [
        {
          messageId: '1ff811da-46d4-4dfc-b835-062f19c82b85',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          eventName: 'screening_started',
          occurredAt: '2026-03-10T08:00:00.000Z',
        },
        {
          messageId: 'b1d6121c-fb93-4233-90ff-1337d15ad1e7',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          eventName: 'screening_completed',
          occurredAt: '2026-03-10T09:00:00.000Z',
          properties: { tier: 'distressed', distress_score: 6 },
        },
        {
          messageId: 'b380fe7a-3f24-4c47-88dd-1d2c115b5775',
          anonymousId: 'anon-1',
          sessionId: 'session-1',
          eventName: 'intervention_started',
          occurredAt: '2026-03-10T10:00:00.000Z',
          properties: { tier: 'distressed', intervention_type: 'breathing' },
        },
      ],
    );

    const app = createApp(repository);
    const response = await request(app)
      .get('/v1/analytics/overview')
      .set('x-project-key', 'demo_project_key')
      .query({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-12T00:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.totalUsers).toBe(1);
    expect(response.body.interventionUptakeRate).toBe(100);
  });

  it('returns intervention analytics empty state', async () => {
    const repository = new InMemoryRepository();
    const app = createApp(repository);
    const response = await request(app)
      .get('/v1/analytics/interventions')
      .set('x-project-key', 'demo_project_key')
      .query({
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-12T00:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });
});
