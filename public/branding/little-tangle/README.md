# Little Tangle identity proposal

This is a separate proposal, not an application branding switch. The earlier check-flourish family remains in the parent directory.

- `logo-full.svg`: reference-derived Little Tangle lettering and bowl, with refined crossings that weave cleanly around the chopsticks. The g/rim relationship and bowl proportions are preserved. Visible wording is phoget only.
- `logo-mark.svg`: a noodle-check above the same reference bowl, scaled for a compact mark.
- `favicon.svg`: the compact check/bowl in ink on sky blue.
- `favicon-white-sky.svg` and `favicon-white-deep.svg`: warm-white versions on the two app blues. Each favicon colorway has actual 16/32 pixel PNG exports. No default colorway is changed by adding these options.

The artwork uses the reference's native 765 × 560 coordinate frame and exact app palette. Lettering away from the crossings and the bowl contour are preserved. The p/h/t folds are extended smoothly into their hidden spans instead of ending as rounded fragments above the sticks.

The p return is a curved, slanted ribbon, not a rectangular bridge. The h return continues smoothly under the upper stick and in front of the lower one. An uninterrupted, gently tapered chopstick profile is reused for backing and foreground occlusion. A reference-derived luminance mask preserves the original front-letter edges without painting the traced ink's corner artifacts back over the revised returns. Black/white mask values are coverage only, not artwork colors.

The rendered verifier checks contact opacity, the p return's actual slant and reference silhouette overlap. These checks supplement human visual review; opaque pixels alone do not establish a convincing weave.

Committed before/after review images are in `review/full-before-after.png` and `review/crossings-before-after.png`, so those comparisons do not depend on surviving `/tmp` files. Their before state is commit `2aa7792`.

The bowl's tilt is part of its source contour, not a separate rotation or an approximation with a new ellipse. The same path is used in compact marks. The g has its original visible relationship with this rim; do not turn it into an isolated floating oval.

The source crop is retained at `tests/fixtures/branding/little-tangle-reference.png`. Run `node scripts/worktree.mjs run node scripts/verifyLittleTangleReference.mjs` from the worktree root to compare rendered silhouette overlap globally and around p/h/t against that actual source. The comparison ignores the intentional palette/shading difference and requires at least 96% overlap for the tested color silhouettes. Human review of the visual match still matters.

All SVGs are self-contained vector paths, with no embedded raster images or font dependencies. Accessible titles retain the canonical application name, Don't Phoget. The earlier noodle-p favicon remains a contender, shown separately as its original concept image. It has not silently replaced the check/bowl SVG options here; no favicon direction has been finalized.
