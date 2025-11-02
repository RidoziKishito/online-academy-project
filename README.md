# Online Academy Project

Production-ready Node.js/Express + Handlebars e‑learning platform using PostgreSQL (Supabase-compatible), session store in Postgres, nodemailer for email (Gmail SMTP), Google OAuth, reCAPTCHA, and a small connection pool tuned for Render/Supabase.

This guide covers full setup: database, environment variables, local run, seed data, and deployment.

## Tech stack

- Node.js (ES Modules), Express 5, Handlebars + sections helper
- PostgreSQL (works great with Supabase); Knex for queries
- Sessions: express-session + connect-pg-simple
- Email: nodemailer with Gmail SMTP (fallback: disabled if credentials missing)
- Auth: Local + Google OAuth 2.0
- reCAPTCHA v2 checkbox
- Pino structured logging; compression, CORS

## Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ OR a Supabase project (managed Postgres)
- Optional (recommended): Git, psql client

## Quick start (local)

1) Clone and install

- Windows PowerShell
	- Clone the repo and install dependencies
	- Create a `.env` file (see example below)

2) Database setup

Choose one:

- Option A — Supabase (recommended)
	- Create a new Supabase project
	- In the SQL Editor, run the SQL files in order:
		- `migrations/002_add_ban_fields_to_users.sql` (adds ban columns to users)
		- `migrations/001_create_chat_tables.sql` (chat tables and policies)
		- `supabase/seed.sql` (large demo dataset; optional but useful)
	- Note: Supabase stores timestamps in GMT+0. The app already handles this for ban/unban logic.
	- Get the connection info from Supabase Project Settings → Database and put it into `.env` (see below). If you use `DATABASE_URL`, you don’t need individual DB_* entries.

- Option B — Local PostgreSQL
	- Create a database, e.g. `online_academy`
	- Run SQL files with psql (adjust host/port/user/db):
		- `psql -h localhost -p 5432 -U postgres -d online_academy -f migrations/002_add_ban_fields_to_users.sql`
		- `psql -h localhost -p 5432 -U postgres -d online_academy -f migrations/001_create_chat_tables.sql`
		- Optional seed data:
			- `psql -h localhost -p 5432 -U postgres -d online_academy -f supabase/seed.sql`
	- Put DB settings into `.env` (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME). If your local Postgres requires SSL off, set `DB_SSL=false`.

3) Configure environment variables

Create a `.env` file in the project root. Minimal example:

```
# Core
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
SESSION_SECRET=change_me

# Database (choose ONE style)
# Style A: Single URL (e.g., Supabase)
# DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME

# Style B: Individual fields (local dev)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=online_academy
DB_SSL=false

# CORS (comma-separated origins for production)
# CORS_ALLOWED_ORIGINS=https://your-frontend.example.com,https://admin.example.com

# Email via Gmail SMTP (nodemailer)
# Get App Password: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your-email@gmail.com
APP_NAME=Online Academy

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Only set this if you need to override the default BASE_URL + /auth/google/callback
# GOOGLE_CALLBACK_URL=

# reCAPTCHA v2 Checkbox
# In dev you can use DEV keys, in prod set PROD keys or the generic ones
RECAPTCHA_SITE_KEY_DEV=
RECAPTCHA_SECRET_KEY_DEV=
RECAPTCHA_SITE_KEY_PROD=
RECAPTCHA_SECRET_KEY_PROD=
```

Notes:
- If `EMAIL_USER` or `EMAIL_PASS` is missing, the app logs a warning and continues with email features disabled.
- For Gmail, you must create an App Password (not your regular password): https://myaccount.google.com/apppasswords
- If using Render/Supabase in production, prefer `DATABASE_URL` and keep `DB_SSL=true` or let the app infer SSL from `DATABASE_URL`.
- See `RECAPTCHA_SETUP.md` for reCAPTCHA setup notes.

4) Run locally

- Development with auto-reload
	- `npm run dev`
- Production-like
	- `npm start`

Open http://localhost:3000

## Project structure (high level)

- `app.js` — Express app bootstrap, middlewares, routes, helpers
- `routes/` — Express routes (account, admin, course, chat, etc.)
- `models/` — Database access via Knex
- `views/` — Handlebars templates (with `{{#fillContent "js"}}` sections for page-specific scripts)
- `middlewares/` — Auth, reCAPTCHA, etc.
- `utils/` — db, mailer (nodemailer), passport, logger
- `migrations/` — SQL migrations (chat tables, ban fields)
- `supabase/` — Seed data and migrations synced from remote
- `static/` — CSS/JS assets

## Database migrations and seed

Run these SQL files against your database (Supabase SQL Editor or `psql`):

1) `migrations/002_add_ban_fields_to_users.sql`
2) `migrations/001_create_chat_tables.sql`
3) `supabase/seed.sql` (optional, big demo content)

The app uses small connection pools suitable for Supabase/Render free tiers. Session store uses a separate tiny pg pool to avoid exhausting the main pool.

## Email (Gmail SMTP via nodemailer)

- Set `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` in `.env`
- For Gmail, create an App Password: https://myaccount.google.com/apppasswords (don't use your regular password)
- The mailer includes retry with backoff; if credentials are missing/invalid, logs warnings but doesn't block user flows
- Promotion and instructor onboarding emails are supported and non-blocking
- Test your email config with: `node scripts/send-test-email.mjs your-email@example.com`

## Google OAuth

- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- The callback defaults to `${BASE_URL}/auth/google/callback` unless `GOOGLE_CALLBACK_URL` is set
- If not configured, the app logs a warning and continues without Google login

## reCAPTCHA v2

- Provide dev/prod keys (see `middlewares/recaptcha.mdw.js`)
- See `RECAPTCHA_SETUP.md` for screenshots and details

## Deploy to Render (example)

You can use `render.yaml` as a guide:

- Create a new Web Service from repo
- Set environment variables:
	- `NODE_ENV=production`
	- `PORT=10000` (or the default Render port env)
	- Either `DATABASE_URL` (preferred) or `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` with `DB_SSL=true`
	- `SESSION_SECRET`, `BASE_URL` (your public URL)
	- `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `APP_NAME`
	- `CORS_ALLOWED_ORIGINS` for your domains
	- Optional: Google OAuth keys, reCAPTCHA keys
- Build: `npm install`
- Start: `npm start`
- Run SQL migrations/seed on your database (Supabase SQL editor or your Postgres) before first boot

## Troubleshooting

- Database timezones
	- Supabase stores timestamps in GMT+0; the app uses UTC calculations for ban durations and comparisons
- Pool exhaustion
	- Free tiers have small limits; the app uses very small pools (`max: 3` for Knex, `max: 2` for session store)
- CORS
	- Set `CORS_ALLOWED_ORIGINS` in production to a comma-separated list
- Email
	- If emails fail, check `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, and ensure you're using a Gmail App Password (not regular password). The app logs structured errors.
	- Test email: `node scripts/send-test-email.mjs your-email@example.com`

## Security notes

- Change `SESSION_SECRET` and never commit your `.env`
- Consider rate limits and captcha for sensitive routes
- See `SECURITY.md` for additional guidance

---

Happy shipping! If you need a Dockerfile or CI workflow later, we can add them and document migrations in an automated step.
