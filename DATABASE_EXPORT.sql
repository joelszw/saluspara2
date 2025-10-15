-- =====================================================
-- SALUSTIA MEDICAL ASSISTANT - COMPLETE DATABASE EXPORT
-- =====================================================
-- Project: Salustia Medical AI Assistant
-- Database: PostgreSQL via Supabase
-- Generated: 2025-10-15
-- =====================================================

-- IMPORTANTE: Ejecutar estos comandos en orden secuencial
-- en el SQL Editor de tu proyecto Supabase

-- =====================================================
-- 1. TIPOS DE DATOS PERSONALIZADOS (ENUMS)
-- =====================================================

-- Tipo de rol de usuario (nuevo sistema seguro)
CREATE TYPE public.app_role AS ENUM ('free', 'premium', 'test', 'admin');

-- Tipo de rol de usuario (legacy - mantener para compatibilidad)
CREATE TYPE public.user_role AS ENUM ('free', 'premium', 'test', 'admin');

-- =====================================================
-- 2. TABLAS PRINCIPALES
-- =====================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role user_role NOT NULL DEFAULT 'free'::user_role,
  subscription_status text NOT NULL DEFAULT 'none',
  daily_count integer NOT NULL DEFAULT 0,
  monthly_count integer NOT NULL DEFAULT 0,
  daily_uses integer NOT NULL DEFAULT 0,
  monthly_uses integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  auth_method text DEFAULT 'email',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla de roles de usuarios (NUEVO - Sistema seguro)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'free'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabla de consultas médicas
CREATE TABLE IF NOT EXISTS public.queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  response text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  pubmed_references jsonb,
  keywords text[],
  translated_query text,
  search_type text,
  selected_keyword text,
  summary text,
  CONSTRAINT prompt_length_check CHECK (length(prompt) <= 5000),
  CONSTRAINT response_length_check CHECK (length(response) <= 50000)
);

-- Tabla de eventos de seguridad
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla de uso de funciones
CREATE TABLE IF NOT EXISTS public.function_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text NOT NULL,
  function_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. ÍNDICES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON public.queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON public.queries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_queries_summary ON public.queries(summary);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_function_usage_user_id ON public.function_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_function_usage_ip ON public.function_usage(ip);
