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

test("the t crown does not reverse curvature as it turns behind the stick", async () => {
  const full = await readSvg("logo-full");
  const turn = full.match(/L 700 33 (.*?) C 679\.134/)?.[1];
  assert.ok(turn);
  let start = [700, 33];
  const signs = new Set<number>();
  for (const [, coordinates] of turn.matchAll(/C\s*([^C]+)/g)) {
    const values = coordinates.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
    assert.equal(values?.length, 6);
    const [x1, y1, x2, y2, x3, y3] = values!;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const u = 1 - t;
      const dx = 3 * u * u * (x1 - start[0]) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
      const dy = 3 * u * u * (y1 - start[1]) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
      const ddx = 6 * u * (x2 - 2 * x1 + start[0]) + 6 * t * (x3 - 2 * x2 + x1);
      const ddy = 6 * u * (y2 - 2 * y1 + start[1]) + 6 * t * (y3 - 2 * y2 + y1);
      const cross = dx * ddy - dy * ddx;
      if (Math.abs(cross) > 1e-7) signs.add(Math.sign(cross));
    }
    start = [x3, y3];
  }
  assert.equal(signs.size, 1, "The t tip has an S-shaped kink instead of one smooth turn");
});

test("the upper chopstick has a circular cap tangent to its straight edge", async () => {
  const full = await readSvg("logo-full");
  const cap = full.match(
    /id="rail-backing"[^>]*d="M27\.75 81\.7L([\d.]+) ([\d.]+)A13 13 0 0 1 ([\d.]+) ([\d.]+)/,
  );
  assert.ok(cap, "The upper stick should end in one clean semicircle");
  const [x0, y0, x1, y1] = cap.slice(1).map(Number);
  const dx = x1 - x0;
  const dy = y1 - y0;
  assert.ok(Math.abs(Math.hypot(dx, dy) - 26) < 1e-4);
  const axisX = x0 - 27.75;
  const axisY = y0 - 81.7;
  const dot = (axisX * dx + axisY * dy) / (Math.hypot(axisX, axisY) * 26);
  assert.ok(Math.abs(dot) < 1e-5, "The round cap should join the top edge tangentially");
});

test("the Little Tangle full logo and compact applications share the tilted bowl", async () => {
  const assets = await Promise.all(
    [
      "logo-full",
      "logo-mark",
      "favicon",
      "favicon-white-sky",
      "favicon-white-deep",
      "favicon-noodle-p-white-sky",
    ].map(readSvg),
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
  for (const variant of [
    "favicon",
    "favicon-white-sky",
    "favicon-white-deep",
    "favicon-noodle-p-white-sky",
  ]) {
    for (const size of [16, 32]) {
      const png = await readFile(new URL(`little-tangle/${variant}-${size}.png`, root));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
    }
  }
});
