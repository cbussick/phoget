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
not deletion candidates. No source or tests were deleted. No blanket ignores,
export annotations or suppressed issue categories were added.

## Findings

- Normal: exit 1, unused exported type `State` in `shared/contracts.ts`.
- Production: exit 1, the same type plus `src/shared/ui/Radio/Radio.tsx`,
  currently used only by its Storybook story. Retained pending a UI-library
  decision; this is real development-only reachability, not a runtime root.
- No remaining dependency findings. No external package API is published.
- Existing `check` is unchanged: unresolved debt must not break its prior gate.

A temporary `src/knipProbe.ts` function imported only by
`tests/knipProbe.test.ts` added no normal-mode finding, but production reported
its source file as unused. Both probes were removed. Normal mode still exited 1
for the independent baseline `State` finding.

## Verification and limitations

- `npm run typecheck`, `npm run lint`, `npm run build`: passed as standalone,
  read-only checks without database configuration.
- `npm run format:check`: initially flagged the new config; corrected and rerun.
- `node scripts/worktree.mjs run npm run typecheck`: blocked by local PostgreSQL
  authentication (`28P01`, password authentication failed for user `phoget`).
  Thus the prescribed runtime wrapper, API tests and database-backed browser
  suite could not be verified. No migrations, account setup or data resets ran.
- Full `check`/container/browser tests were not run: runtime authentication,
  the no-migration constraint and limited disk prevent safe full provisioning.
- Dependency installs and builds use `/tmp/fernblick-knip-heavy.lock`.
  Task-created dependencies and build outputs are removed after verification.
