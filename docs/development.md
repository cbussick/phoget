# Development and testing

## Local servers

`npm run dev` starts Vite and the API. Vite starts at port 5173 and selects the next available port; the launcher passes the actual origin to the API without editing `.env`. Use the printed `127.0.0.1` address. To choose a different starting port, run `npm run dev -- --port 5180`.

The API port (`PORT`, default 3001) must be free. Standalone `dev:client` and `dev:server` require a manually matching `APP_ORIGIN`. Vite caches are project-local in `.cache/vite`; dev tests use temporary caches so servers cannot overwrite each other's optimized dependencies.

## Test setup

Tests require Node, PostgreSQL, Python 3 (for the Storybook preview server), and Playwright browsers. Use the isolated `gather_test` database, never a real household: setup resets test accounts, throttles, and lists other than the demo fixtures.

```sh
cp .env.test.example .env.test
docker compose exec -T db createdb -U gather gather_test
npm run db:setup:test
node --env-file=.env.test --import tsx server/db/seed.ts
npx playwright install --with-deps chromium firefox webkit
npm run check
```

Skip `createdb` if the database already exists. `check` runs typechecking, linting, formatting, API/unit tests, production-build browser tests, and Storybook checks. Browser tests need port 3002; Storybook tests need port 6007. `npm test` also opens the color picker in Chromium against an isolated dev server.

Individual commands: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:e2e`, and `npm run test:storybook`. Screenshots and failure traces are ignored by Git.

## Components

`npm run storybook` opens the component workshop on port 6006 without a database or login. Stories live beside components in `src/shared/ui/`. App and stories share styles, tokens, and the self-hosted font. Add meaningful states and interaction coverage when adding a shared control.

`npm run build:storybook` creates `storybook-static/` for standalone review; it is not included in the app build.
