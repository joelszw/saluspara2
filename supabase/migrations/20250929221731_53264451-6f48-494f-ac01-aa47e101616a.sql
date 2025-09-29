-- Add enabled column to track user status
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

-- Update check_usage_limits_secure function to check if user is enabled
CREATE OR REPLACE FUNCTION public.check_usage_limits_secure(user_id uuid, client_ip text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
  ip_daily_count integer := 0;
BEGIN
  -- Get user info
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF user_record IS NULL THEN
    PERFORM public.log_security_event('USER_NOT_FOUND', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is enabled
  IF NOT user_record.enabled THEN
    PERFORM public.log_security_event('USER_DISABLED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User account is disabled');
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
  
  -- Count IP-based queries for today (for additional rate limiting)
  IF client_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_daily_count
    FROM public.function_usage
    WHERE ip = client_ip
    AND DATE(created_at) = CURRENT_DATE;
  END IF;
  
  -- Set limits based on role
  CASE user_record.role
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
  
  -- Check for suspicious IP activity (more than 200 requests per day from same IP)
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