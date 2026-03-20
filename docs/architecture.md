# Architecture Overview

## Product scope

This MVP is a service intelligence layer for existing youth mental health services. It tracks service engagement, intervention progression, escalation-to-care, provider operations, and missed-help signals.

## Monorepo structure

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

## Key design choices

- Express is used for the API to keep the service lean while still supporting production-style middleware and testing.
- Prisma + PostgreSQL support relational analytics queries, event normalization, and multi-tenant project separation.
- Shared contracts in `packages/shared` keep event names, validation rules, tier logic, and analytics formulas consistent.
- The SDK is intentionally minimal and browser-safe, with retry behavior and anonymous identity generation.
- The dashboard focuses on service-relevant outcomes, not engagement maximization.

## Core data flow

1. A provider app installs the SDK.
2. The SDK sends normalized event payloads to the ingestion API using a project key.
3. The API validates and persists events, users, and project context.
4. Analytics services compute KPIs, funnel conversion, time-to-action metrics, and high-risk leakage.
5. The dashboard consumes analytics endpoints and renders provider-facing insight panels.

## Event taxonomy

Required tracked events:

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

## Mental health service assumptions

- Providers track pseudonymous identities, not direct clinical notes or unnecessary PII.
- Tier definitions are operational:
  - `at_risk`: emerging concern, low-intensity support suitable
  - `distressed`: moderate concern, guided intervention recommended
  - `unwell`: high concern, escalation or direct care pathway needed
- High-risk signals are defined as any of:
  - `crisis_button_clicked`
  - `escalation_recommended`
  - `screening_completed` with `tier = unwell`
  - `screening_completed` with `distress_score >= 8`

## Tradeoffs

- Analytics are computed on-demand for the MVP rather than via a separate warehouse job.
- Rate limiting and API-key project auth are implemented, but advanced tenant isolation and consent workflows are documented rather than fully productized.
- The schema allows richer event storage through JSON properties while indexing the key dimensions used by the dashboard.
- Access analytics are modeled as explicit events so providers can measure whether a user reaches a concrete endpoint such as self-help, peer support, referral, or urgent support.
