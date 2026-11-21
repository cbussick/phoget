# Knip audit

## Baseline follow-up (base 914e55e)

This section supersedes the historical findings below. Both `npm run knip` and
`npm run knip:production` now pass; `npm run test:knip` validates both with their
original failure exit codes. It failed before the changes and passes afterwards.
No issue categories or files were ignored to obtain that result.

- Four manual branding CLIs are explicit development entries. They generate app
  icons, regenerate Little Tangle review assets, check SVG contact geometry, and
  compare artwork with its reference fixture. They are useful tooling, not dead
  code; their implementations and assertions are retained.
- Those CLIs and two browser test helpers now import browser launchers from the
  already-declared `@playwright/test`, which re-exports the Playwright API. They
  no longer rely on an undeclared transitive `playwright` dependency.
- The unused `Member` type alias had no code references in this private app and
  was removed. `memberSchema` and all account runtime contracts are unchanged.
- Radio has no application consumers, but its three Storybook examples remain
  useful. Its implementation now lives in `.storybook/components/Radio.tsx`,
  outside the production source inventory, with the same props/rendering and
  shared CSS. The existing story imports it there; no fake runtime entry or
  blanket UI exclusion was added. This is a development-only boundary, not a
  deletion of the component API.
- The stale tsrs dependency ignore was removed: Knip now discovers the backend.
  Six normal-mode redundant-entry hints remain intentional: script/plugin
  discovery overlaps explicit roots needed for production analysis. They are
  not unused-code findings, and no hints are suppressed.

A temporary unreferenced TypeScript file in `src/shared/ui` made production Knip
fail with that exact unused-file finding; removing the probe restored green.
This confirms production source remains checked rather than broadly excluded.
No probes remain. Disposable local evidence is removed after delivery; this audit
and the delivery PR retain the diagnosis and verification summary.

### Baseline follow-up verification

Implementation `040370f` was reviewed by two fresh independent local read-only
Pi processes (standards and spec), both with zero actionable findings. Neither
reviewer reran the checks. The original CLI loops and `test:knip` failed before
changes and passed afterwards; the production dead-source probe also failed with
the expected unused-file finding before removal.

All required check stages passed against the implementation tree: both compiler
projects, Oxlint/Stylelint, formatting, Vite/server build, 76 Node/API tests (zero
skips), production-container photo conversions (JPEG/PNG/WebP/HEIC and both large
JPEG fixtures), Chromium (60 passed), Firefox and WebKit (59 passed and one
existing platform-conditional skip each), and Storybook (17 passed). No skips,
assertions, timeouts or tolerances were weakened. Both Knip modes pass with only
the six documented normal-mode redundancy hints.

These results were completed in stages, not one successful aggregate invocation:
the first full check was interrupted during WebKit. Only missing WebKit and
Storybook stages were then run, serially, against the existing E2E build and
isolated runtime. The first WebKit resume hit a transient occupied task port;
inspection found it unbound and a retry passed without killing any process.
Firefox took 8.5 minutes and WebKit 8.3 minutes. Runtime performance investigation
is tracked separately in PHO-21; no performance changes are bundled here.

Delivery initially found remote base `914e55e` unchanged. The subsequent
workflow-only cleanup update `7809a7c` was integrated into the task branch without
conflicts or runtime/configuration changes. Existing full-stage results were
reused rather than restarting the browser suites. Fresh independent read-only
review covers this documentation-only reconciliation; bounded validation covers
both Knip modes and formatting. Task-owned databases, dependencies, generated builds,
screenshots/results and raw logs/reviewer scratch are disposable after merge;
tracked fixtures, useful branding tools and unrelated worktrees remain intact.

## Scope and configuration

Knip is pinned locally to 6.42.1. Run `npm run knip` and
`npm run knip:production`. Both commands retain failure exit codes.

`knip.jsonc` covers browser, Express server, shared code, administrative/setup
CLIs, development scripts, Node tests, browser tests and Storybook. Production
roots point to TypeScript sources rather than compiled `dist` files. Seed tools
and stories are development-only. Public assets contain no JavaScript roots.
Playwright and Drizzle plugins are disabled because importing their configs
requires provisioned runtime/database settings; the configs and their actual
roots are instead analyzed statically. No database is needed for Knip.
Explicit production CLI roots overlap script discovery in normal mode (benign
redundancy hints); they remain necessary in production mode.

