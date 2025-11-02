-- SQL to pre-create the session table used by connect-pg-simple
-- Run this in your Supabase project's SQL Editor against the SAME database
-- that your application uses (the database behind your pooler DATABASE_URL).

CREATE TABLE IF NOT EXISTS public."session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

-- Add primary key if missing (compat: older Postgres doesn't support IF NOT EXISTS on ADD CONSTRAINT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_pkey'
      AND conrelid = 'session'::regclass
  ) THEN
    ALTER TABLE public."session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public."session" ("expire");

-- Optional cleanup: delete expired sessions (can be scheduled if needed)
-- DELETE FROM "session" WHERE "expire" < NOW();
