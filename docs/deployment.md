# Deployment

Phoget runs as one Node process serving both the built frontend and API, backed by PostgreSQL.

## Configure and build

Install dependencies with `npm ci`. Set these values in a private `.env`:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@DATABASE_HOST:5432/DATABASE_NAME
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://your-phoget-domain.example
```

Use real database credentials, not the local example defaults.

```sh
npm run build
npm run db:setup
npm run account:setup:production
npm start
```

Skip first-administrator setup on existing installations. Schema setup applies the current Drizzle schema directly, without versioned migrations. Back up the database and review schema changes before applying them. Run setup with development dependencies installed before pruning them for runtime.

Runtime requires Node 24+, `dist/`, `package.json`, `package-lock.json`, private environment configuration, and production dependencies (`npm ci --omit=dev`). Run commands from the repository root. For an HTTP preview, set `APP_ORIGIN=http://127.0.0.1:3001`.

## Operations

- Serve the app over HTTPS through a reverse proxy or tunnel; keep its listening port private.
- If using Cloudflare Access, protect the entire hostname including `/api/`. The app has its own login but does not validate Cloudflare JWTs.
- `GET /api/health` checks database connectivity. SIGTERM/SIGINT shut down the server and database pool.
- Back up PostgreSQL separately. The application keeps no independent copy of household data.
- Run `npm audit --omit=dev` before releases. Third-party icon notices are included in the built frontend.
