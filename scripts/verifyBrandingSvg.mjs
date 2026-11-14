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
  {
    name: "p cap meets the upper stick without a transparent pinhole",
    x: 107,
    y: 74,
    opaque: true,
  },
  {
    name: "h return meets the upper stick without a transparent slit",
    x: 237,
    y: 82,
    opaque: true,
  },
  { name: "h cap meets the upper stick without a transparent slit", x: 255, y: 61, opaque: true },
  {
    name: "g descender restores the part hidden by the reference bowl",
    x: 408,
    y: 394,
    color: sky,
  },
];

// Check the full contact regions, not just a single pixel in each pinhole.
for (const [letter, left, right, top, bottom] of [
  ["p", 98, 109, 90, 99],
  ["h", 236, 256, 80, 90],
]) {
  for (let x = left; x <= right; x++) {
    for (let y = top; y <= bottom; y++) {
      probes.push({ name: `${letter} opaque wrap contact ${x}/${y}`, x, y, opaque: true });
    }
  }
}

probes.push(
  {
    name: "p return stays under the fold instead of extending right",
    x: 117,
    y: 95,
    transparent: true,
  },
  {
    name: "full check sits inside the bowl opening",
    x: 620,
    y: 445,
    color: sky,
    only: "logo-full",
  },
  { name: "full check has a substantial short arm", x: 574, y: 397, color: sky, only: "logo-full" },
);

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
    const checks = probes.filter((probe) => !probe.only || probe.only === name);
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
        return positions.map(({ x, y }) => Array.from(context.getImageData(x, y, 1, 1).data));
      },
      {
        src: `data:image/svg+xml;base64,${svg.toString("base64")}`,
        width,
        height,
        positions: checks.map(({ x, y }) => ({ x: x + offsetX, y })),
      },
    );
    for (let index = 0; index < checks.length; index++) {
      if (checks[index].transparent) {
        assert.ok(
          samples[index][3] <= 5,
          `${name}: ${checks[index].name}; alpha=${samples[index][3]}`,
        );
      } else if (checks[index].opaque) {
        assert.ok(
          samples[index][3] >= 250,
          `${name}: ${checks[index].name}; alpha=${samples[index][3]}`,
        );
      } else {
        assert.ok(
          samples[index]
            .slice(0, 3)
            .every((channel, position) => Math.abs(channel - checks[index].color[position]) <= 2),
          `${name}: ${checks[index].name}; got ${samples[index]}, expected ${checks[index].color}`,
        );
      }
    }
    console.log(`${name}: ${checks.length} lettering and check-placement checks passed`);
  }

  const tangle = await readFile(
    new URL("../public/branding/little-tangle/logo-full.svg", import.meta.url),
  );
  const rimSamples = await page.evaluate(
    async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 765;
      canvas.height = 565;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, 765, 565);
      return [385, 390, 400].map((y) => Array.from(context.getImageData(405, y, 1, 1).data));
    },
    `data:image/svg+xml;base64,${tangle.toString("base64")}`,
  );
  assert.deepEqual(rimSamples[0], [...sky, 255], "The g approaches the rim");
  assert.equal(rimSamples[1][3], 0, "The g recedes at the rim, not as a floating rounded oval");
  assert.deepEqual(rimSamples[2], [23, 111, 159, 255], "The bowl sits directly below the g");
  console.log("Little Tangle: original g/rim interaction checks passed");
} finally {
  await browser.close();
}
