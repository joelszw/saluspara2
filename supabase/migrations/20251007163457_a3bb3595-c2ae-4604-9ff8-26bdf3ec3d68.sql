-- Security fix: Add column-level protection for email addresses
-- This prevents email enumeration even if RLS policies are somehow bypassed

-- Create a secure view that masks emails for non-owners/non-admins
CREATE OR REPLACE VIEW public.users_with_masked_emails AS
SELECT 
  u.id,
  CASE 
    WHEN u.id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin' 
    THEN u.email 
    ELSE NULL  -- Return NULL instead of actual email for privacy
  END as email,
  u.role,
  u.subscription_status,
  u.daily_count,
  u.monthly_count,
  u.daily_uses,
  u.monthly_uses,
  u.created_at,
  u.enabled,
  u.auth_method
FROM public.users u;

-- Grant select permissions on the view
GRANT SELECT ON public.users_with_masked_emails TO authenticated;
GRANT SELECT ON public.users_with_masked_emails TO anon;

-- Create a security definer function to safely get user emails
-- This ensures email access is always checked through proper permissions
CREATE OR REPLACE FUNCTION public.get_user_email_safe(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN user_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'
      THEN (SELECT email FROM public.users WHERE id = user_id)
      ELSE NULL
    END;
$$;

-- Add comment explaining the security measure
COMMENT ON VIEW public.users_with_masked_emails IS 
'Secure view that masks email addresses for users who are not the owner or admin. Use this view instead of direct table queries when displaying user lists.';

COMMENT ON FUNCTION public.get_user_email_safe IS
'Safely retrieves user email only if the requester is the user themselves or an admin.';