# Local check runtime (PHO-14)

Measured on the VPS in the PHO-14 worktree using `node scripts/worktree.mjs run npm run check` and `/usr/bin/time`, with the same test database, three browser projects, serial Playwright worker, and all checks enabled:

| Run | Wall clock | Result |
| --- | ---: | --- |
| Baseline | 680.08 s (11m 20s) | 44/45 browser tests passed; Firefox focus/snackbar timed out at 60s, so Storybook did not run |
| Fast-poll E2E build | 433.96 s (7m 14s) | Complete check green, including 45 browser tests and 15 Storybook tests |

The baseline's browser phase was 10.9 minutes; the longest tests included accounts (41–52s), household workflow (35–52s), and list colors (31–48s). Many waits observe periodic client polling. The E2E build now compiles the existing polling queries with 1-second intervals; normal development and production builds retain 10-second household and 30-second session/history/member/user intervals. This tests eventual synchronization in all three browsers but **does not validate the production polling cadence**. No worker parallelism was introduced: workers still share one disposable test database and reset accounts between browser projects. Concurrent workers against that database would invalidate isolation. A separate production-cadence smoke test or per-worker databases would be needed before enabling parallel browser workers.

The baseline failure makes this a directional single-run comparison, not a statistically stable benchmark. Repeat on an idle VPS when evaluating future changes; do not compare a partial failed suite to a fully green suite as equivalent coverage.
