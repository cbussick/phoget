import type { CSSProperties } from "react";

const ink = "#18302b";
const white = "#ffffff";
const black = "#000000";

function channels(hex: string) {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

// WCAG sRGB relative luminance and contrast:
// https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function foreground(background: string) {
  if (contrast(ink, background) >= 4.5) return ink;
  return contrast(white, background) >= contrast(black, background) ? white : black;
}

function mix(color: string, target: string, amount: number) {
  const targetChannels = channels(target);
  return (
    "#" +
    channels(color)
      .map((value, index) =>
        Math.round(value * (1 - amount) + targetChannels[index] * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Accepts a validated, opaque #rrggbb color. Styles stay local to one control. */
export function accentColorStyle(
  color: string,
): CSSProperties & Record<`--accent-${string}`, string> {
  // Dark colors lighten on interaction so even black has visible feedback.
  const target = luminance(color) < 0.1 ? white : black;
  const hover = mix(color, target, 0.06);
  const pressed = mix(color, target, 0.14);
  return {
    "--accent-background": color,
    "--accent-foreground": foreground(color),
    "--accent-hover": hover,
    "--accent-hover-text": foreground(hover),
    "--accent-pressed": pressed,
    "--accent-pressed-text": foreground(pressed),
  };
}
