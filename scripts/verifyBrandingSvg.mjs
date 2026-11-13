import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const sky = [139, 205, 241];
const ink = [24, 48, 43];
const probes = [
  { name: "p front strand crosses the sticks continuously", x: 145, y: 215, color: sky },
  { name: "p return is visible between the sticks", x: 234, y: 216, color: sky },
  { name: "the upper stick occludes the p return", x: 232, y: 202, color: ink },
  { name: "h front strand crosses the sticks continuously", x: 313, y: 220, color: sky },
  { name: "h return comes through the sticks", x: 350, y: 225, color: sky },
  { name: "t front strand has no chopstick-sized gap", x: 775, y: 180, color: sky },
  { name: "t return is visible between the sticks", x: 828, y: 160, color: sky },
  { name: "the upper stick occludes the t return", x: 832, y: 140, color: ink },
];

// Sample a narrow band along each intended continuous front/return strand.
// Unlike a paint-order assertion, these detect white slivers and hidden sections.
const bands = {
  p: [
    [151, 350],
    [145, 300],
    [145, 250],
    [150, 220],
    [164, 193],
    [184, 176],
    [210, 175],
  ],
  h: [
    [297, 320],
    [299, 270],
    [308, 218],
    [320, 186],
    [337, 162],
    [358, 156],
  ],
  hReturn: [
    [376, 211],
    [365, 224],
    [350, 244],
    [331, 264],
    [313, 282],
  ],
  t: [
    [769, 290],
    [770, 250],
    [774, 210],
    [780, 175],
    [791, 145],
    [809, 122],
    [830, 116],
  ],
};
for (const [letter, points] of Object.entries(bands)) {
  for (let segment = 1; segment < points.length; segment++) {
    const start = points[segment - 1];
    const end = points[segment];
    for (let step = 0; step <= 12; step++) {
      for (const offsetX of [-2, 0, 2]) {
        for (const offsetY of [-2, 0, 2]) {
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
probes.push(
  { name: "p front/body join has no cut", x: 145, y: 352, color: sky },
  { name: "h return/shoulder join has no sliver", x: 333, y: 281, color: sky },
  { name: "t inner contour has no clipped step", x: 785, y: 272, color: sky },
);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [name, width, height, offsetX, offsetY] of [
    ["logo-full", 940, 780, 0, 0],
    ["logo-wordmark", 910, 560, -15, -15],
    ["logo-horizontal", 1240, 580, 300, 0],
  ]) {
    const svg = await readFile(new URL(`../public/branding/${name}.svg`, import.meta.url));
    const samples = await page.evaluate(
      async ({ src, width, height, positions }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, width, height);
        return positions.map(({ x, y }) =>
          Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3),
        );
      },
      {
        src: `data:image/svg+xml;base64,${svg.toString("base64")}`,
        width,
        height,
        positions: probes.map(({ x, y }) => ({ x: x + offsetX, y: y + offsetY })),
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
    console.log(`${name}: ${probes.length} rendered wrap/occlusion checks passed`);
  }
} finally {
  await browser.close();
}
