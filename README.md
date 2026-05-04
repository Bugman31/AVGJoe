# AVGJoe
workout tracking app

## Backend database workflow

Local development uses SQLite with `DATABASE_PROVIDER=sqlite` and `DATABASE_URL=file:./dev.db`.

- Start local backend: `cd backend && npm run dev`
- Push local schema to SQLite: `cd backend && npm run db:push:sqlite`
- Generate local Prisma client: `cd backend && npm run db:generate:sqlite`

Production uses PostgreSQL with `DATABASE_PROVIDER=postgresql`.

- Generate production Prisma client: `cd backend && npm run db:generate:postgres`
- Deploy production migrations: `cd backend && npm run db:migrate:deploy:postgres`
