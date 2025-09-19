-- Add columns for references and clinical data to the queries table
ALTER TABLE public.queries 
ADD COLUMN IF NOT EXISTS pubmed_references JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS translated_query TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selected_keyword TEXT DEFAULT NULL;