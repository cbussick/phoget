import assert from "node:assert/strict";
import test from "node:test";
import { errorDetails } from "../server/errorDetails.js";

test("error metadata narrows arbitrary failures without exposing unsafe values", () => {
  for (const error of [null, undefined, 42, "failure"]) {
    assert.deepEqual(errorDetails(error), {});
  }
  assert.equal(errorDetails(new Error("failure")).message, "failure");
  assert.equal(errorDetails({ cause: { code: "23505" } }).causeCode, "23505");
  assert.equal(errorDetails({ type: "entity.too.large" }).type, "entity.too.large");
  const malformed = errorDetails({
    code: 23_505,
    cause: null,
    message: { private: "secret" },
    name: [],
  });
  assert.equal(malformed.code, undefined);
  assert.equal(malformed.causeCode, undefined);
  assert.equal(malformed.message, undefined);
  assert.equal(malformed.name, undefined);
});
