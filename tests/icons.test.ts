import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "../src/shared/ui/Icon/Icon";
import { iconSchema } from "../shared/contracts";

test("saved list icon names render local, decorative SVG artwork", () => {
  for (const name of iconSchema.options) {
    const svg = renderToStaticMarkup(createElement(Icon, { name }));
    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.includes('aria-hidden="true"'));
    assert.ok(svg.includes('viewBox="0 0 24 24"'));
    assert.ok(svg.includes("<path"));
  }
});

test("sewing uses the supplied Tabler Needle Thread paths", () => {
  const svg = renderToStaticMarkup(createElement(Icon, { name: "sewing" }));
  assert.ok(
    svg.includes(
      'd="M3 21c-.667 -.667 3.262 -6.236 11.785 -16.709a3.5 3.5 0 1 1 5.078 4.791c-10.575 8.612 -16.196 12.585 -16.863 11.918"',
    ),
  );
  assert.ok(
    svg.includes(
      'd="M17 7c-2.333 -2.667 -3.5 -4 -5 -4s-2 1 -2 2c0 4 8.161 8.406 6 11c-1.056 1.268 -3.363 1.285 -5.75 .808"',
    ),
  );
});
