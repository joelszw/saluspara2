-- Create a function to promote user to admin (can only be called by service role)
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function can only be executed by service_role
  IF (coalesce((auth.jwt() ->> 'role'), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Only service role can promote users to admin';
  END IF;
  
  UPDATE public.users 
  SET role = 'admin', subscription_status = 'admin'
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$;

-- Grant execution to service role
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO service_role;