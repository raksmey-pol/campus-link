# Campus Link

Campus Link is a full-stack student platform for item recovery, course reviews, and section or course swaps. It combines a NestJS API, a Next.js web app, PostgreSQL persistence, role-based access control, and real-time features for swap matching and notifications.

## What It Does

- Lost and found item reporting, moderation, claims, and resolution workflows.
- Course browsing, student reviews, and resource sharing.
- Swap request creation and matching for course sections or full courses.
- Google and local authentication with JWT access and refresh tokens.
- Role-aware admin and moderation tools.
- File uploads with local storage or S3.
- Telegram announcements for lost-and-found workflows.

## Project Structure

- `api/` - NestJS backend with TypeORM, PostgreSQL, migrations, and seed scripts.
- `web/` - Next.js frontend with app router, role-aware UI, and BFF/proxy routes.
- `db_schema.dbml` - Database schema documentation for dbdiagram.io.
- `websocket_testing/` - Simple HTML page for websocket experimentation.
- `pmc-*.postman_collection.json` - Postman collections for API testing.

## Tech Stack

- Backend: NestJS, TypeORM, PostgreSQL, Passport JWT, Socket.IO, AWS SDK, Google Auth Library.
- Frontend: Next.js, React, TypeScript, Tailwind CSS, Radix UI, React Hook Form, Zod, TanStack Query.

## Prerequisites

- Node.js 18 or newer.
- pnpm.
- PostgreSQL.
- Optional: S3-compatible storage, Google OAuth client ID, Telegram bot credentials.

## Setup

The backend and frontend are separate apps, so install dependencies in each folder.

### 1. Install dependencies

```bash
cd api
pnpm install

cd ../web
pnpm install
```

### 2. Configure the API environment

Copy `api/.env.example` to `api/.env` and update the values for your environment.

The most important settings are:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `GOOGLE_CLIENT_ID`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `STORAGE_DRIVER`
- `LOCAL_UPLOAD_DIR`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`, `API_PUBLIC_BASE_URL` if you want Telegram announcements

For local development, set the API on a free port such as `8000` so it does not conflict with the Next.js dev server.

### 3. Configure the web environment

Create `web/.env.local` and point it at the API base URL.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
API_URL=http://localhost:8000
```

If you keep the API on a different port, update both values accordingly.

### 4. Prepare the database

Run the TypeORM migrations before starting the app.

```bash
cd api
pnpm run db:migrate
```

Optional seed scripts are available for demo data.

```bash
pnpm run db:seed:users
pnpm run db:seed:lost-found
```

## Run Locally

Start the API first, then the frontend.

### API

```bash
cd api
pnpm run start:dev
```

### Web

```bash
cd web
pnpm dev
```

By default, the API listens on `PORT` from `api/.env` and the web app runs on the Next.js dev server port. If both need the same port, change one of them before starting.

## Useful Scripts

### API

- `pnpm run build` - compile the NestJS app.
- `pnpm run start:dev` - run the API with watch mode.
- `pnpm run start:prod` - run the built API.
- `pnpm run lint` - lint and fix backend TypeScript.
- `pnpm run format` - format backend TypeScript.
- `pnpm run test` - run unit tests.
- `pnpm run test:e2e` - run end-to-end tests.
- `pnpm run db:generate` - generate a migration from entity changes.
- `pnpm run db:migrate` - run pending migrations.
- `pnpm run db:revert` - revert the last migration.

### Web

- `pnpm dev` - run the Next.js app in development.
- `pnpm build` - build the frontend for production.
- `pnpm start` - start the production frontend.
- `pnpm lint` - run ESLint.

## Main Features By Area

### Authentication

- Local and Google login flows.
- JWT access and refresh token handling.
- Role-based authorization for user, mentor, moderator, and admin access.

### Lost and Found

- Report items with photos and location details.
- Review, approve, reject, claim, and resolve submissions.
- File uploads through local storage or S3.
- Submission rate limits and Telegram announcements.

### Courses

- Browse and search courses.
- Submit reviews and vote on helpful reviews.
- Manage course resources and moderation states.

### Swap

- Create section or course swap requests.
- Match requests in real time with Socket.IO.
- Track request expiry, confirmations, and audit logs.

## API Notes

- The API is served under the `/api` prefix.
- Static uploads are exposed from the local upload directory when `STORAGE_DRIVER=local`.
- The frontend uses BFF and proxy routes for auth and data access.

## Documentation And Testing

- `db_schema.dbml` contains the high-level schema used to document the database.
- The Postman collections in the repository can be used to test the backend endpoints.
- `websocket_testing/wb-test.html` can help with websocket experiments during swap development.

## License

This project is currently private and does not include a published license.