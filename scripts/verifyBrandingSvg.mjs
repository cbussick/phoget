import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

// Coordinates belong to the original Little Tangle lettering, not the discarded redraw.
const sky = [139, 205, 241];
const ink = [24, 48, 43];
const probes = [
  { name: "p front crosses both sticks", x: 75, y: 100, color: sky },
  { name: "p return appears between the sticks", x: 110, y: 95, color: sky },
  { name: "upper stick hides the p return", x: 110, y: 84, color: ink },
  { name: "h front retains its tall loop", x: 204, y: 100, color: sky },
  { name: "upper stick hides the h return", x: 240, y: 75, color: ink },
  { name: "h return appears in the gap", x: 245, y: 87, color: sky },
  { name: "h return passes in front of the lower stick", x: 241, y: 106, color: sky },
  { name: "t front has no chopstick-sized gap", x: 640, y: 80, color: sky },
  { name: "t cap retains the original drape", x: 667, y: 25, color: sky },
  { name: "upper stick continues behind the t drape", x: 710, y: 35, color: ink },
];

const bands = {
  p: [
    [78, 195],
    [72, 150],
    [70, 115],
    [75, 85],
    [89, 70],
  ],
  h: [
    [204, 180],
    [203, 140],
    [203, 105],
    [203, 80],
    [207, 61],
    [218, 49],
    [235, 51],
  ],
  t: [
    [635, 170],
    [640, 130],
    [645, 90],
    [652, 55],
    [662, 33],
    [672, 25],
  ],
};
for (const [letter, points] of Object.entries(bands)) {
  for (let segment = 1; segment < points.length; segment++) {
    const start = points[segment - 1];
    const end = points[segment];
    for (let step = 0; step <= 12; step++) {
      for (const offsetX of [-1, 0, 1]) {
        for (const offsetY of [-1, 0, 1]) {
          probes.push({
            name: `${letter} continuous band ${segment}/${step}/${offsetX}/${offsetY}`,
            x: Math.round(start[0] + ((end[0] - start[0]) * step) / 12 + offsetX),
            y: Math.round(start[1] + ((end[1] - start[1]) * step) / 12 + offsetY),
            color: sky,
          });
        }
      }
    }
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [name, width, height, offsetX] of [
    ["logo-full", 800, 580, 0],
    ["logo-wordmark", 765, 405, 0],
    ["logo-horizontal", 1080, 430, 300],
  ]) {
    const svg = await readFile(new URL(`../public/branding/${name}.svg`, import.meta.url));
    const samples = await page.evaluate(
      async ({ src, width, height, positions }) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        return positions.map(({ x, y }) =>
          Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3),
        );
      },
      {
        src: `data:image/svg+xml;base64,${svg.toString("base64")}`,
        width,
        height,
        positions: probes.map(({ x, y }) => ({ x: x + offsetX, y })),
      },
    );
    for (let index = 0; index < probes.length; index++) {
      assert.ok(
        samples[index].every(
          (channel, position) => Math.abs(channel - probes[index].color[position]) <= 2,
        ),
        `${name}: ${probes[index].name}; got ${samples[index]}, expected ${probes[index].color}`,
      );
    }
    console.log(`${name}: ${probes.length} original-lettering wrap checks passed`);
  }
} finally {
  await browser.close();
}
