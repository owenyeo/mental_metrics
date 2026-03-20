import { describe, expect, it, vi } from 'vitest';

import { createTracker } from '../src/index';

describe('sdk', () => {
  it('queues and flushes tracked events', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const tracker = createTracker();

    tracker.init({
      ingestUrl: 'http://localhost:4000/v1/events/ingest',
      projectKey: 'demo_project_key',
      fetchImpl,
      flushIntervalMs: 100000,
    });

    tracker.identify('user-1', { cohort: 'test' });
    await tracker.track('screening_started', { source: 'home' });
    await tracker.flush();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, request] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({
      'x-project-key': 'demo_project_key',
    });
    expect(JSON.parse(String(request.body)).events[0]).toMatchObject({
      eventName: 'screening_started',
      userId: 'user-1',
    });
  });

  it('retries failures and keeps queue when exhausted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const tracker = createTracker();

    tracker.init({
      ingestUrl: 'http://localhost:4000/v1/events/ingest',
      projectKey: 'demo_project_key',
      fetchImpl,
      flushIntervalMs: 100000,
      maxRetries: 1,
    });

    await tracker.track('screening_started');
    await tracker.flush();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(tracker.getState().queueLength).toBe(1);
  });

  it('resets identity state', async () => {
    const tracker = createTracker();
    const original = tracker.getState();
    tracker.identify('user-9');
    tracker.reset();
    const updated = tracker.getState();

    expect(updated.userId).toBeUndefined();
    expect(updated.anonymousId).not.toBe(original.anonymousId);
  });
});
