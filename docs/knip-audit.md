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
- Existing `check` is unchanged: unresolved debt must not break its prior gate.

A temporary `src/knipProbe.ts` function imported only by
`tests/knipProbe.test.ts` added no normal-mode finding, but production reported
its source file as unused. Both probes were removed. During that original probe,
normal mode exited 1 for the independent `State` finding, which is now resolved.

## Verification and limitations

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`:
  passed after removing `State`.
- Earlier PostgreSQL authentication failures were resolved using the documented
  local connection and worktree runtime wrapper. Only isolated worktree databases
  were provisioned and initialized; primary application databases were untouched.
- `npm test`: all 37 tests passed after installing task-local Playwright browsers.
- `npm run test:photo-container`: passed for JPEG, PNG, WebP, HEIC and both
  high-resolution synthetic JPEG cases using the actual production image build.
- Full `check` is not green: the account-creation/password-change E2E test failed
  in Chromium, Firefox and WebKit. The second-browser household workflow also
  failed in WebKit. Remaining browser cases were interrupted after these failures;
  the aggregate did not reach Storybook tests. These failures were not diagnosed
  or waived, and the branch was not merged.
- Dependency installs and builds use `/tmp/fernblick-knip-heavy.lock`.
  Task-created dependencies, browsers and build outputs are cleaned up after
  verification; failure traces are retained in the task worktree.
