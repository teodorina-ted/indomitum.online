# Indomitum — Seed Collection CRM

A platform for professional seed collectors to document, track, and share plant specimens with buyers.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + PostgreSQL + JWT auth
- **Storage**: Cloudflare R2 (or local disk fallback)
- **Infra**: Docker + Railway + Nginx

## Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/teodorina-ted/indomitum.online.git
cd indomitum.online-main

# 2. Install frontend deps
npm install

# 3. Copy and fill env
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 4. Start local DB (or connect to Railway/Supabase Postgres)
# Run db/init.sql to create tables from scratch, OR
# Run db/migrate_v2.sql if upgrading an existing database

# 5. Start API
cd api && npm install && node index.js

# 6. Start frontend (in another terminal, from root)
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Generate: `openssl rand -hex 64` |
| `CORS_ORIGIN` | ✅ | Comma-separated allowed origins e.g. `https://indomitum.online` |
| `VITE_API_URL` | ✅ | Backend URL e.g. `/api` or `https://api.indomitum.online` |
| `R2_ACCESS_KEY_ID` | ⬜ | Cloudflare R2 key (falls back to local disk) |
| `R2_SECRET_ACCESS_KEY` | ⬜ | Cloudflare R2 secret |
| `R2_ENDPOINT` | ⬜ | R2 endpoint URL |
| `R2_BUCKET` | ⬜ | R2 bucket name |
| `R2_PUBLIC_URL` | ⬜ | Public base URL for R2 assets |

## Roles

- **Collector** — add seeds, manage collection, handle orders, ship
- **Buyer** — scan QR codes, view passports, place orders, track shipments  
- **Admin** — full access to everything

## Organization / Team Setup

When a collector signs up they can:
1. **Create a new organization** (enter a company name)
2. **Join an existing organization** (enter the org UUID from Settings)

Multiple collectors in the same org share visibility of all seeds.

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway
3. Set all environment variables above
4. Railway auto-builds from `Dockerfile`

## Database

- Fresh install: run `db/init.sql`
- Upgrading from v1: run `db/migrate_v2.sql`
