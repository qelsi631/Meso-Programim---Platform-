-- Track whether a welcome email has been sent
-- Run this in the Supabase SQL editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
