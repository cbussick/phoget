# Oxlint type-aware linting trial

## Recommendation

Keep type-aware linting. This adds safety coverage that the old setup did not
have; it is not a speed upgrade from an existing type-aware backend. The extra
lint time is reasonable for checking promise handling throughout this repository.
Keep both existing `tsc` checks and the server compilation in the build.

## Versions and scope

- Before: Oxlint **1.82.0**, default plugins/rules, no configuration file,
  `typeAware` option, or type-aware backend.
- After: Oxlint **1.94.0**, `tsrs` **7.1.0-beta.tsrs3**, pinned through npm and
  `package-lock.json`. `tsrs --version` identifies TypeScript compatibility as
  **7.1.0-beta**, source `microsoft/TypeScript@3e9236361fa9`.
- Existing TypeScript **7.0.2** is unchanged. Validation used Node **24.22.1** and
  npm **11.19.1** on Linux x64, with eight available CPUs.
- The original lint command, Stylelint phase, validation scripts, and default
  Oxlint plugins (`unicorn`, `typescript`, `oxc`) are preserved. Configuration adds
  `options.typeAware` and error-level `await-thenable`, `no-floating-promises`,
  `no-implied-eval`, and `no-misused-promises` rules. Other default type-aware
  correctness rules remain enabled.
- `server/tsconfig.json` extends the existing NodeNext server configuration.
  `.storybook/tsconfig.json` extends the client configuration, including Vite CSS
  types. No compiler options were weakened. Before the explicit Storybook wrapper,
  the optional `--type-check` experiment reported five CSS-import diagnostics
  there; the wrapper resolves those diagnostics.
- Knip is told that `tsrs` is dynamically loaded by Oxlint, not an unused import.

## Findings

The initial new lint run reported four misused async callback errors, 60 floating
`node:test` registration errors, and five warnings.

The three photo callbacks already catch request failures. Their void-returning
adapters now explicitly discard the handled promises. The drag completion callback
also gets a void-returning adapter; cache invalidation rejection now produces an
error snackbar and releases the busy state instead of rejecting out of `finally`.

`node:test` owns test execution and reports test failures itself. A package- and
symbol-specific `allowForKnownSafeCalls` entry permits only its `test` API.
Unrelated floating promises inside test files still fail lint, as verified by
probes. No rules or file coverage were disabled.

Five warnings remain visible, not suppressed:

- `tests/api.test.ts:125`: `require-array-sort-compare` on the HTTP status array.
- `scripts/verifyBrandingSvg.mjs:159`: two `restrict-template-expressions` warnings
  for interpolated color arrays in diagnostic text.
- `scripts/verifyLittleTangleReference.mjs:117,121`: two
  `restrict-template-expressions` warnings for inferred region names in diagnostic
  text.

These do not fail the existing warning policy. No unrelated cleanup was applied.

## Coverage and install checks

Temporary probes in `src`, `server`, `shared`, `scripts`, `tests`, and `.storybook`
all produced the expected `no-floating-promises`, `await-thenable`, and
`no-misused-promises` diagnostics. `tsc --showConfig` also confirms that the
server discovery wrapper covers exactly the original server configuration's 22
root files with the same NodeNext checking semantics; client/root has 136 root
files and Storybook has two. The final diagnostic run covers **165 files**
and **112 rules**, versus **165 files** and **96 rules** before. Optional
`--type-check` reports zero compiler errors after configuration fixes.

A separate fresh directory installed the exact lockfile and repository `.npmrc`
(`ignore-scripts=true`) with `npm ci`, resolved
the expected versions, and detected all four selected safety rules, including
`no-implied-eval`, in a probe. There is no `oxlint-tsgolint` dependency. All probe
source files were removed afterward. These are local Linux checks, not a claim
about untested operating systems or all possible backend/compiler edge cases.

## Timings

These are process wall times, not backend-only times, using the existing Oxlint
path list directly (without npm, the worktree wrapper, Stylelint, or `--type-check`).
Each invocation starts a new process; filesystem/dependency caches are warm.
No `--debug timings` instrumentation was used for these measurements.

Before installation changes, one warm-up followed by five original lint runs
measured **0.1302 s median**, range **0.1199–0.1492 s**, with zero diagnostics.

