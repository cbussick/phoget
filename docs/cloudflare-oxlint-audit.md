# Cloudflare Oxlint migration — incomplete implementation checkpoint

## Status

**Not ready for approval or integration as the requested full migration.** This is a
passing migration baseline plus mechanical style fixes, not the full defaults
migration. 19 temporary disables remain. They are migration debt,
not accepted policy exceptions. No file grandfathering or convenience exceptions
have been adopted. No lifecycle behavior has been redesigned and no tests,
timeouts, compiler checks, or assertions have been weakened.

Base: `c5b28c9`. Worktree: `cloudflare-oxlint`. Local commits only.

## Sources and versions

Read the official Cloudflare README and entire migration skill before edits:

- https://github.com/cloudflare/oxlint-config
- https://raw.githubusercontent.com/cloudflare/oxlint-config/main/skills/migrate-oxlint-config/SKILL.md

Installed: Cloudflare 0.1.0, nkzw 3.0.0, Oxlint 1.94.0,
tsrs 0.25.0-ts7.1.0-beta. Original tsrs: 7.1.0-beta.tsrs3.
The tsrs change satisfies the preset peer dependency. npm lockfile retained;
fresh `npm ci` and `npm ls` succeeded.

## Configuration and coverage

Replaced `.oxlintrc.json` with `oxlint.config.ts`. Spread preset at root;
preserve preset plugins and overrides. Original plugins were unicorn,
typescript, oxc; preset adds react, import, vitest, jsx-a11y, promise and JS plugins.
Original four explicit TypeScript rules retained, including strict JSX promise
callbacks. The sole existing known-safe promise call remains Node's tracked
`node:test` `test`; no new safe-call exemptions.

Root lint is now `oxlint . --threads=2`, including JS/MJS scripts previously
omitted by discovery, followed by unchanged Stylelint scopes. Ignore additions
are generated/local artifacts only: .runtime, .worktrees, dist, storybook-static,
test-results, playwright-report. tsc client/server checks and build retained.

Full effective original/current configurations and diagnostics are preserved under
`.runtime/oxlint-audit/`. The original config's correctness category is not
silently replaced by the preset's disabled categories. Explicitly restored rules
(absent or disabled in the preset):

- `no-caller`
- `no-iterator`
- `no-unassigned-vars`
- `oxc/bad-array-method-on-arguments`
- `oxc/bad-match-all-arg`
- `oxc/erasing-op`
- `oxc/only-used-in-recursion`
- `typescript/no-base-to-string`
- `typescript/no-meaningless-void-operator`
- `typescript/no-redundant-type-constituents`
- `typescript/no-this-alias`
- `typescript/no-useless-default-assignment`
- `typescript/no-useless-empty-export`
- `typescript/restrict-template-expressions`
- `unicorn/no-await-in-promise-methods`
- `unicorn/no-empty-file`
- `unicorn/no-new-array`
- `unicorn/no-single-promise-in-promise-methods`
- `unicorn/no-thenable`
- `unicorn/no-unnecessary-await`
- `unicorn/no-useless-fallback-in-spread`
- `unicorn/no-useless-length-check`
- `unicorn/prefer-string-starts-ends-with`

All restored rules are errors. The JS template-expression rule required explicit
String conversion in existing diagnostic messages (same runtime string coercion).
Original checks should also be examined against preset file overrides before
final approval; comprehensive behavior probes have **not** yet been performed.

## Completed rule fixes

- Top-level type imports (initial fix was committed with array-type fixes).
- Array<T> style.
- Braced control flow.
- Number static properties.
- Numeric separators.
- Consistent type imports.
- Catch variable naming.
- replaceAll for global replacements.
- Explicit template-expression string conversion for newly discovered scripts.

Formatter subsequently applied to changed source files. No intentional
application behavior changes.

## Temporary disables still requiring implementation

