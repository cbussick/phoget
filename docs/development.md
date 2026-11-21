# Development and testing

## Choose checks for the change

Select checks by affected behavior and risk, not by file count. Review the diff and pick the smallest set that verifies the change and likely regressions. Use the same rule for the combined result if the merge target moves.

| Change                             | Local checks                                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation only                 | Check formatting, review the diff, and verify changed links and commands. No app suite is needed unless the change affects runtime behavior.                                                                               |
| Scoped UI or application behavior  | Run the relevant static checks and focused tests. For layout changes, include the affected mobile and desktop views and the browser engines relevant to the change. Verify adjacent behavior that shares the changed code. |
| Cross-cutting or high-risk changes | Run the full `node scripts/worktree.mjs run npm run check` suite when the impact cannot be bounded, or when changing shared infrastructure such as authentication, persistence, deployment, or the test harness.           |

Use the full suite for release verification or when the human asks for it. If focused tests reveal broader impact, expand the check set. Report the commands and browser coverage actually run. This local policy does not replace a remote CI gate.

## Branding and startup review

The desktop sidebar and mobile list overview use `BrandLogo`'s compact `wordmark` variant (no bowl). Other mobile app pages omit the wordmark; login and startup keep the default full variant. Browser and home-screen icons use the selected logo-p identity in `public/branding/little-tangle/`. Regenerate opaque home-screen PNGs with `node scripts/worktree.mjs run node scripts/renderAppIcons.mjs` after regenerating branding assets.

The initial session/household requests show `LoadingScreen`, inspired by Shelf's restrained startup motion. It exits as soon as data or an error settles, never waits for a minimum display time, and does not replace cached content on background refresh. Read-only startup requests attempt a connection even when offline rather than pausing indefinitely behind the loader. Reduced motion keeps the full mark and status readable without movement.

- Storybook: **App / Loading screen**, Startup and Lists stories.
- Focused integration checks: `node scripts/worktree.mjs run node --import tsx --test tests/branding.test.ts tests/appBranding.test.ts`.
- These checks use the actual Vite app with intercepted API responses in Chromium, Firefox and WebKit. They cover desktop/mobile/login branding, both startup phases, reduced motion, accessible loading status, cached refresh, connection failures and retries; they do not modify a database.
- Screenshots are regenerated under `.runtime/branding-review/` for desktop/mobile headers and loading screens.

## Manual branding tools and unused-code validation

Run manual tools through `node scripts/worktree.mjs run node scripts/<tool>.mjs`:

- `renderLittleTangleReview`: regenerates navigation/favicon assets and historical
  comparison images under `public/branding/little-tangle/review/`; intentionally
  writes assets, so inspect the diff before committing.
- `renderAppIcons`: regenerates opaque home-screen icons from the selected SVG.
- `verifyBrandingSvg`: checks lettering continuity, contacts and bowl placement.
- `verifyLittleTangleReference`: checks silhouette overlap against the reference
  fixture; accepts an optional candidate SVG path.

These are explicit development roots in Knip, not production entry points.
`node scripts/worktree.mjs run npm run test:knip` checks both normal and production
reachability. Storybook-only Radio lives in `.storybook/components/`, with its
existing stories under `src/shared/ui/Radio/`; it is not application runtime code.

## Type-aware linting

`npm run lint` runs `oxlint . --threads=2` with the `tsrs` backend, followed by
Stylelint. The root `oxlint.config.ts` adopts the Cloudflare preset and explicitly
preserves the original correctness checks, promise handling, awaiting non-promises,
and implied-eval checks, including original checks relaxed by inherited TypeScript
and test overrides. All preset defaults are enabled; no temporary migration
disables remain. See [the migration audit](cloudflare-oxlint-audit.md) for the rule
inventory, regression evidence and validation results. The only known-safe promise
call is `test` from `node:test`:
the Node test runner tracks test completion and reports failures itself. Other
floating promises in tests are still checked.

