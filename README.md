# phoget

A shared household list app with German UI, user accounts, customizable lists, and synced updates.
Built with React, TypeScript, Express, and PostgreSQL.

## Run locally

Requires Node 24+, npm 11, and Docker Compose.

```sh
npm ci
node scripts/worktree.mjs bootstrap
node scripts/worktree.mjs run npm run db:setup
node scripts/worktree.mjs run npm run account:setup
node scripts/worktree.mjs run npm run dev
```

Open the printed development URL. Account setup creates the first administrator.
Optional demo data: `node scripts/worktree.mjs run npm run db:seed`.

Each worktree gets its own PostgreSQL container and data volume. Keep the generated `.env` private.

## Development

```sh
node scripts/worktree.mjs run npm run storybook  # Component workshop
node scripts/worktree.mjs run npm run check      # Full checks; requires test setup below
npm run build                                     # Production build
```

- [Development and test setup](docs/development.md)
- [Deployment](docs/deployment.md)

## Licenses

Keep the icon notices in `public/third-party-icons.txt` in production builds. Nunito’s OFL license is included in its Fontsource package; React Aria Components uses Apache-2.0.
