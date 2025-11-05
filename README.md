# VietEdu Academy

VietEdu Academy is a full-stack online course platform built as the final project for a Web Programming course. It demonstrates user authentication (local + Google OAuth), course/catalog management, lessons with video embeds, reviews, enrollments, and a PostgreSQL-backed search and session store.

🔗 Live Demo: https://online-academy-project.onrender.com

---

## ✨ Features

- 👥 User accounts: sign up, sign in, profile, change password
- 🔐 Google OAuth sign-in (passport-google-oauth20)
- 📚 Courses, categories, chapters and lessons
- ▶️ Video lessons with watch progress tracking
- ⭐ Reviews and ratings for courses
- 🛒 Wishlist and enrollment system
- 🔎 Full text search using PostgreSQL tsvector & GIN indexes (with unaccent)
- 🧾 Admin area: manage courses, categories, instructors, and contact messages
- 🔒 Session store in PostgreSQL (connect-pg-simple) with pooler-friendly configuration
- 🚀 Optimized for deployment on Render + Supabase (Postgres) with production hardening

---

## 🛠️ Tech Stack

| Technology                         | Purpose                                             |
| :--------------------------------- | :-------------------------------------------------- |
| Node.js (ESM) + Express 5          | Server and routing                                  |
| Handlebars                         | Server-side templating                              |
| Knex + pg                          | Database query builder and Postgres driver          |
| PostgreSQL (Supabase)              | Primary database, full-text search, session storage |
| connect-pg-simple                  | Session store backed by Postgres                    |
| passport + passport-google-oauth20 | Authentication and Google OAuth                     |
| pino / pino-http                   | Logging                                             |
| Nodemailer                         | Email (Gmail App Password)                          |
| Render                             | Recommended hosting for this demo                   |

---

## ✅ Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ or a Supabase project (managed Postgres)
- Optional but recommended: Git, psql client

---

## ⚙️ Installation & Setup (Local)

1. Clone the repository:

```bash
git clone https://github.com/RidoziKishito/online-academy-project.git
cd online-academy-project
```

2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

Unix / macOS:

```bash
cp .env.example .env
# Edit .env to set your secrets
```

PowerShell (Windows):

```powershell
Copy-Item .env.example .env
# Edit .env with your secrets (use a text editor or `notepad .env`)
```

## Database setup

Choose one of the two options below depending on whether you use Supabase or a local Postgres instance.

- Option A — Supabase (recommended)

  - Create a new Supabase project
  - In the SQL Editor, run the migration SQL files in ascending timestamp/filename order (oldest first). If your project has a `supabase/migrations/` directory, run those files in order. This ensures schema dependencies are applied correctly.
    - Note: do not assume numeric suffixes in the README — run the files in the repository's `supabase/migrations/` sorted by filename (or timestamp) so `001_...` runs before `002_...`.
    - `supabase/seed.sql` (large demo dataset; optional but useful)
  - Note: Supabase stores timestamps in GMT+0. The app already handles this for ban/unban logic.
  - Get the connection info from Supabase Project Settings → Database and put it into `.env` (see below). If you use `DATABASE_URL`, you don’t need individual DB\_\* entries.

- Option B — Local PostgreSQL
  - Create a database, e.g. `online_academy`
  - Run SQL files with psql (adjust host/port/user/db):
    - `psql -h localhost -p 5432 -U postgres -d online_academy -f migrations/002_add_ban_fields_to_users.sql`
    - `psql -h localhost -p 5432 -U postgres -d online_academy -f migrations/001_create_chat_tables.sql`
    - Optional seed data:
      - `psql -h localhost -p 5432 -U postgres -d online_academy -f supabase/seed.sql`
  - Put DB settings into `.env` (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME). If your local Postgres requires SSL off, set `DB_SSL=false`.

## Configure environment variables

Create a `.env` file in the project root. Minimal example:

