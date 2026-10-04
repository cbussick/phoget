import { test } from "node:test";
import assert from "node:assert/strict";
import { createUndoStore } from "../server/undoStore.js";

test("Undo snapshots are scoped, expire, and release their byte budget", () => {
  let now = 0;
  const store = createUndoStore<string>({ ttlMs: 1000, maxBytes: 10, now: () => now });
  const token = store.remember("list:user", "saved", 10)!;
  assert.ok(token);
  assert.equal(store.get("list:user", token), "saved");
  assert.equal(store.get("list:other-user", token), undefined);
  assert.equal(store.get("other-list:user", token), undefined);
  assert.equal(store.remember("list:user", "too much", 1), null);
  assert.equal(store.get("list:user", token), "saved", "capacity does not evict an offered Undo");
  now = 1000;
  assert.equal(store.get("list:user", token), undefined);
  const next = store.remember("list:user", "new", 10)!;
  assert.ok(next);
  store.discard(next);
  assert.equal(store.get("list:user", next), undefined);
  const afterDiscard = store.remember("list:user", "again", 10)!;
  assert.ok(afterDiscard);
  store.discard(afterDiscard);
});

test("Undo snapshots have an entry limit and reject oversized snapshots", () => {
  const store = createUndoStore<string>({ maxEntries: 1, maxBytes: 10 });
  assert.equal(store.remember("scope", "large", 11), null);
  const token = store.remember("scope", "one", 1)!;
  assert.equal(store.remember("scope", "two", 1), null);
  store.discard(token);
  const next = store.remember("scope", "two", 1)!;
  assert.ok(next);
  store.discard(next);
});
