# Gather

A shared household list app with user accounts and Admin/User roles. React and TypeScript with TanStack Form and Zod validation, a plain Node/Express server, and Postgres through Drizzle ORM.

The original HTML/CSS/JS designs are preserved in `prototype/`. Both original screens are implemented, including their responsive layouts and self-hosted Nunito font.

## Run locally

Requires Node 24+, npm 11, and Docker Compose (or an existing Postgres database).

```sh
npm ci
cp .env.example .env
docker compose up -d db
npm run db:setup
npm run account:setup
npm run db:seed
npm run dev
```

Open the URL printed by `npm run dev`. It starts at **http://127.0.0.1:5173** and automatically tries 5174, 5175, etc. when occupied. The launcher passes the actual origin to the API without changing `.env`; writes remain origin-checked. Keep the printed `127.0.0.1` host. To start searching at another port: `npm run dev -- --port 5180`. The API uses `PORT` from `.env` (default 3001), which must be free. Stopping the launcher stops both services. Standalone `dev:client`/`dev:server` scripts require a manually matching `APP_ORIGIN`. Production origin configuration is unchanged.

Vite's optimizer cache lives in `.cache/vite`, outside `node_modules`, so projects sharing a dependency symlink cannot overwrite each other's generated modules. Dev tests use a separate temporary cache and include a Chromium smoke test that opens the lazy-loaded color picker.

The seed is optional. It adds the five lists and shopping items from the prototype without overwriting existing rows. Skip it for an empty household. Schema setup initializes household settings even without sample data. The account setup command asks for a username, display name, and hidden password; it only works before the first account exists. Passwords need at least 15 characters. There is no public registration.

The local database uses port 55432 and a persistent Docker volume. Stopping Compose preserves your lists. The credentials in the example are for local development.

## What works

- Create, rename, describe, choose icons and colors for, and delete lists.
- Add items, use quick-add suggestions, edit names and notes, and remove items.
- Mark items done, expand the Done section, and move items back to the active list.
- Share changes between browsers, refreshed every two seconds while the page is active.
- Edit the household name. Often Bought is calculated automatically for each list.
- Open list URLs directly and use browser back/forward navigation.
- Recover from failed requests without losing the open form's input.

List details offer six preset color toggle boxes above an editable six-digit hex field and an in-app spectrum picker. Its popup uses Nunito and German labels; “Farbe” is larger than its two subheadings. The saved color appears behind the list icon in the overview and detail header, and on the Add button. Color swatches use neutral selection borders and a checkmark, not a blue selection fill. Dialog buttons keep their standard colors; cancelling never changes the saved list. Custom colors get contrast-checked foregrounds in normal, hover, and pressed states. Existing lists keep their original blue. After updating an existing installation, run `npm run db:setup` to add the `lists.color` column with its blue default and the nullable `lists.updatedById` foreign key (and `npm run db:setup:test` for tests).

List headings show when the list or its items were last changed and who changed them. Old updates without an author show only the time. Names reflect the current user profile; deleting a user removes their activity attribution without deleting shared lists. List symbols use locally copied SVGs from Lucide, Lucide Lab, and Tabler, without icon-library dependencies. License notices ship in `public/third-party-icons.txt`. Success, error, and informational snackbars use green, red, and blue respectively; actionable form errors remain inline.

Each list remembers previously added item names for autocomplete, including names of removed and renamed items. Deleting a list also deletes that history. Often Bought shows up to three previously completed names that are absent from the unfinished items, ranked by completion count. Only names in Open are excluded; names present only in Done remain eligible. Counts start from completions recorded by this version; existing completion history cannot be reconstructed.

There is one shared household. Everyone can use its lists and change their own name and password. Administrators also have Household and Users settings. They can manage household preferences, create and rename accounts, assign roles, reset passwords, and delete accounts.

Created accounts and reset passwords require a password change before accessing shared data. Role changes, password resets, and deletion revoke existing sessions. Changing your own password keeps your current device signed in and signs out other devices. The last administrator cannot be deleted or demoted, including under concurrent requests. Administrators cannot delete their own account or reset their own password through Users; their personal password change remains available in My account. Blocked actions explain the requirement in settings. Account deletion preserves shared lists and items.

Login uses a case-insensitive username and a separate display name. Sessions expire after seven days and are stored in Postgres; only a hash of the random session token is stored. Session cookies are HttpOnly and SameSite=Strict, and HTTPS origins use Secure cookies. Permissions are enforced by Express. Login and password-change attempts are rate limited in Postgres. Passwords use Node's asynchronous scrypt. No email service is required.

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
APP_ORIGIN=https://your-gather-domain.example
```

Then run:

```sh
npm run db:setup
npm run account:setup:production
npm start
```

Express serves the built frontend and API from the same origin. For a local production preview, use `APP_ORIGIN=http://127.0.0.1:3001` and open that address.

