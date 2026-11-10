import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { ApiError, request } from "../src/shared/api/request.js";
import { listApi } from "../src/features/lists/listApi.js";

for (const headers of [
  { Authorization: "test", "content-type": "text/plain" },
  new Headers({ Authorization: "test", "content-type": "text/plain" }),
  [
    ["Authorization", "test"],
    ["content-type", "text/plain"],
  ] as [string, string][],
]) {
  test(`request preserves ${headers.constructor.name} headers and caller cancellation`, async (t) => {
    const controller = new AbortController();
    t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/example");
      const actual = new Headers(options.headers);
      assert.equal(actual.get("Authorization"), "test");
      assert.equal(actual.get("Content-Type"), "text/plain");
      assert.equal(actual.get("X-Phoget-Request"), "1");
      assert.equal(options.signal, controller.signal);
      return Response.json({ value: 1 });
    });
    assert.deepEqual(
      await request("/example", z.object({ value: z.number() }), {
        headers,
        signal: controller.signal,
      }),
      { value: 1 },
    );
  });
}

test("request supplies defaults and validates empty responses", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).get("Content-Type"), "application/json");
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(null, { status: 204 });
  });
  assert.equal(await request("/example", z.undefined()), undefined);
  await assert.rejects(request("/example", z.string()), z.ZodError);
});

test("request preserves structured API errors and tolerates non-JSON errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Invalid name", field: "name" }, { status: 400 }),
  );
  await assert.rejects(request("/example", z.undefined()), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.message, "Invalid name");
    assert.equal(error.field, "name");
    return true;
  });
  fetch.mock.mockImplementation(async () => new Response("Bad gateway", { status: 502 }));
  await assert.rejects(request("/example", z.undefined()), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 502);
    assert.match(error.message, /nicht erreichbar/);
    return true;
  });
});

for (const type of ["image/jpeg", ""]) {
  test(`photo uploads share request handling with MIME type ${type || "fallback"}`, async (t) => {
    const file = new File(["photo"], "photo", { type });
    t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
      assert.equal(url, "/api/items/item-id/photo");
      assert.equal(options.method, "PUT");
      assert.equal(options.body, file);
      assert.equal(
        new Headers(options.headers).get("Content-Type"),
        type || "application/octet-stream",
      );
      assert.equal(new Headers(options.headers).get("X-Phoget-Request"), "1");
      return new Response(null, { status: 204 });
    });
    await listApi.uploadPhoto("item-id", file);
  });
}
