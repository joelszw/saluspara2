-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Rate limiting support table
CREATE TABLE IF NOT EXISTS public.function_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  ip text NOT NULL,
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.function_usage ENABLE ROW LEVEL SECURITY;

-- Allow only service role to access this table
DROP POLICY IF EXISTS "Service role can do everything on function_usage" ON public.function_usage;
CREATE POLICY "Service role can do everything on function_usage"
ON public.function_usage
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Helpful index for counting by function/ip/time
CREATE INDEX IF NOT EXISTS idx_function_usage_fn_ip_created_at
  ON public.function_usage (function_name, ip, created_at DESC);

-- 2) Protect sensitive columns on users from being modified by non-service roles
CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_updates()
RETURNS trigger AS $$
BEGIN
  IF (coalesce((auth.jwt() ->> 'role'),'') <> 'service_role') THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.daily_count IS DISTINCT FROM OLD.daily_count
       OR NEW.monthly_count IS DISTINCT FROM OLD.monthly_count THEN
      RAISE EXCEPTION 'Updating protected columns is not allowed for this role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_prevent_sensitive_user_updates ON public.users;
CREATE TRIGGER trg_prevent_sensitive_user_updates
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_user_updates();

-- 3) Data retention: purge anonymous queries older than 30 days daily
DO $$ BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
  IF NOT FOUND THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;

-- Unschedule existing job with same name if present
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'purge-old-anon-queries-daily';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'purge-old-anon-queries-daily',
  '0 3 * * *',
  $$
  delete from public.queries
  where user_id is null
    and timestamp < now() - interval '30 days';
  $$
);
