# Cloudflare Oxlint defaults migration

## Status and scope

Implemented locally on `cloudflare-oxlint`, based on `c5b28c9`. **All 19 temporary
migration disables have been removed.** No project rule exemptions, grandfathered
files, lint suppression comments, weaker compiler checks, deferred state updates,
test skips or timeout increases were added. Inherited preset exceptions remain
except where they would weaken original correctness checks; those checks are
explicitly restored, including unbound methods in tests.

Two fresh independent, read-only local Pi processes reviewed the full diff from
`c5b28c929f6e873d924e871a9b4ab17b33d234d0` to implementation tip
`d7aae74e34e69d86c88b79f56a31ef839bfa631b`: Standards/behavior and Spec/behavior.
Both completed successfully with **zero blockers**. They inspected code and
retained evidence, not independent check reruns. No integration authorization
is implied. No push, PR, remote comment, merge or deploy.

Optional review observations remain explicit coverage limitations: combined
incoming-row updates with failed reorder; held real household refetch; delayed
submit/reset; leaving suggestion management while removal is pending. The last
can allow the already-existing captured completion callback to repopulate undo
state after exit; this migration does not claim to fix that inherited race.
Current regressions cover leaving after completion. No claim of comprehensive
async-interleaving coverage is made.

## Sources, versions and discovery

Read the official README and full migration skill:

- https://github.com/cloudflare/oxlint-config
- https://raw.githubusercontent.com/cloudflare/oxlint-config/main/skills/migrate-oxlint-config/SKILL.md

Installed versions: Cloudflare **0.1.0**, nkzw **3.0.0**, Oxlint **1.94.0**,
tsrs **0.25.0-ts7.1.0-beta**. Original tsrs was **7.1.0-beta.tsrs3**; its prerelease
version does not satisfy Cloudflare's peer range. npm lockfile retained. Fresh
`npm ci` and `npm ls` pass. Evidence: `completed-npm-ci.log`, `completed-versions.log`.

`.oxlintrc.json` was replaced with `oxlint.config.ts`, spreading the preset at the
root, including its plugins and overrides. Original plugins: unicorn, typescript,
oxc; preset also brings react, import, vitest, jsx-a11y, promise and JS plugins.
No Vokhanhbel plugin existed in this repository's original configuration.

Lint now uses `oxlint . --threads=2`, then the original Stylelint scopes. Original
explicit directories already included JS/MJS scripts; root discovery removes the
need to maintain that directory list. Generated/local artifact ignores only:
`.runtime`, `.worktrees`, `dist`, `storybook-static`, `test-results`,
`playwright-report`, plus inherited node_modules. Final Oxlint reports 175 files
and 257 rules versus original 165 files and 112 rules. Added source, regression
fixtures and discovery configuration account for the expanded workload.

`server/tsconfig.json` inherits NodeNext server semantics;
`.storybook/tsconfig.json` inherits client/Vite CSS types. Both original tsc checks
and the compilation in build remain; lint does not replace compilation.

## Original correctness parity

Original whole-category correctness must not disappear behind the preset's
explicit category disables. Preserved explicitly at error severity:

- no-caller, no-iterator, no-unassigned-vars
- oxc/bad-array-method-on-arguments, bad-match-all-arg, erasing-op, only-used-in-recursion
- typescript/no-base-to-string, no-meaningless-void-operator,
  no-redundant-type-constituents, no-this-alias, no-useless-default-assignment,
  no-useless-empty-export, restrict-template-expressions
- unicorn/no-await-in-promise-methods, no-empty-file, no-new-array,
  no-single-promise-in-promise-methods, no-thenable, no-unnecessary-await,
  no-useless-fallback-in-spread, no-useless-length-check, prefer-string-starts-ends-with

A final TypeScript override also restores original checks relaxed by inherited
file overrides: constructor-super, getter-return, no-class-assign, no-const-assign,
no-dupe-class-members, no-dupe-keys, no-func-assign, no-import-assign,
no-new-native-nonconstructor, no-obj-calls, no-setter-return, no-this-before-super,
no-unreachable, no-unsafe-negation, no-with, typescript/unbound-method.

