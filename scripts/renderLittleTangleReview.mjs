import { logger } from "../shared/logging.ts";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const artwork = "public/branding/little-tangle/logo-full.svg";
const output = new URL("public/branding/little-tangle/review/", root);
const current = await readFile(new URL(artwork, root), "utf8");
// Navigation keeps the approved wraps, without the bowl or its occluded g cutoff.
const clippedG =
  "C 372.064 381.133, 372.061 381.131, 400.500 386.950 C 414.250 389.763, 426.407 392.258, 427.516 392.493 C 430.523 393.131, 443.005 385.814, 450.117 379.244";
const roundedG = "C 372.064 381.133, 388 397, 406 397 C 422 397, 437 390, 450.117 379.244";
if (!current.includes(clippedG)) {
  throw new Error("Review the exposed g terminal before regenerating the navigation wordmark.");
}
const wordmark = current
  .replace('viewBox="0 0 765 560"', 'viewBox="0 0 765 410"')
  .replace(
    /<title id="title">[^<]+<\/title>/,
    '<title id="title">Don\'t Phoget — navigation wordmark</title>',
  )
  .replace(
    /<desc id="description">[^<]+<\/desc>/,
    '<desc id="description">The approved noodle lettering and chopstick wraps without the bowl, cropped for navigation. The exposed g terminal is rounded where the bowl previously occluded it.</desc>',
  )
  .replace(/<path id="tangle-bowl"[^>]*\/>/, "")
  .replace(clippedG, roundedG);
await writeFile(new URL("public/branding/little-tangle/logo-wordmark.svg", root), wordmark);

// Derive the selected favicon from the actual connected wordmark, not a new p drawing.
const lettering = current.match(/id="noodle-lettering"[^>]*d="([^"]+)"/)?.[1];
const pStart = lettering?.indexOf("C 178.283 190.755") ?? -1;
const pEnd = lettering?.indexOf(" C 163.932 251.576", pStart) ?? -1;
const descender = lettering?.match(/M 61\.867 255\.770[\s\S]*?(?= M |$)/)?.[0].trim();
const rear = current.match(/id="p-rear-ribbon"[^>]*d="([^"]+)"/)?.[1];
const bowl = current.match(/id="tangle-bowl"[^>]*d="([^"]+)"/)?.[1];
if (pStart < 0 || pEnd <= pStart || !descender || !rear || !bowl) {
  throw new Error(
    "The source p contours changed; review the extraction before regenerating the favicon.",
  );
}
// Only close the outgoing p-to-h connector. Keep the p's curves and counter intact.
const pOutline = `M177.824 202.183 ${lettering.slice(pStart, pEnd)} C163.932 251.576 177 236.2 177.824 202.183Z ${descender}Z`;
const logoPIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-labelledby="title description">
  <title id="title">phoget — selected logo-p favicon</title>
  <desc id="description">The full wordmark's lowercase p, including its looped descender and rear noodle strand, lifted by chopsticks above the shared tilted bowl. The outgoing connection to h is closed for standalone use. Selected identity in warm white on sky blue; application integration is a separate step.</desc>
  <rect width="256" height="256" rx="56" fill="#8bcdf1"/>
  <g transform="translate(80 -7) scale(.5)" fill="#fffefa"><path id="p-rear-ribbon" d="${rear}"/></g>
  <path fill="none" stroke="#fffefa" stroke-width="7" stroke-linecap="round" d="M50 41.5L211 28M50 52.5L211 44.5"/>
  <g transform="translate(80 -7) scale(.5)"><path id="logo-p" fill="#fffefa" fill-rule="evenodd" d="${pOutline}"/></g>
  <g transform="translate(16 32) scale(.36)"><path id="tangle-bowl" fill="#fffefa" fill-rule="evenodd" d="${bowl}"/></g>
