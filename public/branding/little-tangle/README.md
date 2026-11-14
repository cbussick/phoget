# Little Tangle identity proposal

This is a separate proposal, not an application branding switch. The earlier check-flourish family remains in the parent directory.

- `logo-full.svg`: direct vector contours of the actual Little Tangle reference. Its lettering, chopstick crossings, g/rim relationship and bowl proportions are preserved, rather than interpreted as new geometry. Visible wording is phoget only.
- `logo-mark.svg`: a noodle-check above the same reference bowl, scaled for a compact mark.
- `favicon.svg`: the compact check/bowl in ink on sky blue.
- `favicon-white-sky.svg` and `favicon-white-deep.svg`: warm-white versions on the two app blues. Each favicon colorway has actual 16/32 pixel PNG exports. No default colorway is changed by adding these options.

The full artwork retains the original lettering, visible ink and bowl contours in the reference's native 765 × 560 coordinate frame. Reference shading is flattened to the exact app palette. The main lettering contour is unchanged by the contact cleanup: there are no replacement cap curves.

Chopsticks are continuous behind the lettering. Their uninterrupted profile is reconstructed from the reference's visible outside edges, bridging the obscured spans. Short rear-noodle continuations run underneath that profile; the same profile is reused as the foreground occluder at rear crossings. The ends therefore disappear along the actual stick edge rather than as separately rounded fragments, with no transparent seam between adjacent color fields. The rendered verifier checks contact opacity in addition to reference silhouette overlap.

The bowl's tilt is part of its source contour, not a separate rotation or an approximation with a new ellipse. The same path is used in compact marks. The g has its original visible relationship with this rim; do not turn it into an isolated floating oval.

The source crop is retained at `tests/fixtures/branding/little-tangle-reference.png`. Run `node scripts/worktree.mjs run node scripts/verifyLittleTangleReference.mjs` from the worktree root to compare rendered silhouette overlap globally and around p/h/t against that actual source. The comparison ignores the intentional palette/shading difference and requires at least 96% overlap for the tested color silhouettes. Human review of the visual match still matters.

All SVGs are self-contained vector paths, with no embedded raster images or font dependencies. Accessible titles retain the canonical application name, Don't Phoget. The earlier noodle-p favicon remains a contender, shown separately as its original concept image. It has not silently replaced the check/bowl SVG options here; no favicon direction has been finalized.
