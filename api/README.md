# Campus Link API

Backend service for Campus Link, built with NestJS, TypeORM, and PostgreSQL.

## Tech Stack

- NestJS 11
- TypeORM 0.3
- PostgreSQL
- JWT auth (local + Google)
- Validation with class-validator and class-transformer

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+

## Quick Start

1. Install dependencies

```bash
pnpm install
```

2. Create env file

```bash
cp .env.example .env
```

3. Create database (example)

```bash
createdb campuslink
```

4. Run migrations

```bash
pnpm run db:migrate
```

5. Start API in dev mode

```bash
pnpm run start:dev
```

Default server URL: http://localhost:3000

## Environment Variables

See [.env.example](.env.example).

### App

- NODE_ENV: runtime environment (development, production)
- PORT: API port

### Database

- DB_HOST
- DB_PORT
- DB_USER
- DB_PASS
- DB_NAME
- DB_SYNC: enable TypeORM synchronize (recommended false)
- DB_MIGRATIONS_RUN: auto-run migrations at startup (recommended false in local dev if you run scripts manually)

### Auth

- GOOGLE_CLIENT_ID
- JWT_SECRET
- JWT_EXPIRES_IN_SECONDS
- JWT_REFRESH_SECRET
- JWT_REFRESH_EXPIRES_IN_SECONDS

### Telegram (Lost & Found announcements)

- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHANNEL_ID
  - Accepts either a channel username (example: @campus_link_channel) or numeric chat id.
  - Add your bot as a channel admin before using announcements.
- API_PUBLIC_BASE_URL
  - Required when stored item photos are relative local paths (example: /uploads/items/...).
  - Must be a public URL reachable by Telegram (example: https://api.your-domain.com).

## Scripts

### Development

- pnpm run start
- pnpm run start:dev
- pnpm run build
- pnpm run lint
- pnpm run test
- pnpm run test:e2e

### Database / TypeORM

- pnpm run db:cli
  - Runs TypeORM CLI in ts-node mode.

- pnpm run db:create --name=YourMigrationName
  - Creates an empty migration file in src/database/migrations.

- pnpm run db:generate --name=YourMigrationName
  - Generates migration from entity changes.

- pnpm run db:migrate
  - Applies pending migrations.

- pnpm run db:revert
  - Reverts the last migration.

- pnpm run db:show
  - Shows pending/applied migration status.

- pnpm run db:seed:users
  - Seeds local accounts (1 ADMIN + 2 USER) using values from .env.
  - The script is idempotent by email and will update existing seeded accounts.

## Auth Endpoints

Base path: /auth

### Local Auth

- POST /auth/local/register
  - Body:
    - email
    - displayName
    - password

- POST /auth/local/login
  - Body:
    - email
    - password

### Google Auth

- POST /auth/google
  - Body:
    - idToken

### Token Lifecycle

- POST /auth/refresh
  - Body:
    - refreshToken

- POST /auth/logout
  - Body:
    - refreshToken

- POST /auth/logout-all
  - Header:
    - Authorization: Bearer <accessToken>

### User and Role Routes

- GET /auth/me
  - Header:
    - Authorization: Bearer <accessToken>

- GET /auth/moderation/ping
  - Header:
    - Authorization: Bearer <accessToken>
  - Requires role: ADMIN or MODERATOR

## Migration Workflow

Recommended flow after changing entities:

1. Generate migration

```bash
pnpm run db:generate --name=DescribeYourChange
```

2. Review generated file in src/database/migrations

3. Apply migration

```bash
pnpm run db:migrate
```

4. If needed, rollback

```bash
pnpm run db:revert
```

## Notes

- Keep DB_SYNC=false when using migrations.
- Use DB_MIGRATIONS_RUN=true only if you want startup-time migration execution.
- For production, always run migrations in CI/CD or deployment step before app traffic.
