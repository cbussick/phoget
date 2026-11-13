# Don't Phoget logo assets

Vector artwork for the selected noodle-lettering identity. This is an asset proposal; the existing application logo and UI have not been replaced.

## Variants

| File                  | Intended use                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `logo-full.svg`       | Full composition: login, welcome and loading screens. Based on concept 97; the final `t` becomes the noodle-check. |
| `logo-horizontal.svg` | Header/sidebar: compact bowl-check to the left of the noodle lettering, following concept 15.                      |
| `logo-wordmark.svg`   | Lettering and chopsticks alone.                                                                                    |
| `logo-mark.svg`       | Compact two-color check-and-bowl.                                                                                  |
| `logo-mark-mono.svg`  | The same compact artwork in dark green ink.                                                                        |
| `app-icon.svg`        | High-contrast ink artwork on the app's organic sky-blue tile.                                                      |
| `favicon.svg`         | Larger optical sizing of the compact artwork on a rounded sky-blue tile.                                           |

The PNG files are rendered companions of the app icon (180, 192, 512 pixels) and favicon (16, 32 pixels). Home-screen PNGs are opaque, including their corners.

## Design constraints

- Exact colors from `src/app/tokens.css`: sky `#8bcdf1`, deep blue `#176f9f`, ink `#18302b`.
- Transparent backgrounds on the logos; use on light surfaces. These are not dark-mode/reversed lockups.
- Filled vector paths, including the custom lettering and `don't`: no embedded raster artwork, fonts, external references, gradients or filters.
- One shared crescent-bowl path across every bowl-bearing asset. One shared noodle-check path across compact and horizontal variants. The full logo's check is part of its continuous `t` flourish.
- Each of `p`, `h` and `t` has a hand-built, smooth Bézier front contour wrapping over the upper stick, plus a separate return strand behind it. The `h` return emerges through the gap and crosses in front of the lower stick. Only its identical return contour is repeated across that crossing; there is no mismatched seam. Do not replace this with a word-wide layer swap.
- The three front contours are not clipped at the chopsticks. Their cap contacts follow the upper stick's edge; traced ascender fragments are removed only in the lettering-body layer. Keep overlaps at the body joins to prevent slivers or squared-off cuts.
- The horizontal wordmark preserves the full logo's letterforms, with a shortened, rounded `t` terminal instead of the long flourish.
- The high-contrast app and favicon treatments intentionally use ink for both shapes, rather than a low-contrast white mark on sky blue.

Use a single appropriate variant per placement. Do not shrink the full lettering into a favicon. Keep the logo stable on loading screens; any progress indicator belongs outside the artwork.

Check the actual wrap rendering with `node scripts/worktree.mjs run node scripts/verifyBrandingSvg.mjs` from the worktree root (requires the Playwright Chromium browser). This covers front/back occlusion and continuous noodle bands in all three lettering layouts. Enlarged visual inspection is still needed to judge the curve quality.

The SVGs are the editable source of truth. The artwork was vectorized from the selected visual concepts, cleaned into flat paths, and normalized to the app palette. Review the small-size exports before integrating; asset tests validate structure and consistency, not brand recognition or subjective legibility.
