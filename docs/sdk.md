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
tracker.track('access_intake_started', { intake_step: 'welcome' });
tracker.track('screening_started', { source: 'homepage' });
tracker.track('care_pathway_determined', {
  access_endpoint: 'self_help',
  tier: 'at_risk',
});
```

API surface:

- `init(config)`
- `identify(userId, traits?)`
- `track(eventName, properties?)`
- `page(screenName, properties?)`
- `reset()`
