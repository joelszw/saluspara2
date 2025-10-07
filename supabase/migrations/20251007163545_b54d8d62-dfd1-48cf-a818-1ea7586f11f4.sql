-- Fix security definer view issue
-- Remove the problematic view and keep only the secure function

-- Drop the view that was flagged as security issue
DROP VIEW IF EXISTS public.users_with_masked_emails;

-- The get_user_email_safe function is already in place and is the correct approach
-- It uses SECURITY DEFINER but as a function (not a view) which is the recommended pattern

-- Add additional security: Ensure the users table RLS policies are strict
-- The existing policies already properly restrict access, but let's add a comment
COMMENT ON TABLE public.users IS 
'Contains user account information. Email addresses are protected by RLS policies that only allow users to see their own email or admins to see all emails. Use get_user_email_safe() function for safe email access in queries.';