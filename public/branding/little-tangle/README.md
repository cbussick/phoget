# Little Tangle identity proposal

This is a separate proposal, not an application branding switch. The earlier check-flourish family remains in the parent directory.

- `logo-full.svg`: direct vector contours of the actual Little Tangle reference. Its lettering, chopstick crossings, g/rim relationship and bowl proportions are preserved, rather than interpreted as new geometry. Visible wording is phoget only.
- `logo-mark.svg`: a noodle-check above the same reference bowl, scaled for a compact mark.
- `favicon.svg`: the compact check/bowl in ink on sky blue.
- `favicon-white-sky.svg` and `favicon-white-deep.svg`: warm-white versions on the two app blues. Each favicon colorway has actual 16/32 pixel PNG exports. No default colorway is changed by adding these options.

The full artwork uses three filled vector paths in the reference's native 765 × 560 coordinate frame. Reference shading is flattened to the exact app palette. An ink-only underlap prevents antialias slits at the original crossings; it does not expand the outside lettering silhouette. There are no replacement cap curves or manually repositioned chopsticks.

The bowl's tilt is part of its source contour, not a separate rotation or an approximation with a new ellipse. The same path is used in compact marks. The g has its original visible relationship with this rim; do not turn it into an isolated floating oval.

The source crop is retained at `tests/fixtures/branding/little-tangle-reference.png`. Run `node scripts/worktree.mjs run node scripts/verifyLittleTangleReference.mjs` from the worktree root to compare rendered silhouette overlap globally and around p/h/t against that actual source. The comparison ignores the intentional palette/shading difference and requires at least 96% overlap for the tested color silhouettes. Human review of the visual match still matters.

All SVGs are self-contained vector paths, with no embedded raster images or font dependencies. Accessible titles retain the canonical application name, Don't Phoget. The earlier noodle-p favicon is being shown separately as its original concept image; it has not silently replaced the check/bowl SVG options here.
