# Development and testing

## Local servers

To choose a starting port, use `npm run dev -- --port 5180`. The API port (`PORT`, default 3001) must be free.

## Test setup

Tests need PostgreSQL, Python 3, and Playwright browsers. Use only the isolated `gather_test` database: test setup resets accounts and list data.

```sh
cp .env.test.example .env.test
docker compose exec -T db createdb -U gather gather_test
npm run db:setup:test
node --env-file=.env.test --import tsx server/db/seed.ts
npx playwright install --with-deps chromium firefox webkit
npm run check
```

Skip `createdb` if the database exists. Keep ports 3002 and 6007 free for browser and Storybook tests.

`npm run check` runs all checks. Individual commands are in `package.json`.

## Storybook

Storybook needs no database or login. Keep stories beside shared components. Use `npm run build:storybook` for a standalone build.
