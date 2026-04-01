# Service Intelligence Layer for Youth Mental Health Platforms

Production-style MVP for a B2B analytics and intervention intelligence layer that youth mental health services can plug into. The repo contains:

- `apps/api`: event ingestion API and analytics read API
- `apps/dashboard`: provider-facing dashboard
- `apps/demo-service`: realistic demo youth support site that integrates the SDK
- `packages/sdk`: browser tracking SDK
- `packages/shared`: shared event taxonomy, validation, tier logic, analytics calculations, and UI-facing types

This is not a consumer mental health product. The core idea is to let an existing provider measure whether people are actually reaching help, where they drop off, how quickly they get routed, and whether high-need users are being missed.

## Handoff Debrief

If you are taking over this project, the fastest accurate mental model is:

1. The demo service emits structured product events through the SDK.
2. The SDK sends batches to the ingestion API using `x-project-key`.
3. The API validates and stores raw events in Postgres via Prisma.
4. The analytics layer in `packages/shared` computes all dashboard metrics on read.
5. The dashboard only renders the analytics API response. It does not compute business logic itself.

The project is intentionally organized so that the domain contract lives in one place:

- Event names: `packages/shared/src/events.ts`
- Request validation: `packages/shared/src/schemas.ts`
- Analytics formulas: `packages/shared/src/analytics.ts`
- Shared output types: `packages/shared/src/types.ts`

If a metric looks wrong, start in `packages/shared`, not in the dashboard.

## Current Product Shape

The demo service is now a multi-page, Mindline-inspired flow:

- `/`: minimalistic homepage with introduction, urgent-support panel, and year-of-birth capture for reach metrics
- `/wayfinder`: quick-glance recommendation page for users who already know what they need
- `/questionnaire`: guided fallback flow for users who feel overwhelmed

The dashboard currently emphasizes:

- Reach
- Activation
- Funnel drop-off
- Time spent per section
- Endpoint distribution
- Tier distribution
- Intervention performance
- High-risk leakage
- Recent activity

## Monorepo Layout

```text
/apps
  /api
  /dashboard
  /demo-service
/packages
  /sdk
  /shared
/docs
```

## How The System Works

### 1. Demo service

The demo service lives in `apps/demo-service`.

Key files:

- `apps/demo-service/components/demo-tracker.ts`
- `apps/demo-service/components/homepage-content.tsx`
- `apps/demo-service/components/wayfinder-content.tsx`
- `apps/demo-service/components/questionnaire-content.tsx`
- `apps/demo-service/components/access-config.ts`

Important behavior:

- A pseudonymous `demo-user-*` is created and reused across the current simulated visitor flow.
- Year of birth is stored in session storage and attached to events as:
  - `traits.yearOfBirth`
  - `properties.year_of_birth` on key visitor and journey events
- Page timing is measured by:
  - `page_viewed` on entry
  - `page_viewed` with `session_length_sec` on exit

Current section mapping for dwell-time metrics:

- homepage => `landing_page`
- questionnaire => `screening_page`
- wayfinder => `resource_page`

New simulated visitors can be started from the homepage without wiping the whole app.

### 2. SDK

The SDK lives in `packages/sdk`.

Public API:

- `init(config)`
- `identify(userId, traits?)`
- `track(eventName, properties?)`
- `page(screenName, properties?)`
- `reset()`
- `flush()`

Important implementation notes:

- The SDK generates strict UUID `messageId`s for idempotent ingest.
- Client-side event-name validation was intentionally removed; the API is the source of truth.
- Retry and queueing are SDK responsibilities.
- The demo service forces `flush()` after important actions so analytics show up reliably.

### 3. API

The API lives in `apps/api`.

Key responsibilities:

- validate payloads using shared Zod schemas
- authenticate by `x-project-key`
- rate limit ingest
- persist identities, sessions, and events
- expose analytics endpoints

Key files:

- `apps/api/src/app.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/services/ingestion-service.ts`
- `apps/api/src/services/analytics-service.ts`
- `apps/api/src/repositories/prisma-repository.ts`
- `apps/api/prisma/schema.prisma`

Important storage design:

