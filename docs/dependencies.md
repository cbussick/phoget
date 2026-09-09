# Dependencies

Dependencies are pinned in `package-lock.json`. npm lifecycle scripts are disabled by `.npmrc`; no dependency script approval is required for the tested install. Native optional packages provide the build tools on the supported platform. Use `npm ci` to reproduce the install.

The application uses React, TanStack Query, TanStack Form, React Aria Components 1.21.1 (Apache-2.0), Zod, Express, Helmet, Drizzle, node-postgres, and the OFL-licensed Nunito font. The rest are development, lint, format, and test tools. Fontsource includes the font's license in its package.

Icons are copied inline SVG in `src/shared/ui/Icon/Icon.tsx`, not icon-library dependencies. The artwork comes from Lucide 1.43.0, Lucide Lab 0.2.0 (bowl/chopsticks), and the user-supplied Tabler Needle Thread SVG. There is no icon font or network icon fetch. Alternative catalogs considered: [Tabler](https://tabler.io/icons) for breadth, [Phosphor](https://phosphoricons.com/) for multiple weights, and [Heroicons](https://heroicons.com/) for a smaller UI-focused set. Lucide best matches the requested named symbols and Phoget's outline styling. Required Lucide ISC, Feather MIT, Lucide Lab ISC, and Tabler MIT notices are preserved in `public/third-party-icons.txt`, which Vite copies into production builds. No attribution is displayed in the UI.

The production dependency audit has no known vulnerabilities at implementation time. Registry signatures and available attestations were verified with `npm audit signatures`.

The full development audit reports four moderate entries from one older esbuild dependency under Drizzle Kit's legacy loader. The [advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) concerns esbuild's development HTTP server. Phoget uses this dependency only to load the schema setup tool; it never runs that server. Vite and tsx use their own newer build dependencies. The affected code is not shipped in production dependencies. No forced downgrade or untested dependency override was applied. Review the Drizzle Kit dependency again by 2026-12-01.

The color spectrum uses React Aria's public subpath imports, loaded on demand (~33.5 kB gzip) so the picker implementation is not in the initial app bundle. Phoget supplies all visible CSS and German labels/localization; the color controls do not require injected stylesheets or weakening the production CSP.

Browser code is split into app/query, React, and validation chunks for cache reuse, using [Rolldown's code splitting configuration](https://rolldown.rs/reference/OutputOptions.codeSplitting).

Storybook 10.5.10 (matching FeBOp) uses the React/Vite framework, the accessibility addon, and the maintained pseudo-states addon. It is a development-only component workshop and is not served by Express. See [React/Vite setup](https://storybook.js.org/docs/get-started/frameworks/react-vite).
