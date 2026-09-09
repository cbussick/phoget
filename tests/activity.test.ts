import { test } from "node:test";
import assert from "node:assert/strict";
import { listActivityLabel } from "../src/shared/ui/listActivity";

test("activity labels use German time units without inventing legacy authors", () => {
  const at = "2026-01-01T00:00:00.000Z";
  const now = Date.parse(at);
  for (const [minutes, label] of [
    [0, "Gerade"],
    [1, "Vor 1 Minute"],
    [4, "Vor 4 Minuten"],
    [60, "Vor 1 Stunde"],
    [120, "Vor 2 Stunden"],
    [1440, "Vor 1 Tag"],
    [2880, "Vor 2 Tagen"],
  ] as const) {
    assert.equal(
      listActivityLabel(at, "Alex", now + minutes * 60000),
      `${label} aktualisiert von Alex`,
    );
  }
  assert.equal(listActivityLabel(at, null, now), "Gerade aktualisiert");
  assert.equal(listActivityLabel(at, "Alex", now - 60000), "Gerade aktualisiert von Alex");
});
