# Local check runtime (PHO-14)

Measured on the VPS in the PHO-14 worktree with `/usr/bin/time node scripts/worktree.mjs run npm run check`:

| Run                                              |         Wall clock | Result                                                                          |
| ------------------------------------------------ | -----------------: | ------------------------------------------------------------------------------- |
| Original serial suite                            | 680.08 s (11m 20s) | 44/45 app browser tests passed; Firefox timed out, Storybook did not run        |
| Fast-poll serial suite                           |  433.96 s (7m 14s) | Complete check green: 45 app browser and 15 Storybook tests                     |
| Fast-poll isolated parallel browsers, first run  |  278.35 s (4m 38s) | Firefox navigation timed out at 60s under contention; other 29 app tests passed |
| Fast-poll isolated parallel browsers, second run |  325.19 s (5m 25s) | Complete check green: 45 app browser and 15 Storybook tests                     |

The original browser phase was 10.9 minutes. Fast polling reduced the serial browser phase to 6.0 minutes. The parallel green run's browser-project phases took Chromium 2.1 minutes, Firefox 2.9 minutes and WebKit 4.0 minutes; they overlap, but the VPS slows under three-browser contention. The 5m25s wall time includes database schema setup for each browser, builds, static and API checks, and Storybook (44s). This is a roughly 25% reduction from the comparable green 7m14s run, not a threefold speedup.

`test:e2e` initializes three disposable databases, named `phoget_test_<worktree hash>_<browser>`, with independent server ports. It runs **one worker per browser database** in three concurrent Playwright processes. The existing base test database remains dedicated to API tests and error gallery. Each browser worker resets only its own accounts. Worktree cleanup drops all five worktree databases and refuses to drop active ones. Never point the runtime at a non-loopback PostgreSQL host or run two suites concurrently inside one worktree.

The E2E build compiles the same polling queries with 1-second intervals. Normal development and production builds retain 10-second household and 30-second session/history/member/user intervals. Tests still cover eventual synchronization in all three browsers but **do not validate production polling cadence**. The timed-out parallel run shows remaining reliability risk when the VPS is busy; a further repeat or resource profiling is warranted before relying on this as a routine gate. These are individual runs, not statistically stable benchmarks.
