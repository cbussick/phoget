/** A synchronously initialized gate for holding requests in browser regressions. */
export function deferred() {
  let resolveGate: () => void;
  const promise = new Promise<void>((resolve) => { resolveGate = resolve; });
  return { promise, release: () => { resolveGate(); } };
}
