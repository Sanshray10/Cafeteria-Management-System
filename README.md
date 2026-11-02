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

5. Load demo data and compute embeddings. The seed **deletes all existing data** first. The first embedding run downloads the `Xenova/all-MiniLM-L6-v2` model (about 25 MB).

   ```bash
   npm run db:seed
   npm run db:embed
   ```

   Every seeded account uses the password `password123`:

   | Role | Email |
   | --- | --- |
   | Admin | `admin@campus.edu` |
   | Staff | `staff1@campus.edu`, `staff2@campus.edu` |
   | Student | `aarav.sharma@campus.edu`, `diya.patel@campus.edu`, … |

## Run

```bash
npm run dev
```

Open http://localhost:3000.

## Project layout

- `db/migrations/` – SQL migrations, applied in filename order and tracked in `schema_migrations`
- `db/seed/` – menu, ingredient and recipe data used by the seed script
- `scripts/` – migration, seed and embedding backfill scripts
- `src/app/` – pages and API route handlers (`src/app/api/`)
- `src/lib/` – shared server code (database pool, embeddings, Gemini query parsing, search)