```bash
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

## Run locally

- Development with auto-reload
  - `npm run dev`
- Production-like
  - `npm start`

Open http://localhost:3000

---

## 🗂 Project structure (high level)

- `app.js` — Express app bootstrap, middlewares, routes, helpers
- `routes/` — Express routers (account, admin, course, chat, etc.)
- `models/` — Database access via Knex
- `views/` — Handlebars templates and layouts
- `middlewares/` — Authentication and other middleware
- `utils/` — db, mailer, passport, logger and helper utilities
- `supabase/` — exported seed and migration SQL from a Supabase project (`supabase/seed.sql`, `supabase/migrations/`)
- `session_table.sql`, `courses.sql`, `contact_messages.sql`, `full_text_search.sql` — helper SQL files at repo root
- `static/` — CSS/JS assets served early to avoid unnecessary DB hits
- `scripts/` — utility scripts (e.g. `scripts/send-test-email.mjs`)

---

## 🗄 Database migrations and seed

The repo contains SQL exports and a `supabase/seed.sql` with a large demo dataset. Recommended order when provisioning a fresh database:

1. Run any migration files under `supabase/migrations/` (if present) in the SQL editor.
2. Run `session_table.sql` (creates `session` table used by `connect-pg-simple`).
3. Run schema SQL files (if required): `courses.sql`, `contact_messages.sql`, `full_text_search.sql`.
4. (Optional) Load `supabase/seed.sql` to populate demo data (large). Use Supabase SQL Editor or `psql`.

Example (psql):

```bash
# Run session table creation
psql "$DATABASE_URL" -f session_table.sql

# Run seed (only if you want demo data)
psql "$DATABASE_URL" -f supabase/seed.sql
```

Or via the Supabase Dashboard SQL Editor:

1. Open your Supabase project → SQL Editor → New query
2. Paste the contents of `session_table.sql` (or `supabase/seed.sql`) and run the query

This is often the easiest option if you don't have `psql` locally installed.

Notes:

- The seed file is large and was exported from a Supabase project — it sets sequences and many rows. Only run it if you want demo content.
- Full-text search requires the `unaccent` extension in Postgres; enable it from the Supabase dashboard if you use the `full_text_search.sql` triggers/indexes.

---

## ✉️ Email testing (nodemailer)

You can verify SMTP credentials and send a quick test email with the included script:

```bash
# If you use a local .env file (recommended for local testing):
node -r dotenv/config scripts/send-test-email.mjs your-email@example.com

# If your environment already loads env vars (e.g., in a container or CI), simply:
node scripts/send-test-email.mjs your-email@example.com
```

Notes:

- The `-r dotenv/config` prefix ensures `process.env` is populated from `.env` when running the script directly. Use this when `DISABLE_DOTENV=true` or when the script is executed outside the app's normal startup flow.
- The script verifies SMTP then sends a password-reset style test email; it uses the same mailer config as the app.
- If SMTP verification fails, check `EMAIL_USER` and `EMAIL_PASS` (Gmail App Password) in your `.env`.

---

## reCAPTCHA and other notes

- The project uses reCAPTCHA v2 (checkbox) on sensitive forms. Provide dev/prod keys in your environment. See `middlewares/recaptcha.mdw.js` for implementation details.

---

## 🚀 Deploying to Render + Supabase (short notes)

1. Choose one source of environment variables on Render: either Environment Variables or a Secret File (.env). Do NOT use both — they can mix and cause DATABASE_URL to be different at boot.

2. If you use Environment Variables on Render, set `DISABLE_DOTENV=true` so the app ignores the checked-in `.env` file.

3. Important env values for Render:

- `DATABASE_URL` — use your Supabase _session pooler_ URL (hostname ends with `pooler.supabase.com`). Ensure `pool_mode=session` if applicable and password is URL-encoded.
- `SESSION_SECRET`, `SESSION_AUTO_CREATE_TABLE=false`, `SESSION_PRUNE_INTERVAL_SECONDS=0`, `DISABLE_DOTENV=true`

4. After deploy, check logs for diagnostics:

- The app logs whether the DATABASE_URL points at the Supabase pooler.
- It logs whether session auto-create is enabled and the prune interval value.

Tip: if your first boot shows session-table creation errors, create the `session` table manually (run `session_table.sql`) and set `SESSION_AUTO_CREATE_TABLE=false` in Render to avoid the middleware touching the DB on cold starts.

---

## Google OAuth

- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- The callback defaults to `${BASE_URL}/auth/google/callback` unless `GOOGLE_CALLBACK_URL` is set
- If not configured, the app logs a warning and continues without Google login

---

## 🔧 Google OAuth: redirect_uri_mismatch (How to fix)

If you see the error "redirect_uri_mismatch" when signing in with Google, that means the redirect URI configured in Google Cloud Console doesn't match the `GOOGLE_CALLBACK_URL` used by the app.

Fix steps:

1. In Google Cloud Console → Credentials → OAuth 2.0 Client IDs → Edit the client.
2. Under "Authorized redirect URIs" add the exact callback URL used by your app:

- Local dev: `http://localhost:3000/auth/google/callback`
- Render production: `https://online-academy-project.onrender.com/auth/google/callback`

