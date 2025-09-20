-- Allow authenticated users to update ONLY their own query summaries
-- 1) RLS policy for UPDATE on public.queries
CREATE POLICY "Users can update their own queries (summary only)"
ON public.queries
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) Trigger to prevent non-service roles from changing any columns except summary
CREATE OR REPLACE FUNCTION public.prevent_sensitive_query_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Block any updates to columns other than summary for non-service roles
  IF (coalesce((auth.jwt() ->> 'role'), '') <> 'service_role') THEN
    IF (NEW.prompt IS DISTINCT FROM OLD.prompt)
       OR (NEW.response IS DISTINCT FROM OLD.response)
       OR (NEW.user_id IS DISTINCT FROM OLD.user_id)
       OR (NEW.timestamp IS DISTINCT FROM OLD.timestamp)
       OR (NEW.pubmed_references IS DISTINCT FROM OLD.pubmed_references)
       OR (NEW.keywords IS DISTINCT FROM OLD.keywords)
       OR (NEW.translated_query IS DISTINCT FROM OLD.translated_query)
       OR (NEW.search_type IS DISTINCT FROM OLD.search_type)
       OR (NEW.selected_keyword IS DISTINCT FROM OLD.selected_keyword) THEN
      RAISE EXCEPTION 'Only the summary field can be updated by this role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_sensitive_query_updates ON public.queries;
CREATE TRIGGER trg_prevent_sensitive_query_updates
BEFORE UPDATE ON public.queries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_query_updates();