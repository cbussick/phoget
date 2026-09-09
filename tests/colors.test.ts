import { test } from "node:test";
import assert from "node:assert/strict";
import { hexColorSchema, DEFAULT_LIST_COLOR } from "../shared/colors.js";
import { listInputSchema, listUpdateSchema } from "../shared/contracts.js";
import { accentColorStyle } from "../src/shared/ui/accentColor.js";

function luminance(hex: string) {
  const rgb = Number.parseInt(hex.slice(1), 16);
  const linear = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255].map((byte) => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("color contracts accept only six-digit opaque hex, normalize case, and default only on creation", () => {
  assert.equal(hexColorSchema.parse("#ABCDEF"), "#abcdef");
  for (const value of [
    "",
    "red",
    "#fff",
    "#ffffffff",
    "#gggggg",
    "#123456\n",
    "transparent",
    "url(https://example.com)",
    null,
    123,
  ]) {
    assert.equal(hexColorSchema.safeParse(value).success, false, String(value));
  }
  assert.equal(listInputSchema.parse({ name: "New" }).color, DEFAULT_LIST_COLOR);
  assert.equal(listUpdateSchema.parse({ name: "Rename" }).color, undefined);
});

test("custom colors have readable normal, hover and pressed text throughout the RGB space", () => {
  // Sample the full RGB cube, including black, white and near contrast crossover grays.
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const color =
          "#" + [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
        const style = accentColorStyle(color);
        assert.equal(style["--accent-background"], color);
        for (const [background, foreground] of [
          ["--accent-background", "--accent-foreground"],
          ["--accent-hover", "--accent-hover-text"],
          ["--accent-pressed", "--accent-pressed-text"],
        ] as const) {
          assert.ok(
            contrast(style[background], style[foreground]) >= 4.5,
            color + " " + background,
          );
        }
        assert.notEqual(style["--accent-hover"], color);
        assert.notEqual(style["--accent-pressed"], style["--accent-hover"]);
      }
    }
  }
});