Schema setup uses Drizzle Kit to apply the current schema directly. There are no versioned migrations or backward-compatibility adapters. Run setup with development dependencies installed, before pruning them for runtime. Review schema changes before applying them to a database you care about.

Runtime needs `dist/`, `package.json`, `package-lock.json`, the environment file, and production dependencies (`npm ci --omit=dev`). Run commands from the repository root. On an existing installation, skip first-admin setup. The server fails fast if configuration, the schema, or initial settings are missing.

Protect **the entire hostname, including /api/**, with Cloudflare Access and restrict the policy to the two of you. Keep the origin inaccessible from the public internet (for example, loopback behind a tunnel). The app has its own login and permissions. It does not validate Cloudflare JWTs; keep Cloudflare Access as an additional outer gate.

Requests have bounded JSON bodies, strict Zod validation, same-origin write checks and a required `X-Gather-Request: 1` header, security headers, and no API caching. HTTPS security headers follow `APP_ORIGIN`, so HTTP local previews also work in Safari.

`GET /api/health` checks the database and returns `{"status":"ok"}`. SIGTERM and SIGINT stop new requests and close the database pool. Back up Postgres with your usual VPS backup process; the app keeps no independent copy of your data.

## Verification

Tests use an isolated `gather_test` database. They do not modify the local demo household.

One-time test setup:

```sh
cp .env.test.example .env.test
docker compose exec -T db createdb -U gather gather_test
npm run db:setup:test
node --env-file=.env.test --import tsx server/db/seed.ts
npx playwright install --with-deps chromium firefox webkit
```

If the test database already exists, skip the `createdb` command. The test setup resets test accounts, throttles, and non-prototype lists. Never point `.env.test` at a real household.

```sh
npm run check
```

This runs TypeScript, Oxlint, Stylelint, Oxfmt, API integration tests against real Postgres, the production build, browser tests in Chromium, Firefox, and WebKit, and the Storybook build and component accessibility/interaction tests. Browser tests start their own servers on ports 3002 and 4174; Python 3 serves the original prototype for comparison and the built Storybook on port 6007.

The browser suite covers CRUD, persistence after reload, cross-browser household sync, errors and retries, keyboard focus, long-content layouts at 320/768/1024/1440px, axe accessibility checks, and desktop/mobile comparison of prototype geometry, fonts, and colors. Comparison screenshots and failure traces go in `test-results/`.

Individual commands:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run test:storybook
npm audit --omit=dev
```

## Code map

- `src/app/`: app setup, navigation, shell, household query, reset/base styles, and design tokens.
- `src/features/lists/`: lists, item editing, completion, and feature styles.
- `src/features/settings/`: household settings.
- `src/features/accounts/`: login, profile/password forms, and user administration.
- `src/shared/ui/`: component folders with implementations, owned styles, and colocated Storybook stories.
- `src/shared/api/`: validated HTTP transport and mutation invalidation.
- `shared/`: shared Zod schemas and inferred TypeScript types.
- `server/`: Express endpoints, authentication, environment validation, and persistence.
- `.storybook/`: React/Vite setup, common fonts/tokens, accessibility and pseudo-state addons.
- `prototype/`: untouched visual reference.

Input is parsed at the form/API boundary, database results are parsed in the repository, outgoing server data is parsed against the wire contracts, and the browser parses each response. Database timestamps are normalized to ISO strings at the database boundary.

See [design notes](docs/design.md) and [dependency notes](docs/dependencies.md).

## Review components in Storybook

```sh
npm run storybook
```

Open **http://127.0.0.1:6006**. No database or account is needed. Stories render the same components imported by the application. The setup follows FeBOp's React/Vite approach, with expanded controls, accessibility checks, and forced hover/pressed/focus states. Nothing is imported from or published to the work design system.

Component stories are colocated in `src/shared/ui/ComponentName/ComponentName.stories.tsx`. Foundations covers colors, typography, and spacing. Change tokens in `src/app/tokens.css`, and change control behavior/styles in its component folder. Features compose these controls; do not introduce a second implementation of an existing control. Add a story when adding a shared component, including its meaningful states. `npm run build:storybook` produces a standalone `storybook-static/` directory for review, which is not bundled into the application.

The API requires JSON and `X-Gather-Request: 1` for writes, including DELETE. Browser requests include these automatically. Mutations are not automatically retried; if a request loses its response, check the refreshed data before submitting it again.
