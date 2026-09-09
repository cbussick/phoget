# Phoget

A shared list app for two people. React and TypeScript, a plain Node/Express server, and Postgres through Drizzle ORM.

## Branding

Phoget pairs a pho bowl with a rising checkmark: a reminder for groceries, chores, and everything else. The editable app icon is `public/icon.svg`, with PNG exports for home-screen icons and `public/site.webmanifest` for app metadata. The navigation uses the same SVG, including the bowl stripe. The icon uses the app's primary blue (`#176f9f`) and light-blue accent (`#8bcdf1`).

Existing `gather` database names, credentials, and Docker volume identifiers are intentionally retained for compatibility with self-hosted installations. Renaming the app does not require a database migration.

The original HTML/CSS/JS designs are preserved in `prototype/`. Both original screens are implemented, including their responsive layouts and self-hosted Nunito font.

## Run locally

Requires Node 24+, npm 11, and Docker Compose (or an existing Postgres database).

```sh
npm ci
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:5173**. Keep that exact host: the configured origin is checked on writes.

The seed is optional. It adds the five lists and shopping items from the prototype without overwriting existing rows. Skip it for an empty household. Migrations initialize household settings even without sample data. Change the household name, names, and quick-add suggestions in Settings.

The local database uses port 55432 and a persistent Docker volume. Stopping Compose preserves your lists. The credentials in the example are for local development.

## What works

- Create, rename, describe, choose icons for, and delete lists.
- Add items, use quick-add suggestions, edit names and notes, and remove items.
- Mark items done, expand the Done section, and move items back to the active list.
- Share changes between browsers, refreshed every two seconds while the page is active.
- Edit household settings and quick-add suggestions.
- Open list URLs directly and use browser back/forward navigation.
- Recover from failed requests without losing the open form's input.

Settings are household display preferences. They do not create login accounts. There is one shared household; access control belongs to your Cloudflare gate.

Each write updates only the supplied item fields. Independent name and completion changes can succeed together. If both people edit the same field, the last save wins. There is no offline write queue: failed writes show an error and must be retried. Form drafts are kept in the open page, not across reloads.

## Production build and runtime

Deployment is left to you. The application is designed to run as one Node process behind your private origin / Cloudflare setup.

```sh
npm ci
npm run build
```

Set these values in `.env` before running the production server:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@DATABASE_HOST:5432/DATABASE_NAME
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=https://your-phoget-domain.example
```

Then run:

```sh
npm run db:migrate:production
npm start
```

Express serves the built frontend and API from the same origin. For a local production preview, use `APP_ORIGIN=http://127.0.0.1:3001` and open that address.

Runtime needs `dist/`, `drizzle/`, `package.json`, `package-lock.json`, the environment file, and production dependencies (`npm ci --omit=dev`). Run commands from the repository root. The built migration runner does not need development dependencies. The server fails fast if configuration, migrations, or initial settings are missing.

Protect **the entire hostname, including /api/**, with Cloudflare Access and restrict the policy to the two of you. Keep the origin inaccessible from the public internet (for example, loopback behind a tunnel). The app trusts that gate and does not validate Cloudflare JWTs itself. A publicly reachable origin would bypass that access policy.

Requests have bounded JSON bodies, strict Zod validation, same-origin write checks, security headers, and no API caching. HTTPS security headers follow `APP_ORIGIN`, so HTTP local previews also work in Safari.

`GET /api/health` checks the database and returns `{"status":"ok"}`. SIGTERM and SIGINT stop new requests and close the database pool. Back up Postgres with your usual VPS backup process; the app keeps no independent copy of your data.

## Verification

Tests use an isolated `gather_test` database. They do not modify the local demo household.

One-time test setup:

```sh
cp .env.test.example .env.test
docker compose exec -T db createdb -U gather gather_test
node --env-file=.env.test --import tsx server/db/migrate.ts
node --env-file=.env.test --import tsx server/db/seed.ts
npx playwright install --with-deps chromium firefox webkit
```

If the test database already exists, skip the `createdb` command. Keep the seeded test lists intact for the prototype comparisons.

```sh
npm run check
```

This runs TypeScript, Oxlint, Stylelint, Oxfmt, API integration tests against real Postgres, the production build, and browser tests in Chromium, Firefox, and WebKit. Browser tests start their own servers on ports 3002 and 4174; Python 3 serves the original prototype for comparison.

The browser suite covers CRUD, persistence after reload, cross-browser household sync, errors and retries, keyboard focus, long-content layouts at 320/768/1024/1440px, axe accessibility checks, and desktop/mobile comparison of prototype geometry, fonts, and colors. Comparison screenshots and failure traces go in `test-results/`.

Individual commands:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm audit --omit=dev
```

## Code map

- `src/app/`: app setup, navigation, shell, household query, reset/base styles, and design tokens.
- `src/features/lists/`: lists, item editing, completion, and feature styles.
- `src/features/settings/`: household settings.
- `src/shared/ui/`: shared button, icon, field, feedback, and native modal components.
- `src/shared/api/`: validated HTTP transport and mutation invalidation.
- `shared/contracts.ts`: shared Zod schemas and inferred TypeScript types.
- `server/`: Express endpoints, environment validation, persistence, and migrations.
- `drizzle/`: generated, versioned SQL migrations.
- `prototype/`: untouched visual reference.

Input is parsed at the form/API boundary, database results are parsed in the repository, outgoing server data is parsed against the wire contracts, and the browser parses each response. Database timestamps are normalized to ISO strings at the database boundary.

See [design notes](docs/design.md) and [dependency notes](docs/dependencies.md).