The original explicit await-thenable, no-implied-eval, no-misused-promises and
no-floating-promises checks remain. Async JSX attributes are not exempted.
The **only** known-safe promise call remains `test` from `node:test`, whose runner
tracks completion and failures; arbitrary test promises remain checked.
Original/current effective configurations are saved in the evidence directory,
including `original-print-config.json` and `completed-print-config.json`.

## Rule fixes

Earlier small commits preserve the baseline migration and fix top-level type
imports, Array<T> style, braces, numeric separators/static Number properties,
catch names, replaceAll and explicit diagnostic string conversion.

All formerly temporary rules now use the preset defaults:

| Rule                                              | Implementation                                                                                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript/no-non-null-assertion                  | Check mounted roots/dialogs and gallery environment; guard missing sortable rows; keyboard controls use their event's owned element.                                                                                              |
| react/immutability                                | Commit-owned input ref via useImperativeHandle; CSSOM setters for popup layout; submission callbacks receive reset controls from formApi rather than referencing the form being initialized.                                      |
| @nkzw/no-instanceof                               | Named ZodError imports; composed event paths for DOM containment; HTML namespace narrowing for focus restoration. Cancellation tests exercise the native AbortSignal brand check and non-aborted default, not a weaker duck-type. |
| react/button-has-type                             | Explicitly validated button/submit/reset attributes, with button as the default.                                                                                                                                                  |
| quality/no-conditional-empty-object-spread        | Explicit builders for optional styles, request bodies, Vite allowedHosts and database position patches; preserve omission and style precedence.                                                                                   |
| react/set-state-in-effect                         | Guarded render-time invalid/disabled interaction resets; undo state cleared at managing transitions; server order derived directly outside pending saves.                                                                         |
| quality/no-unknown-returns                        | Preserve actual action/save result types with generics.                                                                                                                                                                           |
| unicorn/consistent-function-scoping               | Hoist reusable CLI/test helpers; shared deferred gate; one-pass image decoding; serialized raster helpers receive frame dimensions and alpha threshold as analysis inputs.                                                        |
| no-console                                        | Tested application/CLI output boundary using stdout/stderr and Node formatting; API request log tests still verify route privacy.                                                                                                 |
| react-hooks/exhaustive-deps                       | Session cleanup depends on the user ID it reads; remove signature-based reorder synchronization effect.                                                                                                                           |
| quality/no-array-filter-map                       | Single flatMap passes for active names and selected browser server configuration.                                                                                                                                                 |
| no-promise-executor-return                        | Explicit void executor bodies, retaining existing completion events and delays.                                                                                                                                                   |
| typescript/no-unsafe-assignment                   | Narrow Express route metadata and error values; no any assignments at these boundaries.                                                                                                                                           |
| typescript/no-unsafe-member-access                | Parse error metadata, including nested database conflict codes, before access.                                                                                                                                                    |
| typescript/no-unsafe-type-assertion               | Validate form field names, parse icon names, use typed browser element callbacks and event paths.                                                                                                                                 |
| typescript/no-unsafe-return                       | Parse gallery payloads through contracts; validate request logs; DnD void callbacks do not return third-party any values.                                                                                                         |
| typescript/require-array-sort-compare             | Numeric status comparison in the API concurrency test.                                                                                                                                                                            |
| typescript/no-unnecessary-type-assertion          | Remove assertions that add no type information.                                                                                                                                                                                   |
| typescript/use-unknown-in-catch-callback-variable | Narrow filesystem errors before checking ENOENT in browser-runner regressions.                                                                                                                                                    |

## Lifecycle and regression evidence

`tests/controlLifecycle.test.ts` serves the actual components through Vite with
isolated network responses, in Chromium, Firefox and WebKit. It exercises:

- invalid/disabled transitions while a combobox is open and highlighted;
- no stale popup reopening or highlighted selection after recovery;
- Select closure across disable/re-enable and subsequent keyboard selection;
- suggestion undo removal when leaving and re-entering management;
- optimistic reorder retained during a pending save, including incoming rows;
- server order authoritative when save/refetch finishes;
- failed reorder rollback and visible error feedback.

The original behavior passed before redesign. Removing the synchronization
without replacing ownership went red; replacing it with guarded/derived state
went green. Evidence: `controls-original.log`, `controls-red.log`,
`controls-green.log`, `lists-original.log`, `lists-red.log`, `reorder-red.log`,
`lists-green.log`. Keyboard tests wait for DnD activation/announcements rather
than adding sleeps. An early fixture intercepted source module URLs as well as
API requests; narrowing its route to `/api/lists/**` fixed the harness, not the
application. Those harness failures are not behavioral red evidence.