`server/tsconfig.json` inherits the existing server configuration so automatic
project discovery uses NodeNext semantics. `.storybook/tsconfig.json` inherits
the client configuration, including Vite's CSS types. The root config covers
client, shared code, scripts, tests, and root TypeScript configuration files.

Keep `npm run typecheck` and the TypeScript compilation in `npm run build`.
Optional Oxlint `--type-check` diagnostics cover only linted files, not whole
TypeScript projects, so they do not replace either `tsc` check.

## Worktree runtime

Use Node 24+, Docker Compose, Python 3 and Playwright browsers. `bootstrap` starts a PostgreSQL container and persistent volume for this checkout using `compose.worktree.yaml`. Each worktree has its own Compose project, randomly assigned loopback database port, and generated password. It retains separate dev, API test, and per-browser test databases inside that container. The development runtime does not use the deployment Compose stack or `PHOGET_DATABASE_URL`.

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

Bootstrap stores app ports and database credentials in ignored `.runtime/worktree.json` and generates `.env` and `.env.test`. Keep these files private. Re-running bootstrap preserves the PostgreSQL volume and app ports. `run` requires the container to be running and discovers its published database port before passing the assigned URLs to the command. Dev runs on its own Vite and API ports. Tests run on the worktree's test database; `check` includes API, Chromium/Firefox/WebKit browser, and Storybook checks. Install browsers once with `npx playwright install --with-deps chromium firefox webkit`. `node scripts/worktree.mjs run npm run gallery:errors` uses the same isolated test origin. For interactive Storybook, use `node scripts/worktree.mjs run npm run storybook`.

Photo processing uses the system `magick` command. The production Docker image installs ImageMagick plus its JPEG, WebP and HEIC decoders and restricted policy. On a local host, install ImageMagick 7 with these codecs and set `MAGICK_CONFIGURE_PATH` to the absolute `server/photos` directory for uploads to work in `npm run dev`; without it, invalid-image tests still run but valid uploads fail. `npm run test:photo-container` builds the final runtime image and converts synthetic JPEG/PNG/WebP/HEIC fixtures without depending on host codecs. Test a real iPad HEIC on the final runtime image before production use.

Run **all** data-changing test commands via `worktree.mjs run`; direct `npm run check`, `npm test`, `npm run test:e2e` and setup commands bypass the worktree runtime. The account reset rejects a database name other than the assigned test database.

To switch an existing worktree off the old shared PostgreSQL server, stop its dev and test processes, then run `bootstrap` and the setup commands above. The new databases start empty. Bootstrap does not copy, delete, or stop anything on the old shared server; back up any development data you want to move before switching.

Stop foreground servers with Ctrl-C. Before removing a worktree, run `node scripts/worktree.mjs clean` from that worktree. It refuses active database connections and removes only that worktree's PostgreSQL container and volume, including all its databases. The next bootstrap recreates empty databases. To reallocate app ports, remove `.runtime/worktree.json` **after** cleaning and stopping servers. Do not run two check suites concurrently _inside the same worktree_ (they share its test database and build outputs).

The E2E runner runs Chromium, Firefox and WebKit sequentially, retaining each
browser's separate database and single worker. This bounds peak memory on shared
development hosts without skipping browser coverage or extending test timeouts.
A failed browser still fails the command, and later browsers still run. An
interrupt stops the active browser and leaves queued browsers unstarted.
`npm run test:browser-runner` checks this orchestration without a database or
installed browsers; the same regression tests are included in `npm test`.

Docker build contexts exclude `.runtime`, `.cache` and `.worktrees`. Keep local
browser downloads and runtime diagnostics in these ignored directories so the
container check cannot copy them into build layers or exhaust the shared disk.

To verify isolation, bootstrap two worktrees and confirm the printed PostgreSQL ports differ and Docker shows distinct `phoget-worktree-<hash>` projects and data volumes. With both initialized, write a record in one development database. Clean the other worktree and confirm the first container is still running and the record is still accessible. You can also run checks concurrently across worktrees: each has its own `test-results/`, `dist/`, and `storybook-static/` outputs.
