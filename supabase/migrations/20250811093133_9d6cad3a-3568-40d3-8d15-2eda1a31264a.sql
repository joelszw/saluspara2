-- Create users table to track auth and query counts
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  auth_method TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_count INT NOT NULL DEFAULT 0,
  monthly_count INT NOT NULL DEFAULT 0,
  subscription_status TEXT NOT NULL DEFAULT 'none'
);

-- Enable RLS and policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own user row"
  ON public.users FOR SELECT
  USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own user row"
  ON public.users FOR UPDATE
  USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to insert into users on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_method)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create queries table to store prompts and responses
CREATE TABLE IF NOT EXISTS public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON public.queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON public.queries(timestamp);

-- Enable RLS and policies for queries table
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own queries"
  ON public.queries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert their queries"
  ON public.queries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anonymous users can insert queries with null user_id"
  ON public.queries FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;