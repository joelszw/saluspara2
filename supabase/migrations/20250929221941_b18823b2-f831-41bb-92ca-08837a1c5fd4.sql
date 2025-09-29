-- Update the trigger function to allow admin users to update enabled status
CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_updates()
RETURNS trigger AS $$
BEGIN
  -- Allow service_role to update everything
  IF (coalesce((auth.jwt() ->> 'role'),'') = 'service_role') THEN
    RETURN NEW;
  END IF;
  
  -- Allow admin users to update subscription_status and enabled status (for role/status changes)
  -- but still protect daily_count and monthly_count
  IF public.get_user_role(auth.uid()) = 'admin' THEN
    IF NEW.daily_count IS DISTINCT FROM OLD.daily_count
       OR NEW.monthly_count IS DISTINCT FROM OLD.monthly_count THEN
      RAISE EXCEPTION 'Updating protected columns is not allowed for this role';
    END IF;
    RETURN NEW;
  END IF;
  
  -- For non-admin, non-service users, block all protected column updates
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.daily_count IS DISTINCT FROM OLD.daily_count
     OR NEW.monthly_count IS DISTINCT FROM OLD.monthly_count
     OR NEW.enabled IS DISTINCT FROM OLD.enabled THEN
    RAISE EXCEPTION 'Updating protected columns is not allowed for this role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';