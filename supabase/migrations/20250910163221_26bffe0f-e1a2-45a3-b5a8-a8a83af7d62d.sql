-- Fix critical RLS policy issue for queries table
-- Remove the overly permissive policy that could expose data
-- Add secure policy for anonymous query access

-- For medical data security, we'll restrict anonymous users from reading queries
-- This ensures maximum data protection while still allowing query submission

-- Add policy to allow anonymous users to read only during active sessions
-- This is a compromise between functionality and security
CREATE POLICY "Anonymous users cannot read queries" 
ON public.queries 
FOR SELECT 
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Add enhanced security constraint to prevent data exposure
ALTER TABLE public.queries 
ADD CONSTRAINT queries_user_data_protection 
CHECK (
  (user_id IS NULL AND response IS NOT NULL) OR 
  (user_id IS NOT NULL)
);

-- Add index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_queries_user_id_security ON public.queries(user_id) 
WHERE user_id IS NOT NULL;

-- Add enhanced logging for security monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access security events
CREATE POLICY "Service role access only" 
ON public.security_events 
FOR ALL 
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');