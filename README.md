# Cafeteria Management System

Campus cafeteria pre-ordering system with recipe-based inventory, a prepaid student wallet, pickup slots, and semantic menu search.

Stack: Next.js (App Router, TypeScript, Tailwind), PostgreSQL 16 with pgvector, node-postgres.

## Requirements

- Node.js 24 or newer
- Docker with Docker Compose

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from the example and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the local database container |
   | `DATABASE_URL` | Connection string used by the app and scripts (must match the values above) |
   | `GEMINI_API_KEY` | Gemini API key for search query parsing |
   | `GEMINI_MODEL` | Gemini model name |
   | `SESSION_COOKIE_NAME` | Name of the login session cookie |

3. Start the database (exposed on host port 5433):

   ```bash
   docker compose up -d
   ```

4. Apply migrations:

   ```bash
   npm run db:migrate
   ```

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Project layout

- `db/migrations/` – SQL migrations, applied in filename order and tracked in `schema_migrations`
- `scripts/` – migration and data scripts
- `src/app/` – pages and API route handlers (`src/app/api/`)
- `src/lib/` – shared server code (database pool)
