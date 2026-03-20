# SDK Guide

```ts
import { createTracker } from '@sil/sdk';

const tracker = createTracker();

tracker.init({
  ingestUrl: 'http://localhost:4000/v1/events/ingest',
  projectKey: 'demo_project_key',
});

tracker.identify('anon_or_provider_user_id', { ageBand: '16-18' });
tracker.page('home');
tracker.track('screening_started', { source: 'homepage' });
```

API surface:

- `init(config)`
- `identify(userId, traits?)`
- `track(eventName, properties?)`
- `page(screenName, properties?)`
- `reset()`