A second comparison interleaved all three modes, reversing their order on
alternate rounds: one warm-up per mode, then five measured runs each. The native
controls use an empty config to reproduce the original defaults; the type-aware
mode uses the new root config. All runs exited successfully.

| Mode                      | Five measured runs (seconds)           | Median   | Range           |
| ------------------------- | -------------------------------------- | -------- | --------------- |
| 1.82.0, native only       | 0.3536, 0.2670, 0.3545, 0.3982, 0.3539 | 0.3539 s | 0.2670–0.3982 s |
| 1.94.0, native only       | 0.2833, 0.2692, 0.3832, 0.3128, 0.3593 | 0.3128 s | 0.2692–0.3832 s |
| 1.94.0 + tsrs, type-aware | 3.1418, 3.6783, 2.5290, 3.1328, 2.8566 | 3.1328 s | 2.5290–3.6783 s |

The paired comparison ran on a heavily shared host, with concurrent browser/test
jobs (including this worktree's E2E suite) and one-minute load averages **22.1–23.5**
on eight CPUs. It is not a controlled speed benchmark. The repeated baseline is
also substantially slower than the initial baseline, demonstrating contention.
The useful conclusion is additional safety coverage for a few seconds of lint,
not a claimed speedup. No memory comparison or tsgolint comparison was made.

## Validation

`node scripts/worktree.mjs run npm run check` **passed (exit 0)**, including:

- Both existing `tsc --noEmit` projects, Oxlint and Stylelint, and formatting.
- All **66 Node tests**, with no skips or failures.
- The production Docker image photo checks: JPEG/PNG/WebP/HEIC fixtures and
  6000×4000 / 8160×6120 camera JPEG conversion.
- Production Vite build and existing server TypeScript compilation.
- Chromium: **60 passed**; Firefox: **59 passed, 1 skipped**; WebKit:
  **59 passed, 1 skipped**. The two existing skips are the Chromium-only synthetic
  touch probe; no skips were introduced for this task.
- Storybook build and all **17 Storybook tests**.

Fresh install, diagnostic `--type-check`, temporary rule probes, compiler-config
comparison, and `git diff --check` also passed. These are local results, not remote
CI. The five warnings listed above remain visible.

Work was isolated from clean `main` at `b3cd958` on branch `oxlint-tsrs` in
`.worktrees/oxlint-tsrs`. At handoff, the task branch is committed but not merged
or pushed; named-branch approval for `oxlint-tsrs` → `main` is still required.
The worktree and its local diagnostic logs remain available for that handoff.

A first full-check attempt passed all 66 Node tests, then failed the photo
container check because this host's `umask 0077` created checkout files unreadable
to the image's non-root user (`/app/package.json: permission denied`). Making
tracked files readable and fixture directories traversable in this isolated
worktree fixes the environment problem; private generated `.env` files remain
mode 0600. There is no source or Dockerfile workaround.

The optional `npm run knip` still fails on exactly the baseline findings: four
unused branding scripts, the unlisted `playwright` import in
`tests/appBranding.test.ts`, and unused exported `Member`. The baseline was rerun
from an archive of the starting commit and its diagnostics match the final run.
Knip is not part of `npm run check`; adding this backend introduces no new Knip
findings. Both runs used Knip 6.42.1; the baseline source/manifest came from
`git archive b3cd958`. The matching failure diagnostics are:

```text
Unused files (4)
scripts/renderAppIcons.mjs
scripts/renderLittleTangleReview.mjs
scripts/verifyBrandingSvg.mjs
scripts/verifyLittleTangleReference.mjs
Unlisted dependencies (1)
playwright  tests/appBranding.test.ts:7:43
Unused exported types (1)
Member  type  shared/accounts.ts:43:13
```

Both runs also print the same six redundant-entry configuration hints. No Knip
failures were waived for integration: integration remains subject to explicit
named-branch approval at handoff.

Both baseline and fresh-install npm audits report eight moderate development
vulnerabilities; no unrelated dependency remediation was attempted. The separate
production-only audit reports zero vulnerabilities.

## Official references

- [Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware)
- [tsrs announcement](https://oxc.rs/blog/2026-11-17-faster-type-aware-linting-with-tsrs)
- [no-floating-promises options](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-floating-promises.html)

Oxlint automatically selects installed `tsrs`. Its `--type-check` reports compiler
errors only for linted files and is not a whole-project `tsc` replacement. It is
used here as a validation experiment, not added to the normal lint command.
