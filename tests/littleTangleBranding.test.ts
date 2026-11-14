import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../public/branding/", import.meta.url);
const readSvg = (name: string) => readFile(new URL(`little-tangle/${name}.svg`, root), "utf8");

test("Little Tangle's full logo retains the repaired lettering without a check-flourish", async () => {
  const full = await readSvg("logo-full");
  const wordmark = await readFile(new URL("logo-wordmark.svg", root), "utf8");
  const lettering = (svg: string) => svg.match(/id="noodle-lettering"[^>]*d="([^"]+)"/)?.[1];
  assert.ok(lettering(full));
  assert.equal(lettering(full), lettering(wordmark));
  assert.doesNotMatch(full, /id="dont"|id="noodle-check"|id="t-flourish"/);
});

test("the Little Tangle full logo and compact applications share the tilted bowl", async () => {
  const assets = await Promise.all(["logo-full", "logo-mark", "favicon"].map(readSvg));
  const bowl = assets[0].match(/id="tangle-bowl"[^>]*d="([^"]+)"/)?.[1];
  assert.ok(bowl);
  for (const svg of assets) {
    assert.ok(svg.includes(`d="${bowl}"`));
    assert.ok(svg.includes('transform="rotate(12 128 132)"'));
    assert.match(svg, /role="img" aria-labelledby="title description"/);
    assert.doesNotMatch(
      svg,
      /<(?:image|text|script|foreignObject|linearGradient|radialGradient)\b|data:/i,
    );
    for (const [, color] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) {
      assert.ok(["none", "#8bcdf1", "#176f9f", "#18302b"].includes(color));
    }
  }
});

test("Little Tangle favicons have actual 16 and 32 pixel exports", async () => {
  for (const size of [16, 32]) {
    const png = await readFile(new URL(`little-tangle/favicon-${size}.png`, root));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
