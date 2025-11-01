-- Add ban-related fields to users table
-- Run this migration against your primary Postgres database

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS ban_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS banned_by INTEGER NULL REFERENCES public.users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned);
CREATE INDEX IF NOT EXISTS idx_users_banned_until ON public.users(banned_until);
