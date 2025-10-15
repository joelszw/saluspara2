-- =====================================================
-- CRITICAL SECURITY FIX: Separate User Roles Table
-- =====================================================

-- 1. Drop old trigger first (CASCADE will drop dependent objects)
DROP TRIGGER IF EXISTS trg_prevent_sensitive_user_updates ON public.users;
DROP FUNCTION IF EXISTS public.prevent_sensitive_user_updates() CASCADE;

-- 2. Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('free', 'premium', 'test', 'admin');

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'free',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'premium' THEN 2
      WHEN 'test' THEN 3
      WHEN 'free' THEN 4
    END
  LIMIT 1
$$;

-- 7. Migrate existing role data from users table to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Update RLS policies on users table (remove role checks)
DROP POLICY IF EXISTS "Users can view their own user row or admin can view all" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user row or admin can update any" ON public.users;
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;

CREATE POLICY "Users can view their own user row or admin can view all"
  ON public.users
  FOR SELECT
  USING (
    (id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update their own user row or admin can update any"
  ON public.users
  FOR UPDATE
  USING (
    (id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete users"
  ON public.users
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Update RLS policies on queries table
DROP POLICY IF EXISTS "Authenticated users can view their own queries, admins can view" ON public.queries;

CREATE POLICY "Authenticated users can view their own queries, admins can view"
  ON public.queries
  FOR SELECT
  USING (
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR 
    public.has_role(auth.uid(), 'admin') OR 
    (((auth.jwt() ->> 'role'::text) = 'service_role'::text) AND (user_id IS NULL))
  );

DROP POLICY IF EXISTS "Users can update their own queries" ON public.queries;

CREATE POLICY "Users can update their own queries"
  ON public.queries
  FOR UPDATE
  USING (
    (user_id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin')
  );

-- 10. Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 11. Create function to promote user to admin (updated)
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- This function can only be executed by service_role
  IF (coalesce((auth.jwt() ->> 'role'), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Only service role can promote users to admin';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM public.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role (will fail if already exists due to unique constraint)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update subscription status on users table
  UPDATE public.users 
  SET subscription_status = 'admin'
  WHERE id = target_user_id;
END;
$$;

-- 12. Update check_usage_limits function to use new role system
CREATE OR REPLACE FUNCTION public.check_usage_limits(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
  user_role app_role;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Get user's primary role
  SELECT public.get_user_primary_role(user_id) INTO user_role;
  
  IF user_role IS NULL THEN
    user_role := 'free';
  END IF;
  
  -- Count queries for today
  SELECT COUNT(*) INTO daily_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits.user_id 
  AND DATE(timestamp) = CURRENT_DATE;
  
  -- Count queries for current month
  SELECT COUNT(*) INTO monthly_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits.user_id 
  AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Set limits based on role
  CASE user_role
    WHEN 'free' THEN
      daily_limit := 3;
      monthly_limit := 50;
    WHEN 'premium' THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    WHEN 'test' THEN
      daily_limit := 999999;
      monthly_limit := 500;
    WHEN 'admin' THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    ELSE
      daily_limit := 3;
      monthly_limit := 50;
  END CASE;
  
  -- Check limits
  IF daily_queries >= daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily limit exceeded');
  END IF;
  
  IF monthly_queries >= monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Monthly limit exceeded');
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'daily_used', daily_queries,
    'daily_limit', daily_limit,
    'monthly_used', monthly_queries,
    'monthly_limit', monthly_limit
  );
END;
$$;

-- 13. Update check_usage_limits_secure function
CREATE OR REPLACE FUNCTION public.check_usage_limits_secure(user_id uuid, client_ip text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
  ip_daily_count integer := 0;
  user_role app_role;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE users.id = user_id;
  
  IF user_record IS NULL THEN
    PERFORM public.log_security_event('USER_NOT_FOUND', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is enabled
  IF NOT user_record.enabled THEN
    PERFORM public.log_security_event('USER_DISABLED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User account is disabled');
  END IF;
  
  -- Get user's primary role
  SELECT public.get_user_primary_role(user_id) INTO user_role;
  
  IF user_role IS NULL THEN
    user_role := 'free';
  END IF;
  
  -- Count queries for today
  SELECT COUNT(*) INTO daily_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits_secure.user_id 
  AND DATE(timestamp) = CURRENT_DATE;
  
  -- Count queries for current month
  SELECT COUNT(*) INTO monthly_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits_secure.user_id 
  AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Count IP-based queries for today
  IF client_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_daily_count
    FROM public.function_usage
    WHERE function_usage.ip = client_ip
    AND DATE(created_at) = CURRENT_DATE;
  END IF;
  
  -- Set limits based on role
  CASE user_role
    WHEN 'free' THEN
      daily_limit := 3;
      monthly_limit := 50;
    WHEN 'premium' THEN
      daily_limit := 100;
      monthly_limit := 1000;
    WHEN 'test' THEN
      daily_limit := 50;
      monthly_limit := 500;
    WHEN 'admin' THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    ELSE
      daily_limit := 3;
      monthly_limit := 50;
  END CASE;
  
  -- Check for suspicious IP activity
  IF ip_daily_count > 200 THEN
    PERFORM public.log_security_event('SUSPICIOUS_IP_ACTIVITY', user_id, client_ip, 
      jsonb_build_object('daily_count', ip_daily_count));
  END IF;
  
  -- Check limits
  IF daily_queries >= daily_limit THEN
    PERFORM public.log_security_event('DAILY_LIMIT_EXCEEDED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily limit exceeded');
  END IF;
  
  IF monthly_queries >= monthly_limit THEN
    PERFORM public.log_security_event('MONTHLY_LIMIT_EXCEEDED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'Monthly limit exceeded');
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'daily_used', daily_queries,
    'daily_limit', daily_limit,
    'monthly_used', monthly_queries,
    'monthly_limit', monthly_limit
  );
END;
$$;

-- 14. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, auth_method)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert default 'free' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;