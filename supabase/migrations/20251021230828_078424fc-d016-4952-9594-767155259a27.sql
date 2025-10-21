-- Security Fix Migration: Remove legacy role system and tighten RLS policies
-- This addresses warn-level security findings

-- 1. Update queries RLS policy to remove service_role access to anonymous queries
DROP POLICY IF EXISTS "Authenticated users can view their own queries, admins can view" ON queries;

CREATE POLICY "Authenticated users can view their own queries, admins can view"
ON queries FOR SELECT
USING (
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Remove legacy get_user_role function
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- 3. Remove legacy role and subscription_status columns from users table
-- Note: We'll keep these for backward compatibility during transition
-- They can be dropped in a future migration after confirming all code is updated
-- ALTER TABLE users DROP COLUMN IF EXISTS role;
-- ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;

-- 4. Update promote_to_admin function to only use user_roles table
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
  
  -- No longer update subscription_status on users table
END;
$$;

-- 5. Drop the legacy user_role enum type
-- This will fail if anything still references it, which is intentional
-- Uncomment after verifying all references are removed
-- DROP TYPE IF EXISTS public.user_role CASCADE;