- `Identity` stores pseudonymous traits such as year of birth
- `Event.userKey` snapshots the per-event user identity used in analytics
- this avoids old rows being reinterpreted if an identity later changes

That `userKey` field matters. Earlier versions incorrectly collapsed multiple simulated users from the same browser into one logical user.

### 4. Analytics

All analytics logic is in `packages/shared/src/analytics.ts`.

This is the single most important file for iteration.

The API loads raw event rows and converts them into `AnalyticsEventRecord[]`.
Then `buildAnalyticsOverview()` computes the entire dashboard model in memory.

This was an intentional MVP tradeoff:

- easier to reason about
- easier to test
- no warehouse or materialized aggregate job yet

If scale becomes a problem, this is the layer to move into precomputed tables or batch jobs.

### 5. Dashboard

The dashboard lives in `apps/dashboard`.

Key files:

- `apps/dashboard/app/page.tsx`
- `apps/dashboard/components/dashboard-view.tsx`

The dashboard:

- fetches `GET /v1/analytics/overview`
- fetches `GET /v1/analytics/interventions`
- renders the response directly

It currently refreshes on:

- initial load
- tier-filter change

It does not currently live-update with polling, SSE, or websockets. Refresh the page to force a fresh read.

## Event Taxonomy

Current core events:

- `landing_viewed`
- `access_intake_started`
- `access_step_completed`
- `screening_started`
- `screening_completed`
- `care_pathway_determined`
- `access_flow_completed`
- `intervention_viewed`
- `intervention_started`
- `intervention_completed`
- `resource_clicked`
- `chat_requested`
- `escalation_recommended`
- `referral_started`
- `referral_completed`
- `appointment_booked`
- `crisis_button_clicked`
- `feedback_submitted`
- `page_viewed`

Important event properties currently used in analytics:

- `tier`
- `access_endpoint`
- `distress_score`
- `intervention_type`
- `referral_destination`
- `intake_step`
- `page`
- `session_length_sec`
- `year_of_birth`
- `source`

## Current Metric Definitions

### Reach

Derived from `landing_viewed` users.

- `totalVisitors`: distinct users with `landing_viewed`
- `demographicCoverageRate`: visitors with a usable `year_of_birth`
- `targetDemographicRate`: visitors whose derived age falls within `13-24`

Current implementation note:

- age is derived using the filter window end date year
- if no `landing_viewed` events exist, the analytics layer falls back to all users to avoid a blank dashboard

### Activation

Derived as distinct-user rates over total visitors.

- `screeningStartRate`: `screening_started / totalVisitors`
- `chatbotStartRate`: `chat_requested / totalVisitors`
- `resourceClickRate`: `resource_clicked / totalVisitors`

Note:

- “chatbot start” is currently modeled via `chat_requested`
- if you later introduce a dedicated chatbot event, update `buildAnalyticsOverview()`

### Funnel Drop-off

Current tracked steps:

- `landing_viewed -> screening_started`
- `screening_started -> screening_completed`
- `screening_completed -> further_resource_use`

`further_resource_use` is currently any of:

- `resource_clicked`
- `chat_requested`
- `intervention_started`
- `referral_started`

The funnel logic is cohort-safe. Each step is intersected with the prior-step cohort so conversion cannot exceed 100%.

### Time Spent Per Section

Derived from `page_viewed` events that include `session_length_sec`.

Current section buckets:

- `landing_page`
- `screening_page`
- `resource_page`

These are emitted by the demo service when the user leaves each page.

### Existing Access / Care Metrics Still Present

The platform still computes the earlier service metrics:

- access starts
- access completion rate
- access drop-off count
- average minutes to endpoint
- endpoint distribution
- intervention uptake/completion
- referral completion
- high-risk leakage

## API Surface

### `POST /v1/events/ingest`

Requires:

- `x-project-key`

Body:

```json
{
  "events": [
    {
      "messageId": "uuid",
      "userId": "demo-user-123",
      "anonymousId": "anon_123",
      "sessionId": "session_123",
      "eventName": "screening_started",
      "occurredAt": "2026-03-30T10:00:00.000Z",
      "properties": {
        "source": "questionnaire",
        "year_of_birth": 2008
      },
      "traits": {
        "cohort": "mindline-style-demo",
        "yearOfBirth": 2008,
        "ageBand": "16-18"
      }
    }
  ]
}
```

