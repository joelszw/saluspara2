-- Fix security vulnerability: Anonymous users accessing query history
-- The current SELECT policies have a logical flaw that allows anonymous users 
-- to read anonymous queries (where user_id IS NULL)

-- Drop the existing problematic SELECT policies
DROP POLICY IF EXISTS "Anonymous users cannot read queries" ON public.queries;
DROP POLICY IF EXISTS "Users can view their own queries" ON public.queries;

-- Create a single, secure SELECT policy that:
-- 1. Only allows authenticated users to read queries
-- 2. Users can only read their own queries (where user_id matches auth.uid())
-- 3. Completely blocks anonymous access to any queries
CREATE POLICY "Authenticated users can only view their own queries" 
ON public.queries 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL 
  AND user_id = auth.uid()
);

-- Add a comment explaining the security fix
COMMENT ON POLICY "Authenticated users can only view their own queries" ON public.queries 
IS 'Security fix: Prevents anonymous users from accessing any query history, including anonymous queries. Only authenticated users can read their own queries.';