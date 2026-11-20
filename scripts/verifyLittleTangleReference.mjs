import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const candidate = process.argv[2]
  ? resolve(process.argv[2])
  : new URL("../public/branding/little-tangle/logo-full.svg", import.meta.url);
const reference = await readFile(
  new URL("../tests/fixtures/branding/little-tangle-reference.png", import.meta.url),
);
const svg = await readFile(candidate);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const scores = await page.evaluate(
    async ({ reference, candidate }) => {
      const raster = async (src, scale = 1) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 765 * scale;
        canvas.height = 560 * scale;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const source = await raster(reference);
      const output = await raster(candidate);
      const sourceColors = [
        [253, 253, 251],
        [114, 199, 243],
        [12, 44, 36],
        [0, 116, 177],
      ];
      const outputColors = [
        [255, 254, 250],
        [139, 205, 241],
        [24, 48, 43],
        [23, 111, 159],
      ];
      const classify = (pixels, index, colors) => {
        if (pixels[index + 3] < 128) {
          return 0;
        }
        let best = Infinity;
        let category = 0;
        for (let i = 0; i < colors.length; i++) {
          const distance = colors[i].reduce(
            (sum, channel, position) => sum + (channel - pixels[index + position]) ** 2,
            0,
          );
          if (distance < best) {
            best = distance;
            category = i;
          }
        }
        return category;
      };
      const regions = [
        ["full", 0, 0, 765, 560, [1, 2, 3]],
        ["p-wrap", 45, 55, 95, 155, [1, 2]],
        ["h-wrap", 180, 25, 100, 185, [1, 2]],
        ["t-wrap", 595, 0, 120, 185, [1, 2]],
      ];
      const result = [];
      for (const [name, left, top, width, height, categories] of regions) {
        const intersection = [0, 0, 0, 0];
        const union = [0, 0, 0, 0];
        for (let y = top; y < top + height; y++) {
          for (let x = left; x < left + width; x++) {
            const index = (y * 765 + x) * 4;
            let expected = classify(source, index, sourceColors);
            // The source is shaded; blue antialiasing below the rim belongs to the bowl.
            if (expected === 1 && x > 100 && y > 329 + (x - 105) * 0.217) {
              expected = 3;
            }
            const actual = classify(output, index, outputColors);
            for (const category of categories) {
              if (expected === category || actual === category) {
                union[category]++;
              }
              if (expected === category && actual === category) {
                intersection[category]++;
              }
            }
          }
        }
        for (const category of categories) {
          result.push({ name, category, iou: intersection[category] / union[category] });
        }
      }
      const contacts = [
        [110, 90],
        [112, 99],
        [240, 82],
        [242, 89],
        [645, 30],
        [678, 29],
      ].map(([x, y]) => ({
        x,
        y,
        alpha: output[(y * 765 + x) * 4 + 3],
      }));
      const enlarged = await raster(candidate, 4);
      const rearLeft = (y) => {
        for (let x = 90 * 4; x < 115 * 4; x++) {
          const i = (Math.round(y * 4) * 765 * 4 + x) * 4;
          if (enlarged[i + 3] >= 200 && enlarged[i + 1] > 150 && enlarged[i + 2] > 200) {
            return x / 4;
          }
        }
        throw new Error(`Missing p return at y=${y}`);
      };
      const tFoldAlpha =
        enlarged[(Math.floor(25.875 * 4) * 765 * 4 + Math.floor(686.875 * 4)) * 4 + 3];
      return { outlines: result, contacts, pReturnSlant: rearLeft(97) - rearLeft(92), tFoldAlpha };
    },
    {
      reference: `data:image/png;base64,${reference.toString("base64")}`,
      candidate: `data:image/svg+xml;base64,${svg.toString("base64")}`,
    },
  );
  for (const score of scores.outlines) {
    console.log(
      `${String(score.name)}, color ${score.category}: ${(score.iou * 100).toFixed(2)}% silhouette overlap`,
    );
    assert.ok(
      score.iou >= 0.96,
      `${String(score.name)}: the vector contours drifted from the actual reference`,
    );
  }
  for (const contact of scores.contacts) {
    assert.ok(
      contact.alpha >= 250,
      `White seam at ${contact.x}/${contact.y}: alpha ${contact.alpha}`,
    );
  }
  console.log("Chopstick contacts: opaque shared occlusion boundaries passed");
  assert.ok(
    scores.pReturnSlant >= 1.25,
    `p return is a vertical patch, not a slanted ribbon: ${scores.pReturnSlant}px`,
  );
  console.log(`p return: continuous slanted ribbon (${scores.pReturnSlant}px drift)`);
  assert.ok(scores.tFoldAlpha >= 250, `Triangular gap at the t fold: alpha ${scores.tFoldAlpha}`);
  console.log("t fold: no triangular gap at the upper stick");
} finally {
  await browser.close();
}