### `GET /v1/analytics/overview`

Query params:

- `from`
- `to`
- optional `tier`

Returns the dashboard model, including:

- reach
- activation
- drop-off funnel
- section timing
- access metrics
- tier and endpoint distributions
- leakage panel data
- recent events

### `GET /v1/analytics/interventions`

Query params:

- `from`
- `to`
- optional `tier`

Returns intervention performance rows.

## Database Model

Core tables:

- `ProviderProject`
- `Identity`
- `Session`
- `Event`

Key indexing decisions:

- `Event(projectId, occurredAt)`
- `Event(projectId, eventName, occurredAt)`
- `Event(projectId, tier, occurredAt)`
- `Event(projectId, userKey, occurredAt)`

These are enough for current time-window analytics and distinct-user calculations.

## Local Setup

Run everything from the repo root:

`C:\Users\Owen Ng\Documents\Code\mental_metrics`

### Quick start

1. Copy `.env.example` to `.env`
2. Ensure `apps/api/.env` matches the root `.env`
3. Start Postgres:
   - `docker compose up -d`
4. Install dependencies:
   - `npm.cmd install`
5. Generate Prisma client and migrate:
   - `npm.cmd run prisma:generate --workspace @sil/api`
   - `npm.cmd run prisma:migrate --workspace @sil/api`
6. Seed demo data:
   - `npm.cmd run seed --workspace @sil/api`
7. Start the API:
   - `npm.cmd run dev --workspace @sil/api`
8. Start the dashboard:
   - `npm.cmd run dev --workspace @sil/dashboard`
9. Start the demo service:
   - `npm.cmd run dev --workspace @sil/demo-service`

Local URLs:

- Dashboard: `http://localhost:3000`
- Demo service: `http://localhost:3001`
- API health: `http://localhost:4000/health`

## Developer Workflow

### Useful commands

- `npm.cmd run test --workspace @sil/shared`
- `npm.cmd run test --workspace @sil/dashboard`
- `npm.cmd run test --workspace @sil/demo-service`
- `npm.cmd run build --workspace @sil/shared`
- `npm.cmd run build --workspace @sil/api`
- `npm.cmd run build --workspace @sil/dashboard`
- `npm.cmd run build --workspace @sil/demo-service`

### Where to change things

If you want to change:

- metric formulas: `packages/shared/src/analytics.ts`
- event contract or validation: `packages/shared/src/events.ts`, `packages/shared/src/schemas.ts`
- stored event projection: `apps/api/src/repositories/prisma-repository.ts`
- dashboard UI: `apps/dashboard/components/dashboard-view.tsx`
- demo journey behavior: `apps/demo-service/components/*`

## Known Gotchas

- Run workspace commands from the repo root, not inside subfolders.
- Keep root `.env` and `apps/api/.env` aligned. Prisma and the API can otherwise point at different database credentials.
- If Docker Postgres is running but auth fails, the existing volume may have old credentials. Reset with `docker compose down -v` if that is acceptable.
- The dashboard is not live-updating. Refresh after interacting with the demo service.
- The Next.js apps warn about multiple lockfiles and missing Next ESLint plugin config. They still build successfully.
- Recharts emits server-build sizing warnings in the dashboard build. They are noisy but not currently breaking.
- Emergency hotline content in the demo service is demo content and should be verified before production use.

## Recommended Next Iterations

If the next developer wants to move this toward production, the highest-leverage next steps are:

1. Add polling or live refresh to the dashboard.
2. Move analytics from compute-on-read into precomputed aggregates.
3. Add provider/project switching in the dashboard.
4. Add CSV export for reach and activation metrics.
5. Tighten consent and data-retention controls around demographic capture.
6. Add stronger direct-entry handling so wayfinder/questionnaire deep links still count as first-touch visitors without assumptions.

## Additional Docs

- [Architecture overview](./docs/architecture.md)
- [API documentation](./docs/api.md)
- [SDK guide](./docs/sdk.md)
- [Provider integration guide](./docs/provider-integration.md)
- [Privacy and data handling](./docs/privacy.md)
