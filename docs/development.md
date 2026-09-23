# Development and testing

## Worktree runtime

Use Node 24+, PostgreSQL (the local `db` service in `compose.yaml`), Python 3 and Playwright browsers. Start PostgreSQL once from the primary checkout with `docker compose up -d db`. Each worktree uses the same PostgreSQL server but has **two distinct databases**, named `phoget_dev_<worktree hash>` and `phoget_test_<worktree hash>`. Neither database is the production/deployment database. Set `PHOGET_DATABASE_URL` to a loopback PostgreSQL connection URL if the local database credentials/port differ from `.env.example` (or put that URL in this worktree's `.env` before bootstrap). Bootstrap generates `.env` and `.env.test` for this worktree from that URL; do not put production credentials there.

From **each** worktree:

```sh
npm ci
node scripts/worktree.mjs bootstrap
node scripts/worktree.mjs run npm run db:setup
node scripts/worktree.mjs run npm run db:setup:test
# Optional: create two local demo logins (development database only):
node scripts/worktree.mjs run npm run dev:seed
node scripts/worktree.mjs run npm run dev
# In another terminal in the same worktree:
node scripts/worktree.mjs run npm run check
```

`dev:seed` creates `admin/admin` (administrator) and `user/user` (ordinary user) in this worktree's development database only. It refuses the test database or any non-loopback connection. It does not seed lists; use `node scripts/worktree.mjs run npm run db:seed` for sample lists. Re-running `dev:seed` leaves existing accounts, passwords, and other data unchanged; if you have changed a demo password, the printed credential is no longer valid. These short demo passwords deliberately bypass the normal five-character account-creation minimum **only in this local fixture script**. Never use them for a deployed database.

Bootstrap stores its private port assignments in ignored `.runtime/worktree.json`; reusing a worktree reuses its ports and databases. `run` prints URLs/database names and passes the assigned URLs to the command. Dev runs on its own Vite and API ports. Tests run on the worktree's test database; `check` includes API, Chromium/Firefox/WebKit browser, and Storybook checks. Install browsers once with `npx playwright install --with-deps chromium firefox webkit`. `node scripts/worktree.mjs run npm run gallery:errors` uses the same isolated test origin. For interactive Storybook, use `node scripts/worktree.mjs run npm run storybook`.

Run **all** data-changing test commands via `worktree.mjs run`; direct `npm run check`, `npm test`, `npm run test:e2e` and setup commands bypass the worktree runtime. The account reset rejects a database name other than the assigned test database. Never point `PHOGET_DATABASE_URL` at a remote server: bootstrap rejects non-loopback hosts.

Stop foreground servers with Ctrl-C. To discard only this worktree's dev and test databases after stopping its processes, run `node scripts/worktree.mjs clean`. This refuses to drop databases with active connections. The runtime file retains port assignments so the next bootstrap recreates those databases; to reallocate ports, remove `.runtime/worktree.json` **after** cleaning and stopping servers. If a saved port is occupied by another process, stop that process or clean and remove the runtime file before bootstrapping again; never kill a process by a copied PID. Do not run two check suites concurrently _inside the same worktree_ (they share its test database and build outputs).

For a two-worktree exercise, bootstrap and set up each worktree as above, start both dev commands, then start both `node scripts/worktree.mjs run npm run check` commands concurrently. Confirm the printed ports and database names differ, both suites pass, and data written to one dev database remains after the other worktree's test reset. Each worktree has its own `test-results/`, `dist/`, and `storybook-static/` outputs.
