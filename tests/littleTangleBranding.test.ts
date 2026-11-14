import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../public/branding/", import.meta.url);
const readSvg = (name: string) => readFile(new URL(`little-tangle/${name}.svg`, root), "utf8");

test("Little Tangle uses direct reference contours in the original native frame", async () => {
  const full = await readSvg("logo-full");
  const reference = await readFile(
    new URL("../tests/fixtures/branding/little-tangle-reference.png", import.meta.url),
  );
  assert.equal(reference.readUInt32BE(16), 765);
  assert.equal(reference.readUInt32BE(20), 560);
  assert.ok(full.includes('viewBox="0 0 765 560"'));
  for (const id of ["noodle-lettering", "reference-chopsticks", "tangle-bowl"]) {
    assert.ok(full.includes(`id="${id}"`));
  }
  assert.doesNotMatch(full, /id="dont"|id="noodle-check"|id="t-flourish"|fold-fronts|fold-backs/);
});

test("curved rear noodles are occluded by the same continuous chopstick profile", async () => {
  const full = await readSvg("logo-full");
  const rear = full.match(/id="p-rear-ribbon"[^>]*d="([^"]+)"/)?.[1];
  assert.ok(rear);
  assert.match(rear, /C/);
  assert.doesNotMatch(rear, /[HV]/);
  assert.ok(full.includes('id="t-hidden-turn"'));
  assert.ok(full.indexOf('id="t-hidden-turn"') < full.indexOf('id="rail-backing"'));
  const backing = full.match(/id="rail-backing"[^>]*d="([^"]+)"/)?.[1];
  const occlusion = full.match(/id="straight-rail-occlusion"[\s\S]*?<path[^>]*d="([^"]+)"/)?.[1];
  assert.ok(backing);
  assert.equal(occlusion, backing);
  assert.ok(full.includes('clip-path="url(#rear-crossings)"'));
  assert.ok(full.indexOf('id="rear-noodle-continuations"') < full.indexOf('id="rail-backing"'));
  assert.ok(full.indexOf('id="rail-backing"') < full.indexOf('id="noodle-lettering"'));
  assert.ok(full.indexOf('id="noodle-lettering"') < full.indexOf('id="straight-rail-occlusion"'));
});

test("the Little Tangle full logo and compact applications share the tilted bowl", async () => {
  const assets = await Promise.all(
    ["logo-full", "logo-mark", "favicon", "favicon-white-sky", "favicon-white-deep"].map(readSvg),
  );
  const bowl = assets[0].match(/id="tangle-bowl"[^>]*d="([^"]+)"/)?.[1];
  assert.ok(bowl);
  for (const svg of assets) {
    assert.ok(svg.includes(`d="${bowl}"`));
    // The reference bowl already includes its tilt; compact versions scale that same path.
    assert.match(svg, /role="img" aria-labelledby="title description"/);
    assert.doesNotMatch(
      svg,
      /<(?:image|text|script|foreignObject|linearGradient|radialGradient)\b|data:/i,
    );
    // Luminance-mask white/black are technical coverage values, not painted colors.
    const painted = svg.replace(/<mask\b[\s\S]*?<\/mask>/g, "");
    for (const [, color] of painted.matchAll(/(?:fill|stroke)="([^"]+)"/g)) {
      assert.ok(["none", "#8bcdf1", "#176f9f", "#18302b", "#fffefa"].includes(color));
    }
  }
});

test("the full-logo review export retains two-times pixel resolution", async () => {
  const png = await readFile(new URL("little-tangle/review/logo-full-2x.png", root));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 765 * 2);
  assert.equal(png.readUInt32BE(20), 560 * 2);
});

test("Little Tangle favicons have actual 16 and 32 pixel exports", async () => {
  for (const variant of ["favicon", "favicon-white-sky", "favicon-white-deep"]) {
    for (const size of [16, 32]) {
      const png = await readFile(new URL(`little-tangle/${variant}-${size}.png`, root));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
    }
  }
});
