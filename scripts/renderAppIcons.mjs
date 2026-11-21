import { readFile, writeFile } from "node:fs/promises";
import { crc32, deflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const chunk = (type, data) => {
  const tag = Buffer.from(type);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  tag.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([tag, data])), 8 + data.length);
  return result;
};

const publicDir = new URL("../public/", import.meta.url);
const svg = await readFile(new URL("branding/little-tangle/favicon.svg", publicDir));
await writeFile(new URL("icon.svg", publicDir), svg);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [name, size] of [
    ["apple-touch-icon", 180],
    ["icon-192", 192],
    ["icon-512", 512],
  ]) {
    const pixels = await page.evaluate(
      async ({ source, size }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d");
        context.fillStyle = "#8bcdf1";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        return Array.from(context.getImageData(0, 0, size, size).data);
      },
      { source: `data:image/svg+xml;base64,${svg.toString("base64")}`, size },
    );
    // Encode RGB PNGs, not alpha PNGs: iOS must not fill transparent corners black.
    const raw = Buffer.alloc((size * 3 + 1) * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const from = (y * size + x) * 4;
        const to = y * (size * 3 + 1) + 1 + x * 3;
        raw[to] = pixels[from];
        raw[to + 1] = pixels[from + 1];
        raw[to + 2] = pixels[from + 2];
      }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(size, 0);
    header.writeUInt32BE(size, 4);
    header[8] = 8;
    header[9] = 2;
    await writeFile(
      new URL(`${name}.png`, publicDir),
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(raw)),
        chunk("IEND", Buffer.alloc(0)),
      ]),
    );
  }
} finally {
  await browser.close();
}
