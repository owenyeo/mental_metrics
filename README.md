# Service Intelligence Layer for Youth Mental Health Platforms

Production-style MVP for a B2B analytics and intervention intelligence layer that youth mental health services can integrate into. The platform includes:

- `apps/api`: ingestion and analytics API
- `apps/dashboard`: provider-facing dashboard
- `apps/demo-service`: demo mental health service that integrates the SDK
- `packages/sdk`: lightweight web tracking SDK
- `packages/shared`: shared event taxonomy, validation, analytics utilities, and UI-facing types

## Quick start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d`.
3. Install dependencies with `npm.cmd install`.
4. Generate Prisma client and migrate the database:
   - `npm.cmd run prisma:generate --workspace @sil/api`
   - `npm.cmd run prisma:migrate --workspace @sil/api`
   - `npm.cmd run seed --workspace @sil/api`
5. Start the API:
   - `npm.cmd run dev --workspace @sil/api`
6. Start the dashboard:
   - `npm.cmd run dev --workspace @sil/dashboard`
7. Start the demo service:
   - `npm.cmd run dev --workspace @sil/demo-service`

## Testing

- `npm.cmd run test`
- `npm.cmd run test:e2e`

## Documentation

- [Architecture overview](./docs/architecture.md)
- [API documentation](./docs/api.md)
- [SDK guide](./docs/sdk.md)
- [Provider integration guide](./docs/provider-integration.md)
- [Privacy and data handling](./docs/privacy.md)
