import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const directory = new URL("../public/branding/", import.meta.url);
const svgNames = [
  "logo-full",
  "logo-horizontal",
  "logo-wordmark",
  "logo-mark",
  "logo-mark-mono",
  "app-icon",
  "favicon",
];

const readSvg = (name: string) => readFile(new URL(`${name}.svg`, directory), "utf8");

test("the proposed logo assets are self-contained, accessible vector artwork", async () => {
  const palette = new Set(["#8bcdf1", "#176f9f", "#18302b"]);
  const tokens = await readFile(new URL("../src/app/tokens.css", import.meta.url), "utf8");
  for (const color of palette) assert.ok(tokens.includes(color));

  for (const name of svgNames) {
    const svg = await readSvg(name);
    assert.match(svg, /^<svg\s/);
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /viewBox="[\d .]+"/);
    assert.match(svg, /role="img" aria-labelledby="title description"/);
    assert.match(svg, /<title id="title">Don't Phoget/);
    assert.match(svg, /<desc id="description">.+<\/desc>/);
    assert.match(svg, /<path\b/);
    assert.doesNotMatch(
      svg,
      /<(?:image|text|script|foreignObject|style|filter|linearGradient|radialGradient)\b|\b(?:href|onload|onclick)=|data:/i,
    );
    for (const [, color] of svg.matchAll(/fill="([^"]+)"/g)) {
      assert.ok(palette.has(color), `${name} uses an unapproved fill: ${color}`);
    }
  }
});

test("full, horizontal and compact logos share the same crescent bowl path", async () => {
  const full = await readSvg("logo-full");
  const bowl = full.match(/<path id="bowl"[^>]* d="([^"]+)"/)?.[1];
  assert.ok(bowl);
  for (const name of svgNames.filter((name) => name !== "logo-wordmark")) {
    assert.ok((await readSvg(name)).includes(`d="${bowl}"`), `${name} changes the bowl geometry`);
  }
});

test("all compact applications share one noodle-check path", async () => {
  const mark = await readSvg("logo-mark");
  const check = mark.match(/<path id="noodle-check"[^>]* d="([^"]+)"/)?.[1];
  assert.ok(check);
  for (const name of ["logo-horizontal", "logo-mark-mono", "app-icon", "favicon"]) {
    assert.ok((await readSvg(name)).includes(`d="${check}"`), `${name} changes the noodle-check`);
  }
});

test("favicon and home-screen raster companions have their advertised dimensions", async () => {
  for (const [name, size] of [
    ["favicon-16", 16],
    ["favicon-32", 32],
    ["app-icon-180", 180],
    ["app-icon-192", 192],
    ["app-icon-512", 512],
  ] as const) {
    const png = await readFile(new URL(`${name}.png`, directory));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    if (name.startsWith("app-icon"))
      assert.equal(png[25], 2, "Home-screen PNGs must be opaque RGB");
  }
});
