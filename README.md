# Phoget

A shared household list app with German UI, user accounts, customizable lists, and synced updates.
Built with React, TypeScript, Express, and PostgreSQL.

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

## Licenses

Keep the icon notices in `public/third-party-icons.txt` in production builds. Nunito’s OFL license is included in its Fontsource package; React Aria Components uses Apache-2.0.
