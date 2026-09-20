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

## Docker Compose on a VPS

Use this option to run both PostgreSQL and the app as containers. Keep Cloudflare Tunnel pointed at `http://127.0.0.1:3001`; Docker binds that port only to the VPS loopback interface.

In `.env`, set a strong `POSTGRES_PASSWORD`, keep `DATABASE_URL` pointed at the host-bound database port for setup commands, and set the public origin:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://your-phoget-domain.example
POSTGRES_PASSWORD=GENERATE_A_LONG_RANDOM_HEX_VALUE
DATABASE_URL=postgresql://phoget:GENERATE_A_LONG_RANDOM_HEX_VALUE@127.0.0.1:55432/phoget
```

On a new installation:

```sh
npm ci
docker compose up -d db
npm run db:setup
npm run build
npm run account:setup:production
docker compose up -d --build app
```

The `app` container connects to PostgreSQL over Docker's private network and restarts automatically. Check it locally with `curl http://127.0.0.1:3001/api/health`; use `docker compose logs -f app` to follow application logs.

## Operations

- Serve over HTTPS and keep the app's listening port private.
- Use `GET /api/health` to check database connectivity.
- Back up PostgreSQL regularly.
- Run `npm audit --omit=dev` before releases.
