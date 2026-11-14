# Don't Phoget logo assets

## Selected identity

Use [`little-tangle/logo-full.svg`](little-tangle/logo-full.svg) with [`little-tangle/favicon.svg`](little-tangle/favicon.svg): the approved Little Tangle wordmark/bowl and logo-p favicon in warm white on sky blue. See [the selected asset set](little-tangle/README.md) and [the paired review image](little-tangle/review/selected-identity.png).

This selects artwork only; the existing application logo and UI have not been replaced. Merging and deployment require separate authorization.

## Earlier explorations — not selected

The root-level files below are retained for reference. Do not mix their check-flourish/crescent artwork into the selected Little Tangle identity.

### Variants

| File                  | Intended use                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `logo-full.svg`       | Login, welcome and loading: original Little Tangle lettering with concept 97's `t`-check and crescent composition. |
| `logo-horizontal.svg` | Header/sidebar: compact bowl-check to the left of the noodle lettering, following concept 15.                      |
| `logo-wordmark.svg`   | Lettering and chopsticks alone.                                                                                    |
| `logo-mark.svg`       | Compact two-color check-and-bowl.                                                                                  |
| `logo-mark-mono.svg`  | The same compact artwork in dark green ink.                                                                        |
| `app-icon.svg`        | High-contrast ink artwork on the app's organic sky-blue tile.                                                      |
| `favicon.svg`         | Larger optical sizing of the compact artwork on a rounded sky-blue tile.                                           |

The PNG files are rendered companions of the app icon (180, 192, 512 pixels) and favicon (16, 32 pixels). Home-screen PNGs are opaque, including their corners.

### Constraints of the earlier exploration

- Exact colors from `src/app/tokens.css`: sky `#8bcdf1`, deep blue `#176f9f`, ink `#18302b`.
- Transparent backgrounds on the logos; use on light surfaces. These are not dark-mode/reversed lockups.
- The visible lettering is **phoget only**; there is no `don't` above it. Accessible SVG titles retain the canonical application name.
- Vector paths with no embedded raster artwork, fonts, external references, gradients or filters.
- One shared crescent-bowl path across every bowl-bearing asset. One shared noodle-check path across compact and horizontal variants. The full logo's check is part of its continuous `t` flourish.
- The lettering is vectorized directly from the **original Little Tangle reference (8)**, not from the discarded heavier redraw. Preserve its lighter proportions, tall open `h` loop, `p` and `t` drapes, and slim chopsticks.
- The `p` and `h` caps are continuous curved ribbon contours, replacing the earlier contact patches. Their front and back contours are shared across all lettering layouts. Only the old traced cap fragments are hidden in the lettering-body layer; the new front curves are not clipped at the rail contacts. Internal back-face underlaps prevent antialias slivers without altering the visible outline.
- The `p` return is part of one continuous fold sharing the front cap's attachment points, rather than an independently positioned strip. Its narrower back face continues directly under the upper rail.
- The `h` return emerges through the gap and in front of the lower stick. Its shared return contour is revealed below a boundary inside the open rail gap, not at a visible curve edge.
- The reference bowl obscured the bottom of the `g`. Its shared descender is reconstructed as a rounded curve, rather than preserving the raster reference's cut-off diagonal edge.
- The horizontal and lettering-only variants share exactly the same wordmark body path and cap contours. The full variant changes only the final `t` terminal into a continuous outlined check-flourish; it does not redraw the other letter bodies.
- The full composition uses a thicker check with its elbow centred inside the crescent's opening, rather than a thin check floating above the bowl.
- The high-contrast app and favicon treatments intentionally use ink for both shapes, rather than a low-contrast white mark on sky blue.

Use a single appropriate variant per placement. Do not shrink the full lettering into a favicon. Keep the logo stable on loading screens; any progress indicator belongs outside the artwork.

Check the actual wrap rendering with `node scripts/worktree.mjs run node scripts/verifyBrandingSvg.mjs` from the worktree root (requires the Playwright Chromium browser). This covers front/back occlusion, continuous noodle bands, opacity throughout the repaired p/h contact areas, and the restored g descender in all three lettering layouts. Enlarged visual inspection is still needed to judge the curve quality.

The SVGs are the editable source of truth. The artwork was vectorized from the selected visual concepts, cleaned into flat paths, and normalized to the app palette. Review the small-size exports before integrating; asset tests validate structure and consistency, not brand recognition or subjective legibility.
