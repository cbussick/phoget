import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "../shared/logging.js";

test("logging keeps formatted normal output and errors on their respective streams", (t) => {
  const output: Array<string> = [];
  const errors: Array<string> = [];
  t.mock.method(process.stdout, "write", (text: string) => {
    output.push(text);
    return true;
  });
  t.mock.method(process.stderr, "write", (text: string) => {
    errors.push(text);
    return true;
  });
  logger.info("request %s: %d", "GET", 200);
  logger.log("ready");
  logger.error("failed", { code: "EIO" });
  assert.deepEqual(output, ["request GET: 200\n", "ready\n"]);
  assert.deepEqual(errors, ["failed { code: 'EIO' }\n"]);
});
