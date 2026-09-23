// Browser tests exercise the same polling paths with shorter waits. Normal builds
// retain production intervals; the override is compiled only for test:e2e.
export const householdPollMs = import.meta.env.VITE_E2E_FAST_POLL === "1" ? 1_000 : 10_000;
export const sessionPollMs = import.meta.env.VITE_E2E_FAST_POLL === "1" ? 1_000 : 30_000;
