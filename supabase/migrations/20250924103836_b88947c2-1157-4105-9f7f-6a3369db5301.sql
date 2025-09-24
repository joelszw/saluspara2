-- Step 1: Create user role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('free', 'premium', 'test', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add role column first
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'free';

-- Step 3: Add other columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS monthly_uses INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_uses INTEGER NOT NULL DEFAULT 0;