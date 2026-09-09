# Dependencies

Dependencies are pinned in `package-lock.json`. npm lifecycle scripts are disabled by `.npmrc`; no dependency script approval is required for the tested install. Native optional packages provide the build tools on the supported platform. Use `npm ci` to reproduce the install.

The application uses React, TanStack Query, Zod, Express, Helmet, Drizzle, node-postgres, and the OFL-licensed Nunito font. The rest are development, lint, format, and test tools. Fontsource includes the font's license in its package.

The production dependency audit has no known vulnerabilities at implementation time. Registry signatures and available attestations were verified with `npm audit signatures`.

The full development audit reports four moderate entries from one older esbuild dependency under Drizzle Kit's legacy loader. The [advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) concerns esbuild's development HTTP server. Phoget uses this dependency only to load the migration generator; it never runs that server. Vite and tsx use their own newer build dependencies. The affected code is not shipped in production dependencies. No forced downgrade or untested dependency override was applied. Review the Drizzle Kit dependency again by 2026-12-01.

Browser code is split into app/query, React, and validation chunks for cache reuse, using [Rolldown's code splitting configuration](https://rolldown.rs/reference/OutputOptions.codeSplitting).
