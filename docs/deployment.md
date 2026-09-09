# Deployment

Requires Node 24+ and PostgreSQL.

## Setup

Run `npm ci`, then configure a private `.env` with real credentials:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@DATABASE_HOST:5432/DATABASE_NAME
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://your-phoget-domain.example
```

Back up existing data and review schema changes before running setup. Schema setup changes the database directly; there are no versioned migrations.

```sh
npm run build
npm run db:setup
npm run account:setup:production
npm start
```

Run commands from the repository root. Skip account setup on existing installations. Keep development dependencies until build and database setup finish.

## Operations

- Serve over HTTPS and keep the app's listening port private.
- Use `GET /api/health` to check database connectivity.
- Back up PostgreSQL regularly.
- Run `npm audit --omit=dev` before releases.