- `typescript/no-non-null-assertion`
- `react/immutability`
- `@nkzw/no-instanceof`
- `react/button-has-type`
- `quality/no-conditional-empty-object-spread`
- `react/set-state-in-effect`
- `quality/no-unknown-returns`
- `unicorn/consistent-function-scoping`
- `no-console`
- `react-hooks/exhaustive-deps`
- `quality/no-array-filter-map`
- `no-promise-executor-return`
- `typescript/no-unsafe-assignment`
- `typescript/no-unsafe-member-access`
- `typescript/no-unsafe-type-assertion`
- `typescript/no-unsafe-return`
- `typescript/require-array-sort-compare`
- `typescript/no-unnecessary-type-assertion`
- `typescript/use-unknown-in-catch-callback-variable`

The remaining full-preset diagnostic snapshot is
`.runtime/oxlint-audit/remaining.json` (before later formatting/template fixes).
Required work includes React state synchronization in ComboBox, Select,
Suggestions, SortableRows; form callback initialization; DOM ref ownership;
server error-boundary narrowing; DnD third-party callback typing; generic form
field-key validation; runtime DOM narrowing; CLI/server logging and the remaining
mechanical rules. These are **unfinished**, not claims that rules cannot fit.
Add red/green regressions for behavior changes, not deferred state updates or
unsupported type assertions. No final design/policy decision was made here.

## Validation at this checkpoint

Commands ran serially through `node scripts/worktree.mjs run` where applicable.
Runtime uses databases phoget_dev_81235b55fce0 / phoget_test_81235b55fce0.

- Isolated original checkout/install: extracted exact base under
  `.runtime/oxlint-audit/original`; `npm ci` and original `npm run lint` pass.
  This is an archived isolated checkout rather than a registered Git worktree.
- Fresh migration `npm ci`: pass.
- `npm run lint` including Stylelint: pass **with temporary disables**.
- `npm run typecheck`: both tsc checks pass.
- `npm run build`: pass.
- `npm test`: 66 passed, zero skipped.
- `npm run check`: stopped at photo-container due unreadable container
  package.json; checkout files were mode 600. Restored read permissions on tracked
  files/directories (no Git mode changes). Original photo-container passed.
  Retried task photo-container after permissions repair: pass.
- `npm run test:e2e`: initial 200-second tool timeout interrupted Chromium.
  Full serial rerun completed Chromium, Firefox, WebKit successfully, each with
  59 passed and one existing conditional skip; no skip edits were made.
- `npm run test:storybook`: 17 passed.
- Full `check` chain has not been rerun end-to-end since permissions repair.
- Knip both modes: fail; exact original-install reproduction confirms same unused
  files, unlisted playwright dependency and unused Member export. Migration adds
  a tsrs configuration hint (preset discovery now recognizes backend usage).
  No Knip findings hidden or ignored.
- Type-aware/JSX/client/server/test rejection probes: **not yet performed**.

Evidence filenames: original-npm-ci.log, original-lint.log,
migration-baseline-lint.log, final-npm-ci.log, typecheck.log, lint-final.log,
build.log, tests.log, check.log, photo-container-retry-readable.log,
original-photo-container.log, e2e.log, e2e-complete-attempt.log, storybook.log,
knip.log, knip-production.log, original-knip.log,
original-knip-production.log, versions.log.

## Timing (checkpoint only; no speedup claim)

Interleaved original/final Oxlint subprocesses, two threads each, same host:
original 0.807 / 0.581 / 0.458 seconds; checkpoint
2.274 / 1.754 / 1.949 seconds. Exit codes all zero.
Commands use the original explicit scopes/root TS files versus checkpoint
root discovery. Coverage differs and checkpoint still has temporary disables,
so these numbers are **not a final full-preset benchmark**. Shared host load
was uncontrolled. Raw order/results: `timings.json`.
No baseline timing is inferred from the coordinator's failed /usr/bin/time run.

## Handoff requirements

Finish every temporary rule disable with fixes and regression evidence;
perform rejection probes; rerun fresh-install full check; repeat final interleaved
benchmark; update this report. Coordinator must arrange two fresh local read-only
reviews over the entire exact base-to-final diff afterward. No reviewers have
been spawned and no remote operations have been performed.