Added tests also cover output formatting/stream ownership and arbitrary error
metadata. Existing form, focus, cancellation, API conflict, cross-browser drag,
suggestion undo, styling and accessibility regressions remain intact.

## Rejection probes

Temporary client TSX, server TS, test TS and script MJS probes were created,
linted, and removed. `completed-rejection-probes.json` records rejection of:

- floating promises in client, server and tests;
- async JSX callbacks via no-misused-promises;
- awaiting non-promises in all four scopes (including JS);
- unsafe server returns and explicit any;
- unbound test instance methods, despite the inherited test exemption;
- script eval.

The tracked node:test call was accepted, while the neighboring arbitrary
floating promise was rejected. No probe files remain in the branch.

## Validation and environment

All checks serialized, browser workers limited to one, Oxlint to two threads.
Data-changing commands use `node scripts/worktree.mjs run` with worktree-owned
ports/databases: `phoget_dev_81235b55fce0` / `phoget_test_81235b55fce0`.

- Fresh npm ci: pass.
- Typecheck: client and server tsc pass.
- Oxlint and Stylelint: pass without temporary disables.
- Format check: pass.
- Build: Vite and server compilation pass.
- Unit/integration tests: 72 pass, zero skipped.
- Production photo-container check: pass.
- E2E: Chromium 60 pass; Firefox/WebKit each 59 pass and one existing
  platform-conditional touch skip. No skips/timeouts changed.
- Storybook: 17 pass.
- Full `npm run check`: pass (`completed-check-retry.log`). First complete
  attempt hit a transient occupied Chromium port; later browsers passed. The
  port was unoccupied when inspected; no unrelated process was killed.
- Knip and production Knip: fail with original findings, independently reproduced
  in a **real detached original worktree**. Both have the unused Member type;
  development has four unused branding scripts and the existing unlisted
  playwright import; production has the unused Radio component. Migration adds
  only a tsrs configuration hint. No findings suppressed or ignored.

Knip evidence: `completed-knip.log`, `completed-knip-production.log`,
`real-original-knip.log`, `real-original-knip-production.log`.

### Correction to earlier checkpoint evidence

The archived original at `.runtime/oxlint-audit/original` was traversed under an
ignored ancestor. Its Oxlint run checked **only five root files**, not the full
baseline. Earlier checkpoint lint/benchmark evidence from that archive is
**invalid for full-baseline claims**. It is retained, not silently relabeled.

Replacement baseline: detached worktree
`/root/cb-coding/phoget/.worktrees/cloudflare-oxlint-original` at exact `c5b28c9`,
fresh npm ci, no source edits. Original full lint passes with five warnings:
require-array-sort-compare in the API test and four JS template-expression
warnings. Replacement logs: `real-original-npm-ci.log`, `real-original-lint.log`,
`real-original-diagnostics.json` (165 files), and the Knip logs above.

## Fair interleaved timings

`real-completed-timings.json`: identical Node/host, two Oxlint threads each,
original installed backend versus final installed backend, original command's
explicit scopes versus final root discovery. One warmup per configuration,
then six interleaved rounds with alternating first runner. All exit codes zero.
Oxlint only; installation, Stylelint and compiler time excluded.

- Original seconds: 1.056 / 1.309 / 0.949 / 0.970 / 1.267 / 1.066;
  median **1.061 s**.
- Final seconds: 1.867 / 1.848 / 1.589 / 1.493 / 1.700 / 1.620;
  median **1.660 s**.

Final checks more files and rules (175/257 vs 165/112). This is a migration-cost
measurement, **not a speedup claim** or isolated backend comparison. Shared-host
load remains uncontrolled. Archived timings and `completed-timings.json` use the
invalid five-file baseline and must not be used for performance conclusions.

All raw evidence is retained locally under `.runtime/oxlint-audit/`. Small local
implementation commits are preserved. The committed implementation tip also
passed an additional complete `check` run, recorded in
`final-committed-check.log`. Final report/review commit pins are supplied in the
handoff. Both Knip modes remain failing as documented; do not represent all
validation commands as green or integrate without the applicable failure gate.
