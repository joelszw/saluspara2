-- Fix linter warning: set immutable search_path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_method)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;