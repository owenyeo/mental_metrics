# API Documentation

## Authentication

All ingestion requests require the `x-project-key` header.

## Endpoints

### `POST /v1/events/ingest`

Accepts one or more SDK events. Validates payload shape, normalizes timestamps, sanitizes traits and properties, persists events, and returns accepted event identifiers.

### `GET /v1/analytics/overview`

Query parameters:

- `from`
- `to`
- `tier`

Returns overview KPIs, funnel conversion, trend data, leakage metrics, and recent activity.

### `GET /v1/analytics/interventions`

Query parameters:

- `from`
- `to`
- `tier`

Returns intervention performance by intervention type and tier.