Same-file consumers are counted with `ignoreExportsUsedInFile`: login throttling,
validation schemas, color presets and SelectOption are live implementations,
not deletion candidates. The unused `State` type was removed; no source files or
tests were deleted. No blanket ignores, export annotations or suppressed issue
categories were added.

## Findings

- Normal: exit 0 after removing the unused `State` type in `shared/contracts.ts`.
- Production: exit 1 for `src/shared/ui/Radio/Radio.tsx`,
  currently used only by its Storybook story. Retained pending a UI-library
  decision; this is real development-only reachability, not a runtime root.
- No remaining dependency findings. No external package API is published.
- Knip remains report-only: the retained Storybook component is not a new
  mandatory failure in `check`.

A temporary `src/knipProbe.ts` function imported only by
`tests/knipProbe.test.ts` added no normal-mode finding, but production reported
its source file as unused. Both probes were removed. During that original probe,
normal mode exited 1 for the independent `State` finding, which is now resolved.

## Browser-check resource follow-up

The account-creation/password-change cases passed in focused runs but timed out
when three browser projects ran simultaneously under memory pressure. The runner
now executes Chromium, Firefox and WebKit sequentially, retaining each project's
isolated database and worker. It still runs later browsers after a failure,
returns a failing exit code if any browser fails, and stops queued browsers on an
interrupt. No application assertions, browser coverage or test timeouts changed.

Three real-subprocess regression tests cover sequencing, failure propagation and
interrupt cleanup. All failed against the parallel runner and pass against the
new runner. They are included in `npm test` and can also run without databases or
installed browsers through `npm run test:browser-runner`.

A separate disk-space failure came from local browser downloads and diagnostics
being copied into Docker build layers. `.dockerignore` now excludes `.runtime`
and `.worktrees`, alongside the existing `.cache` exclusion. A Docker COPY probe
confirmed that runtime metadata is unavailable in the build context; the normal
production-container photo check still passes.

## Initial resource follow-up verification and limitations

Checks used the prescribed worktree runtime wrapper, task-local browsers and
isolated databases. Production application data and deployment were untouched.

- Typecheck, lint, formatting and production build: pass.
- `npm test`: all 40 tests pass, including the three new runner regressions.
- `npm run test:photo-container`: passes for JPEG, PNG, WebP, HEIC and both
  high-resolution synthetic JPEG cases using the production image build.
- Browser projects: Chromium 36 passed; Firefox 35 passed and one existing skip;
  WebKit 35 passed and one existing skip. All original account-flow and
  second-browser household scenarios pass. No skip annotations were added.
- An additional focused WebKit run repeated the feedback/navigation case three
  times; all three passed with its existing timeout and assertions.
- `npm run test:storybook`: all 17 tests pass.
- Normal Knip passes. Production Knip still reports only the retained Radio
  component described above.

Verification completed in stages, not in a single successful aggregate run.
The serial `check` attempt hit an external 20-minute execution cap during WebKit.
It also recorded one WebKit test timeout after browser page creation alone took
44 seconds. A subsequent complete WebKit run and the focused repetitions passed,
and Storybook was run separately. This startup timing risk is recorded, not
suppressed; no failed-check integration waiver was requested or assumed.

Installs and heavy checks use `/tmp/fernblick-knip-heavy.lock`. Task-created
dependencies, browsers and build outputs were removed after verification;
failure traces remain in ignored diagnostics. Publishing now uses ordinary Git
over SSH. The combined branch retains newer main's Node 24.22.1 floor; its
verification and integration status are tracked in
[PR #3](https://github.com/cbussick/phoget/pull/3).

## Combined integration verification

After integrating newer main, the complete `node scripts/worktree.mjs run npm
run check` command passed in one invocation on Node 24.22.1, without the earlier
external execution cap. This includes typecheck, lint, formatting, all 40
Node/API tests, production-container photo conversions, all browser projects
(106 passed, two existing skips), and all 17 Storybook tests. The original
account/household cases and the previously timed-out WebKit feedback case pass.

Normal Knip passes; production retains only the documented Radio finding. The
three subprocess regressions and Docker context exclusion probe pass. No test
assertions, application timeouts, or browser coverage were weakened. Task-owned
databases, dependencies, browsers and builds were removed after the run.