3. Save, then restart the app and try signing in again.

Note: callback must be HTTPS on production (Render uses HTTPS).

---

## Troubleshooting

- Database timezones
  - Supabase stores timestamps in GMT+0; the app uses UTC calculations for ban durations and comparisons
- Pool exhaustion
  - Free tiers have small limits. The app is configured to use small pools to avoid exhausting Supabase pooler limits. Current defaults in code are:
    - Knex (app DB pool): max = 5 (see `utils/db.js`)
    - Session store pool: max = 2 (see `app.js`)
  - If you change these values, keep them small on free pools (1-5) and prefer the Supabase pooler URL to reduce connection churn.
- CORS
  - Set `CORS_ALLOWED_ORIGINS` in production to a comma-separated list
- Email
  - If emails fail, check `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, and ensure you're using a Gmail App Password (not regular password). The app logs structured errors.
  - Test email: `node scripts/send-test-email.mjs your-email@example.com`

---

## Security notes

- Change `SESSION_SECRET` and never commit your `.env`
- Consider rate limits and captcha for sensitive routes
- See `SECURITY.md` for additional guidance

---

## 📷 Preview

Visit the live demo: https://online-academy-project.onrender.com

<img width="1920" height="978" alt="image" src="https://github.com/user-attachments/assets/bc0eefb0-3ae2-40cb-bc40-02b26fde2621" />

---

## 📌 Project Notes

- This repository contains server-side templating (Handlebars) and server-rendered pages. It's not a single-page app.
- Database features (full-text search, unaccent) require Postgres extensions — enable them from the Supabase dashboard if needed.
- For production stability when using Supabase pooler: keep database pools small, enable TCP keep-alive and avoid automatic session table creation on boot.

---

## 🙌 Acknowledgements

- Built as a university final project. Thanks to instructors, classmates, and online resources.

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🤝 Contact & Support

If you encounter any issues or have questions about this project, feel free to reach out:

- 📧 Email: huytranquoc24@gmail.com
- 🌐 Facebook: https://www.facebook.com/huy.tranquoc.129357/
- 💼 LinkedIn: https://www.linkedin.com/in/tran-quoc-huy-0612-ai/

---

## 👨‍💻 Project Team

💡 Created with ❤️ by:

- **Tran Quoc Huy** (Leader) - 23110026
- **Le Huu Truc** - 23110068
- **Trac Van Ngoc Phuc** - 23110057
- **Hoang Duc Tuan** - 23110069
- **Vo Truc Ho** - 23110021
- **Ngo Viet Hoang** - 23110020
