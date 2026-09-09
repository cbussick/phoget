# Phoget

A shared household list app with German UI, user accounts, customizable lists, and synced updates.
Built with React, TypeScript, Express, and PostgreSQL.

The Phoget logo lives in `public/icon.svg` and is shared by navigation and login. Its bowl and checkmark use the same blue palette and irregular oval as the list icons. PNG exports and `public/site.webmanifest` provide browser and home-screen branding.

Existing `gather` database, volume, session, and internal protocol identifiers are retained for compatibility; renaming the app does not require a data migration.

## Run locally

Requires Node 24+, npm 11, and Docker Compose.

```sh
npm ci
cp .env.example .env
docker compose up -d db
npm run db:setup
npm run account:setup
npm run dev
```

Open the printed URL (starting at `http://127.0.0.1:5173`, with automatic port fallback).
Account setup creates the first administrator. Optional demo data: `npm run db:seed`.

Database data stays in a Docker volume. Keep `.env` private; example credentials are for local development only.

## Development

```sh
npm run storybook     # Component workshop on port 6006
npm run check         # Full checks; requires test setup below
npm run build         # Production build
```

- [Development and test setup](docs/development.md)
- [Deployment](docs/deployment.md)
- [Design notes](docs/design.md)
- [Dependencies and licenses](docs/dependencies.md)