</svg>
`;
await Promise.all(
  ["favicon-noodle-p-white-sky", "favicon"].map((name) =>
    writeFile(new URL(`public/branding/little-tangle/${name}.svg`, root), logoPIcon),
  ),
);
const revision = (commit) =>
  execFileSync("git", ["show", `${commit}:${artwork}`], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
  });
const before = revision("2aa7792");
const beforeSeamFix = revision("23d303f");
const beforeCurveFix = revision("d5eee78");
await mkdir(output, { recursive: true });

// Render vectors through the browser compositor at the final pixel density.
// Do not draw an SVG into a canvas and then shrink that raster: default canvas
// filtering undersamples the antialiasing on shallow diagonal chopstick edges.
const scoped = (svg, prefix, viewBox = "0 0 765 560") =>
  svg
    .replace('viewBox="0 0 765 560"', `viewBox="${viewBox}"`)
    .replaceAll(/id="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
    .replaceAll(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`)
    .replace(
      'aria-labelledby="title description"',
      `aria-labelledby="${prefix}-title ${prefix}-description"`,
    );

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const capture = async (name, html, width, height, extraCss = "") => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<style>
      *{box-sizing:border-box}body{margin:0;background:#fffefa;color:#18302b;font-family:Arial,sans-serif}
      main{display:flex;gap:24px;padding:24px}figure{margin:0}h2{font-size:24px;line-height:32px;font-weight:400;text-align:center;margin:0 0 16px}
      svg{display:block} .crossing{margin-bottom:24px} .crossing:last-child{margin-bottom:0}
      ${extraCss}
    </style>${html}`);
    await page.screenshot({ path: fileURLToPath(new URL(name, output)) });
  };
  const panels = (sources, viewBox) =>
    `<main>${sources.map(([label, svg], i) => `<figure><h2>${label}</h2>${scoped(svg, `panel-${i}`, viewBox)}</figure>`).join("")}</main>`;
  await capture(
    "full-before-after.png",
    panels([
      ["Before", before],
      ["After", current],
    ]),
    1602,
    656,
    "svg{width:765px;height:560px}",
  );
  const regions = ["40 50 115 115", "175 20 115 115", "605 0 115 115"];
  const details = `<main>${[
    ["Before", before],
    ["After", current],
  ]
    .map(
      ([label, svg], i) =>
        `<figure><h2>${label}</h2>${regions.map((box, j) => `<div class="crossing">${scoped(svg, `detail-${i}-${j}`, box)}</div>`).join("")}</figure>`,
    )
    .join("")}</main>`;
  await capture("crossings-before-after.png", details, 762, 1179, "svg{width:345px;height:345px}");
  await capture(
    "t-seam-before-after.png",
    panels(
      [
        ["Before", beforeSeamFix],
        ["After", current],
      ],
      "660 17 40 25",
    ),
    1192,
    446,
    "svg{width:560px;height:350px}",
  );
  for (const [name, box, width, height] of [
    ["t-curve-before-after.png", "660 17 40 25", 560, 350],
    ["stick-end-before-after.png", "718 16 36 38", 360, 380],
  ]) {
    await capture(
      name,
      panels(
        [
          ["Before", beforeCurveFix],
          ["After", current],
        ],
        box,
      ),
      width * 2 + 72,
      height + 96,
      `svg{width:${width}px;height:${height}px}`,
    );
  }
  await capture(
    "logo-full-2x.png",
    scoped(current, "single"),
    765,
    560,
    "svg{width:765px;height:560px}",
  );
  await capture(
    "navigation-wordmark.png",
    scoped(wordmark, "navigation"),
    765,
    410,
    "svg{width:765px;height:410px}",
  );
  const alternativeName = "favicon-noodle-p-white-sky";
  const alternative = await readFile(
    new URL(`public/branding/little-tangle/${alternativeName}.svg`, root),
    "utf8",
  );
  const nativeContext = await browser.newContext({ deviceScaleFactor: 1 });
  const nativePage = await nativeContext.newPage();
  for (const size of [16, 32]) {
    await nativePage.setViewportSize({ width: size, height: size });
    await nativePage.setContent(
      `<style>body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${alternative}`,
    );
    const png = await nativePage.screenshot({
      path: fileURLToPath(
        new URL(`public/branding/little-tangle/${alternativeName}-${size}.png`, root),
      ),
      omitBackground: true,
    });
    await writeFile(new URL(`public/branding/little-tangle/favicon-${size}.png`, root), png);
  }
  await nativeContext.close();
  const choices = [
    ["Previous check/bowl", "favicon-white-sky"],
    ["Logo-p · selected", alternativeName],
  ];
  const cards = await Promise.all(
    choices.map(async ([label, name], i) => {
      const icon = await readFile(
        new URL(`public/branding/little-tangle/${name}.svg`, root),
        "utf8",
      );
      const sizes = await Promise.all(
        [16, 32].map(async (size) => {
          const png = await readFile(
            new URL(`public/branding/little-tangle/${name}-${size}.png`, root),
          );
          return `<div><img src="data:image/png;base64,${png.toString("base64")}" width="${size}" height="${size}">${size} px</div>`;
        }),
      );
      return `<figure class="card"><h2>${label}</h2>${scoped(icon, `choice-${i}`)}<section>${sizes.join("")}</section></figure>`;
    }),
  );
  const optionStyles =
    "main{gap:40px}.full svg{width:765px;height:560px}.options{display:flex;gap:24px;padding-top:90px}.card{width:200px}.card h2{font-size:16px;white-space:nowrap}.card svg{width:168px;height:168px;margin:0 auto 28px}section{display:flex;align-items:flex-end;justify-content:center;gap:25px}section div{text-align:center;font-size:12px;color:#667870}section img{display:block;margin:0 auto 9px}";
  await capture(
    "favicon-options.png",
    `<main><figure class="full"><h2>Full logo</h2>${scoped(current, "combo-logo")}</figure><aside class="options">${cards.join("")}</aside></main>`,
    1300,
    660,
    optionStyles,
  );
  await capture(
    "selected-identity.png",
    `<main><figure class="full"><h2>Selected full logo</h2>${scoped(current, "selected-logo")}</figure><aside class="options">${cards[1]}</aside></main>`,
    1080,
    660,
    optionStyles,
  );
  logger.log(`Rendered direct-SVG 2× review images in ${fileURLToPath(output)}`);
} finally {
  await browser.close();
}
