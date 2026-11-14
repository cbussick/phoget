# Little Tangle — selected identity

The approved pair is **`logo-full.svg` + `favicon.svg` (logo-p, warm white on sky blue)**. The task branch now uses this pair in the application header/navigation, login, browser favicon and home-screen icons. Production is unchanged until integration/deployment. The earlier check-flourish family remains in the parent directory as an exploration.

- `logo-full.svg`: reference-derived Little Tangle lettering and bowl, with refined crossings that weave cleanly around the chopsticks. The g/rim relationship and bowl proportions are preserved. Visible wording is phoget only.
- `logo-mark.svg`: the earlier check/bowl compact mark, retained for comparison; not selected.
- `favicon.svg`: the selected logo-p favicon in warm white on sky blue. `favicon-16.png` and `favicon-32.png` are its native raster companions.
- `favicon-noodle-p-white-sky.svg`: the explicitly named variant of the selected favicon, byte-identical to `favicon.svg`. It derives from the wordmark's actual lowercase p, including its looped descender, crown and rear ribbon. Only the outgoing p-to-h join is closed for standalone use; the descender tucks into the shared bowl. Its named 16/32 pixel companions match the default exports.
- `favicon-white-sky.svg` and `favicon-white-deep.svg`: earlier check/bowl colorways, with their 16/32 pixel exports, retained for comparison only.
- `review/selected-identity.png`: the approved logo and logo-p favicon together. `review/favicon-options.png` keeps the earlier check/bowl comparison.

The artwork uses the reference's native 765 × 560 coordinate frame and exact app palette. Lettering away from the crossings and the bowl contour are preserved. The p/h/t folds are extended smoothly into their hidden spans instead of ending as rounded fragments above the sticks.

The p return is a curved, slanted ribbon, not a rectangular bridge. The h return continues smoothly under the upper stick and in front of the lower one. An uninterrupted, gently tapered chopstick profile is reused for backing and foreground occlusion. A reference-derived luminance mask preserves the original front-letter edges without painting the traced ink's corner artifacts back over the revised returns. Black/white mask values are coverage only, not artwork colors.

The rendered verifier checks contact opacity, the p return's actual slant and reference silhouette overlap. These checks supplement human visual review; opaque pixels alone do not establish a convincing weave.

Committed before/after review images are in `review/full-before-after.png` and `review/crossings-before-after.png`, so those comparisons do not depend on surviving `/tmp` files. Their before state is commit `2aa7792`. The small triangular t gap is closed by a curved underlap behind the upper stick, without moving the visible crown. `review/t-seam-before-after.png` compares that repair with commit `23d303f`.

Review PNGs now render inline SVG directly through Chromium's compositor at 2× pixel density. The previous canvas-raster-then-shrink pipeline undersampled antialiasing and made shallow chopstick diagonals look jagged. There is no raster resizing in the new export path. `review/logo-full-2x.png` is the standalone 1530 × 1120 full logo. Regenerate these files with `node scripts/worktree.mjs run node scripts/renderLittleTangleReview.mjs` from the worktree root; the comparison generator needs the recorded baseline commits in local Git history. This command also regenerates the selected logo-p SVG directly from the wordmark, writes both favicon filenames identically, and exports matching named/default 16/32 pixel PNGs. Do not independently redraw that glyph in the generated favicon; adjust its placement in the generator or update the source wordmark intentionally.

The t's outer crown uses one non-inflecting cubic into its hidden span, rather than the short curve reversal that produced a kink. The upper stick ends in a constant-radius semicircle tangent to its top edge, instead of a lumpy traced cap. `review/t-curve-before-after.png` and `review/stick-end-before-after.png` compare those details against commit `d5eee78`.

The bowl's tilt is part of its source contour, not a separate rotation or an approximation with a new ellipse. The same path is used in compact marks. The g has its original visible relationship with this rim; do not turn it into an isolated floating oval.

Run `node scripts/worktree.mjs run node scripts/renderAppIcons.mjs` to update `/icon.svg` and the opaque RGB home-screen PNGs from the selected favicon after regenerating artwork. The document favicon uses the selected asset URLs directly; manifest and Apple icons retain their stable public paths.

The source crop is retained at `tests/fixtures/branding/little-tangle-reference.png`. Run `node scripts/worktree.mjs run node scripts/verifyLittleTangleReference.mjs` from the worktree root to compare rendered silhouette overlap globally and around p/h/t against that actual source. The comparison ignores the intentional palette/shading difference and requires at least 96% overlap for the tested color silhouettes. Human review of the visual match still matters.

All SVGs are self-contained vector paths, with no embedded raster images or font dependencies. Accessible titles retain the canonical application name, Don't Phoget. The full logo and logo-p favicon are selected. Earlier options remain available only for reference. Application integration is implemented on the task branch. Merging and deployment remain separate steps; production has not been changed.
