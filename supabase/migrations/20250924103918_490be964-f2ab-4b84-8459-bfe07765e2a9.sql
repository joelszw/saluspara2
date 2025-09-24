-- Create function to get user role (prevent recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Update existing RLS policies
DROP POLICY IF EXISTS "Users can update their own user row" ON public.users;
DROP POLICY IF EXISTS "Users can view their own user row" ON public.users;

-- New RLS policies for users table
CREATE POLICY "Users can view their own user row or admin can view all" ON public.users
FOR SELECT USING (
  id = auth.uid() OR 
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can update their own user row or admin can update any" ON public.users
FOR UPDATE USING (
  id = auth.uid() OR 
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admin can insert users" ON public.users
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admin can delete users" ON public.users
FOR DELETE USING (
  public.get_user_role(auth.uid()) = 'admin'
);

-- Update queries policies
DROP POLICY IF EXISTS "Authenticated users can only view their own queries" ON public.queries;
DROP POLICY IF EXISTS "Authenticated users can insert their queries" ON public.queries;
DROP POLICY IF EXISTS "Users can update their own queries (summary only)" ON public.queries;

CREATE POLICY "Users can view their own queries or admin can view all" ON public.queries
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can insert their own queries" ON public.queries
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "Users can update their own queries" ON public.queries
FOR UPDATE USING (
  user_id = auth.uid() OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION public.check_usage_limits(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Count queries for today
  SELECT COUNT(*) INTO daily_queries
  FROM public.queries 
  WHERE user_id = user_id 
  AND DATE(timestamp) = CURRENT_DATE;
  
  -- Count queries for current month
  SELECT COUNT(*) INTO monthly_queries
  FROM public.queries 
  WHERE user_id = user_id 
  AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Set limits based on role
  CASE user_record.role
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