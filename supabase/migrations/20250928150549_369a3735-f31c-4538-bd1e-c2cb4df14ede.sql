-- Fix constraint conflict by dropping existing and adding new comprehensive constraint
DO $$
BEGIN
  -- Drop existing summary_length_check constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'summary_length_check') THEN
    ALTER TABLE public.queries DROP CONSTRAINT summary_length_check;
  END IF;
  
  -- Drop existing query_length_check constraint if it exists  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'query_length_check') THEN
    ALTER TABLE public.queries DROP CONSTRAINT query_length_check;
  END IF;
END $$;

-- Add comprehensive query validation constraint
ALTER TABLE public.queries ADD CONSTRAINT queries_content_validation_check 
CHECK (
  length(prompt) <= 2000 AND 
  (response IS NULL OR length(response) <= 50000) AND
  (summary IS NULL OR length(summary) <= 10000)
);