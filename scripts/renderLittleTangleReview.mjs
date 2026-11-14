import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const artwork = "public/branding/little-tangle/logo-full.svg";
const output = new URL("public/branding/little-tangle/review/", root);
const current = await readFile(new URL(artwork, root), "utf8");
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
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const scoped = (svg, prefix, viewBox = "0 0 765 560") =>
    svg
      .replace('viewBox="0 0 765 560"', `viewBox="${viewBox}"`)
      .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
      .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`)
      .replace(
        'aria-labelledby="title description"',
        `aria-labelledby="${prefix}-title ${prefix}-description"`,
      );
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
    await nativePage.screenshot({
      path: fileURLToPath(
        new URL(`public/branding/little-tangle/${alternativeName}-${size}.png`, root),
      ),
      omitBackground: true,
    });
  }
  await nativeContext.close();
  const choices = [
    ["Current check/bowl", "favicon-white-sky"],
    ["Noodle-p · recreated study", alternativeName],
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
  await capture(
    "favicon-options.png",
    `<main><figure class="full"><h2>Full logo</h2>${scoped(current, "combo-logo")}</figure><aside class="options">${cards.join("")}</aside></main>`,
    1300,
    660,
    "main{gap:40px}.full svg{width:765px;height:560px}.options{display:flex;gap:24px;padding-top:90px}.card{width:200px}.card h2{font-size:16px;white-space:nowrap}.card svg{width:168px;height:168px;margin:0 auto 28px}section{display:flex;align-items:flex-end;justify-content:center;gap:25px}section div{text-align:center;font-size:12px;color:#667870}section img{display:block;margin:0 auto 9px}",
  );
  console.log(`Rendered direct-SVG 2× review images in ${fileURLToPath(output)}`);
} finally {
  await browser.close();
}
