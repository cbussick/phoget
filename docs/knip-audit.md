# Knip audit

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

## Verification and limitations

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
failure traces remain in ignored diagnostics. Ordinary Git over SSH is blocked
while the configured key is locked, so this follow-up remains local and unmerged
and remote CI has not verified it.