CREATE INDEX IF NOT EXISTS idx_function_usage_created_at ON public.function_usage(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.function_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view their own user row or admin can view all"
  ON public.users FOR SELECT
  USING (
    (id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can update their own user row or admin can update any"
  ON public.users FOR UPDATE
  USING (
    (id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete users"
  ON public.users FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Políticas para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (
    (user_id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Políticas para queries
CREATE POLICY "Anonymous users can insert queries with null user_id"
  ON public.queries FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated users can view their own queries, admins can view"
  ON public.queries FOR SELECT
  USING (
    ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR 
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    (((auth.jwt() ->> 'role'::text) = 'service_role'::text) AND (user_id IS NULL))
  );

CREATE POLICY "Users can insert their own queries"
  ON public.queries FOR INSERT
  WITH CHECK ((user_id = auth.uid()) OR (user_id IS NULL));

CREATE POLICY "Users can update their own queries"
  ON public.queries FOR UPDATE
  USING (
    (user_id = auth.uid()) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas para security_events (solo service_role)
CREATE POLICY "Service role access only"
  ON public.security_events FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Políticas para function_usage (solo service_role)
CREATE POLICY "Service role can do everything on function_usage"
  ON public.function_usage FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- =====================================================
-- 5. FUNCIONES DE BASE DE DATOS
-- =====================================================

-- Función para verificar si un usuario tiene un rol (SEGURA)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para obtener el rol principal de un usuario
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin'::app_role THEN 1
      WHEN 'premium'::app_role THEN 2
      WHEN 'test'::app_role THEN 3
      WHEN 'free'::app_role THEN 4
    END
  LIMIT 1
$$;

-- Función para obtener email de usuario de forma segura
CREATE OR REPLACE FUNCTION public.get_user_email_safe(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
      THEN (SELECT email FROM public.users WHERE id = user_id)
      ELSE NULL
    END;
$$;

-- Función para obtener rol de usuario (LEGACY - para compatibilidad)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Función para registrar eventos de seguridad
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text, 
  user_id uuid DEFAULT NULL::uuid, 
  ip_address text DEFAULT NULL::text, 
  details jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (event_type, user_id, ip_address, details)
  VALUES (event_type, user_id, ip_address, details);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$;

-- Función para verificar límites de uso (básica)
CREATE OR REPLACE FUNCTION public.check_usage_limits(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
  user_role app_role;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  IF user_record IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  SELECT public.get_user_primary_role(user_id) INTO user_role;
  
  IF user_role IS NULL THEN
    user_role := 'free'::app_role;
  END IF;
  
  SELECT COUNT(*) INTO daily_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits.user_id 
  AND DATE(timestamp) = CURRENT_DATE;
  
  SELECT COUNT(*) INTO monthly_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits.user_id 
  AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);
  
  CASE user_role
    WHEN 'free'::app_role THEN
      daily_limit := 3;
      monthly_limit := 50;
    WHEN 'premium'::app_role THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    WHEN 'test'::app_role THEN
      daily_limit := 999999;
      monthly_limit := 500;
    WHEN 'admin'::app_role THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    ELSE
      daily_limit := 3;
      monthly_limit := 50;
  END CASE;
  
  IF daily_queries >= daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily limit exceeded');
  END IF;
  
  IF monthly_queries >= monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Monthly limit exceeded');
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'daily_used', daily_queries,
    'daily_limit', daily_limit,
    'monthly_used', monthly_queries,
    'monthly_limit', monthly_limit
  );
END;
$$;

-- Función para verificar límites de uso (con seguridad mejorada)
CREATE OR REPLACE FUNCTION public.check_usage_limits_secure(
  user_id uuid, 
  client_ip text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record record;
  daily_queries integer;
  monthly_queries integer;
  daily_limit integer;
  monthly_limit integer;
  ip_daily_count integer := 0;
  user_role app_role;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE users.id = user_id;
  
  IF user_record IS NULL THEN
    PERFORM public.log_security_event('USER_NOT_FOUND', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  IF NOT user_record.enabled THEN
    PERFORM public.log_security_event('USER_DISABLED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'User account is disabled');
  END IF;
  
  SELECT public.get_user_primary_role(user_id) INTO user_role;
  
  IF user_role IS NULL THEN
    user_role := 'free'::app_role;
  END IF;
  
  SELECT COUNT(*) INTO daily_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits_secure.user_id 
  AND DATE(timestamp) = CURRENT_DATE;
  
  SELECT COUNT(*) INTO monthly_queries
  FROM public.queries 
  WHERE queries.user_id = check_usage_limits_secure.user_id 
  AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE);
  
  IF client_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_daily_count
    FROM public.function_usage
    WHERE function_usage.ip = client_ip
    AND DATE(created_at) = CURRENT_DATE;
  END IF;
  
  CASE user_role
    WHEN 'free'::app_role THEN
      daily_limit := 3;
      monthly_limit := 50;
    WHEN 'premium'::app_role THEN
      daily_limit := 100;
      monthly_limit := 1000;
    WHEN 'test'::app_role THEN
      daily_limit := 50;
      monthly_limit := 500;
    WHEN 'admin'::app_role THEN
      daily_limit := 999999;
      monthly_limit := 999999;
    ELSE
      daily_limit := 3;
      monthly_limit := 50;
  END CASE;
  
  IF ip_daily_count > 200 THEN
    PERFORM public.log_security_event('SUSPICIOUS_IP_ACTIVITY', user_id, client_ip, 
      jsonb_build_object('daily_count', ip_daily_count));
  END IF;
  
  IF daily_queries >= daily_limit THEN
    PERFORM public.log_security_event('DAILY_LIMIT_EXCEEDED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily limit exceeded');
  END IF;
  
  IF monthly_queries >= monthly_limit THEN
    PERFORM public.log_security_event('MONTHLY_LIMIT_EXCEEDED', user_id, client_ip);
    RETURN jsonb_build_object('allowed', false, 'reason', 'Monthly limit exceeded');
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true, 
    'daily_used', daily_queries,
    'daily_limit', daily_limit,
    'monthly_used', monthly_queries,
    'monthly_limit', monthly_limit
  );
END;
$$;

-- Función para promover usuario a admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF (coalesce((auth.jwt() ->> 'role'), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Only service role can promote users to admin';
  END IF;
  
  SELECT id INTO target_user_id
  FROM public.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  UPDATE public.users 
  SET subscription_status = 'admin'
  WHERE id = target_user_id;
END;
$$;

-- Función para prevenir actualizaciones sensibles en queries
CREATE OR REPLACE FUNCTION public.prevent_sensitive_query_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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

-- Función para crear nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_method)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger para prevenir actualizaciones sensibles en queries
DROP TRIGGER IF EXISTS trg_prevent_sensitive_query_updates ON public.queries;
CREATE TRIGGER trg_prevent_sensitive_query_updates
  BEFORE UPDATE ON public.queries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_sensitive_query_updates();

-- Trigger para crear usuario automáticamente al registrarse
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Puedes descomentar esto si quieres crear un usuario admin de prueba
-- IMPORTANTE: Cambia el email y crea el usuario en Supabase Auth primero

-- INSERT INTO public.users (id, email, role, subscription_status)
-- VALUES (
--   'uuid-del-usuario-creado-en-auth',
--   'admin@example.com',
--   'admin'::user_role,
--   'admin'
-- ) ON CONFLICT (id) DO NOTHING;

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES (
--   'uuid-del-usuario-creado-en-auth',
--   'admin'::app_role
-- ) ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- FIN DE EXPORT
-- =====================================================

-- Verificar que todo se creó correctamente
SELECT 'Database export completed successfully!' as status;

-- Verificar tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Verificar políticas RLS
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
