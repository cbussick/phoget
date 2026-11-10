# Codebase simplification audit

## Scope

Reviewed application entry points, API/request handling, account/session code,
list/history/photo persistence, mutation invalidation, sorting, UI component
reachability, test orchestration, and dependency advisories. This is a targeted
maintenance pass, not a claim that every possible defect has been excluded.

## Changes

- Photo uploads now use the existing request helper instead of maintaining a
  second fetch/error-handling implementation. Binary bodies, MIME fallback and
  the upload's 60-second timeout are retained. Non-JSON upload failures now use
  the shared unavailable-service message; structured server errors are preserved.
- Request headers use the native `Headers` API. Previously, object spreading
  silently lost `Headers` instances and mishandled header tuples/case-insensitive
  overrides. All supported `RequestInit.headers` forms now work, and the required
  request marker is always set.
- List-existence checks select only the ID and no longer return an unused row.
  Duplicate-item detection checks photo metadata without fetching photo bytes.
- History assembly uses typed database projections directly rather than creating
  and parsing intermediate schemas on each request. Public output validation,
  transaction isolation, list existence checks and input validation remain.
- Reorder membership checking uses a set instead of repeated array scans.
- Suggestion removal no longer refreshes household queries twice on success.
  Failures still refresh to recover from concurrent household changes.
- The Node test command discovers `tests/*.test.ts`, removing the manually
  maintained filename list. Seven request/upload regression tests are included.
- Updated Zod, Vite and the aligned Storybook packages within their existing major
  versions, plus compatible transitive fixes in the lockfile.

## Deliberate non-changes

- Normal Knip reports no unused files, exports or dependencies. Production Knip
  still reports only the documented Storybook-only Radio component. Its live
  story and shared UI-library role are not evidence of an abandoned component.
- Explicit Knip roots remain: normal-mode redundancy hints are documented in
  `knip-audit.md`, and production mode needs those roots.
- Legacy history-only Undo and color-omitting list updates remain supported.
  These are explicitly documented compatibility paths, not dead code.
- Kept persistence transactions, advisory locks, authorization and boundary
  validation rather than trading correctness for fewer lines. No database schema,
  deployment configuration or production data was changed.

## Dependency audit

At verification time, npm reported 16 findings before this pass (10 moderate,
5 high, 1 critical), and 8 moderate findings afterward. `npm audit --omit=dev`
reports zero findings.

Remaining findings are in the development-only Drizzle/esbuild and
Storybook/docgen/glob/minimatch chains. npm proposes breaking downgrades of
Drizzle Kit and Storybook's React/Vite integration. Those were not applied, and
no incompatible transitive overrides or audit suppressions were added. These
findings remain follow-up work; use the loopback-only development servers.

## Verification

Verification ran in `.worktrees/codebase-simplification` using its own runtime,
databases and ports:

- Typecheck, lint, formatting, production build and `git diff --check`: pass.
- Node/API tests: 47 passed, including seven new request/upload tests.
- Production-container photo conversions: JPEG, PNG, WebP, HEIC and both
  high-resolution camera JPEG cases pass.
- Browser tests: Chromium 36 passed; Firefox 35 passed and one existing skip;
  WebKit 35 passed and one existing skip.
- Storybook build and all 17 accessibility/interaction tests: pass.
- Normal Knip passes. Production Knip retains the documented Radio finding.
- Production dependency audit: zero findings; full audit: eight moderate findings.

Verification completed in stages, not one green aggregate invocation. Disk
exhaustion first interrupted photo conversion, then caused PostgreSQL error
`53100` during three Firefox account-test setups. After disk cleanup, the photo
check and a complete Firefox rerun passed without source or assertion changes.
The aggregate run stopped before Storybook because of those Firefox setup
failures; Storybook subsequently passed separately.

Commands used the `node scripts/worktree.mjs run` wrapper: `npm run check`, then
`npm run test:storybook` and `env PHOGET_BROWSER_PROJECT=firefox npx playwright
test --project firefox` for the remaining verification. The focused Firefox run
used the already-prepared browser-specific database and production build.
