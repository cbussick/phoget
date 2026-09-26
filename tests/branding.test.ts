import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inflateSync } from "node:zlib";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Don't Phoget has consistent document and home-screen branding", async () => {
  const html = await read("index.html");
  const manifest = JSON.parse(await read("public/site.webmanifest"));
  assert.match(html, /<title>Don't Phoget<\/title>/);
  assert.match(
    html,
    /<link rel="icon" href="\/icon-192.png" type="image\/png" sizes="192x192" \/>/,
  );
  // Safari uses the SVG favicon for Favorites on the Start Page (not just the tab).
  assert.match(html, /<link rel="icon" href="\/icon.svg" type="image\/svg\+xml" \/>/);
  await readFile(new URL("../public/icon.svg", import.meta.url));
  assert.match(html, /href="\/apple-touch-icon.png"/);
  assert.match(html, /href="\/site.webmanifest"/);
  assert.equal(manifest.name, "Don't Phoget");
  assert.equal(manifest.short_name, "Don't Phoget");
  for (const icon of manifest.icons) {
    await readFile(new URL(`../public${icon.src}`, import.meta.url));
  }
});

test("navigation uses the canonical icon and the app's blue palette", async () => {
  const shell = await read("src/app/AppShell.tsx");
  const svg = await read("public/icon.svg");
  const tokens = await read("src/app/tokens.css");
  assert.match(shell, /<img src="\/icon.svg" alt=""/);
  for (const color of ["#176f9f", "#8bcdf1"]) {
    assert.ok(svg.includes(color));
    assert.ok(tokens.includes(color));
  }
});

test("iOS home-screen icon has an opaque light-blue background", async () => {
  const png = await readFile(new URL("../public/apple-touch-icon.png", import.meta.url));
  // RGB (type 2) has no alpha channel for iOS to fill with black.
  assert.equal(png[25], 2);
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  // PNG's first pixel has no left or upper neighbor, regardless of its row filter.
  assert.deepEqual(inflateSync(Buffer.concat(chunks)).subarray(1, 4), Buffer.from([139, 205, 241]));
});

test("home-screen PNG exports have the expected dimensions", async () => {
  for (const [name, size] of [
    ["apple-touch-icon", 180],
    ["icon-192", 192],
    ["icon-512", 512],
  ] as const) {
    const png = await readFile(new URL(`../public/${name}.png`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});
