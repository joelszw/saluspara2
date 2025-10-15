# 📊 Guía de Migración de Datos - Salustia Medical Assistant

Esta guía te ayudará a migrar datos existentes entre proyectos Supabase o restaurar backups.

---

## 📋 Tabla de Contenidos

1. [Exportar Datos Existentes](#exportar-datos-existentes)
2. [Importar Datos a Nuevo Proyecto](#importar-datos-a-nuevo-proyecto)
3. [Migración Incremental](#migración-incremental)
4. [Validación de Datos](#validación-de-datos)
5. [Rollback y Recuperación](#rollback-y-recuperación)

---

## 🔄 Exportar Datos Existentes

### Método 1: Exportación SQL (Recomendado)

#### A. Exportar Todas las Tablas

```bash
# Conectar con Supabase CLI
supabase db dump --db-url "postgresql://postgres:[password]@db.injvwmsqinrcthgdlvux.supabase.co:5432/postgres" > salustia_full_backup.sql
```

#### B. Exportar Tablas Específicas

```sql
-- Exportar usuarios
COPY (
  SELECT id, email, auth_method, subscription_status, enabled, created_at
  FROM public.users
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```

Guardar como: `users_export.csv`

```sql
-- Exportar roles de usuarios
COPY (
  SELECT user_id, role, created_at
  FROM public.user_roles
  ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```

Guardar como: `user_roles_export.csv`

```sql
-- Exportar queries (historial médico)
COPY (
  SELECT id, user_id, prompt, response, summary, 
         pubmed_references, keywords, timestamp
  FROM public.queries
  ORDER BY timestamp
) TO STDOUT WITH CSV HEADER;
```

Guardar como: `queries_export.csv`

```sql
-- Exportar eventos de seguridad
COPY (
  SELECT id, event_type, user_id, ip_address, details, created_at
  FROM public.security_events
  ORDER BY created_at DESC
  LIMIT 10000  -- Últimos 10k eventos
) TO STDOUT WITH CSV HEADER;
```

Guardar como: `security_events_export.csv`

```sql
-- Exportar uso de funciones
COPY (
  SELECT id, function_name, user_id, ip, created_at
  FROM public.function_usage
  ORDER BY created_at DESC
  LIMIT 50000  -- Últimos 50k usos
) TO STDOUT WITH CSV HEADER;
```

Guardar como: `function_usage_export.csv`

### Método 2: Exportación JSON (Para Datos Complejos)

```sql
-- Exportar queries con referencias JSON
COPY (
  SELECT json_agg(row_to_json(t))
  FROM (
    SELECT id, user_id, prompt, response, summary, 
           pubmed_references, keywords, timestamp
    FROM public.queries
    ORDER BY timestamp
  ) t
) TO STDOUT;
```

Guardar como: `queries_export.json`

### Método 3: Usando Supabase Dashboard

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux)
2. Navega a **Table Editor**
3. Selecciona una tabla
4. Click en **⋮** (tres puntos) → **Export to CSV**

---

## 📥 Importar Datos a Nuevo Proyecto

### Pre-requisitos

✅ Ejecutar `DATABASE_EXPORT.sql` primero (crea estructura completa)
✅ Verificar que no hay datos duplicados
✅ Hacer backup antes de importar

### Importar Usuarios

```sql
-- 1. Importar desde CSV
COPY public.users (id, email, auth_method, subscription_status, enabled, created_at)
FROM '/path/to/users_export.csv'
DELIMITER ','
CSV HEADER;

-- 2. O importar manualmente
INSERT INTO public.users (id, email, auth_method, subscription_status, enabled, created_at)
VALUES 
  ('uuid-aqui', 'user@example.com', 'email', 'none', true, NOW()),
  -- ... más usuarios
ON CONFLICT (id) DO NOTHING;
```

### Importar Roles de Usuario

```sql
-- Importar roles
COPY public.user_roles (user_id, role, created_at)
FROM '/path/to/user_roles_export.csv'
DELIMITER ','
CSV HEADER;

-- Verificar que se importaron correctamente
SELECT ur.user_id, u.email, ur.role 
FROM public.user_roles ur
JOIN public.users u ON ur.user_id = u.id;
```

### Importar Queries (Historial Médico)

```sql
-- Importar queries
COPY public.queries (id, user_id, prompt, response, summary, pubmed_references, keywords, timestamp)
FROM '/path/to/queries_export.csv'
DELIMITER ','
CSV HEADER;

-- Verificar conteo
SELECT COUNT(*) as total_queries FROM public.queries;
```

### Importar Eventos de Seguridad

```sql
-- Importar eventos (opcional si quieres histórico)
COPY public.security_events (id, event_type, user_id, ip_address, details, created_at)
FROM '/path/to/security_events_export.csv'
DELIMITER ','
CSV HEADER;
```

### Importar Uso de Funciones

```sql
-- Importar uso de funciones (opcional)
COPY public.function_usage (id, function_name, user_id, ip, created_at)
FROM '/path/to/function_usage_export.csv'
DELIMITER ','
CSV HEADER;
```

---

## 🔄 Migración Incremental

### Escenario: Migrar Solo Nuevos Datos

```sql
-- Exportar solo queries creadas después de cierta fecha
COPY (
  SELECT id, user_id, prompt, response, summary, 
         pubmed_references, keywords, timestamp
  FROM public.queries
  WHERE timestamp > '2024-01-01 00:00:00'
  ORDER BY timestamp
) TO STDOUT WITH CSV HEADER;

-- Importar verificando duplicados
INSERT INTO public.queries (id, user_id, prompt, response, summary, pubmed_references, keywords, timestamp)
SELECT * FROM temp_queries
ON CONFLICT (id) DO NOTHING;  -- Ignorar duplicados
```

### Migración de Usuario Específico

```sql
-- Exportar datos de un usuario específico
DO $$
DECLARE
  target_user_id uuid := 'uuid-del-usuario';
BEGIN
  -- Exportar queries del usuario
  COPY (
    SELECT * FROM public.queries 
    WHERE user_id = target_user_id
  ) TO '/tmp/user_queries.csv' CSV HEADER;
  
  -- Exportar roles del usuario
  COPY (
    SELECT * FROM public.user_roles 
    WHERE user_id = target_user_id
  ) TO '/tmp/user_roles.csv' CSV HEADER;
END $$;
```

---

## ✅ Validación de Datos

### Verificar Integridad Post-Migración

```sql
-- 1. Contar registros en cada tabla
SELECT 
  'users' as table_name, COUNT(*) as total FROM public.users
UNION ALL
SELECT 
  'user_roles', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 
  'queries', COUNT(*) FROM public.queries
UNION ALL
SELECT 
  'security_events', COUNT(*) FROM public.security_events
UNION ALL
SELECT 
  'function_usage', COUNT(*) FROM public.function_usage;

-- 2. Verificar que todos los usuarios tienen roles
SELECT u.id, u.email, COUNT(ur.role) as role_count
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email
HAVING COUNT(ur.role) = 0;  -- Usuarios sin roles

-- 3. Verificar integridad referencial
SELECT q.id, q.user_id
FROM public.queries q
LEFT JOIN public.users u ON q.user_id = u.id
WHERE q.user_id IS NOT NULL AND u.id IS NULL;  -- Queries huérfanas

-- 4. Verificar datos JSON válidos
SELECT id, user_id, timestamp
FROM public.queries
WHERE pubmed_references IS NOT NULL 
  AND NOT (pubmed_references::text)::jsonb IS NOT NULL;  -- JSON inválido

-- 5. Verificar rangos de fechas
SELECT 
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente,
  COUNT(*) as total
FROM public.users;
```

### Script de Validación Completo

```sql
-- Ejecutar todo de una vez
DO $$
DECLARE
  user_count int;
  role_count int;
  query_count int;
  orphan_queries int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  SELECT COUNT(*) INTO query_count FROM public.queries;
  
  SELECT COUNT(*) INTO orphan_queries
  FROM public.queries q
  LEFT JOIN public.users u ON q.user_id = u.id
  WHERE q.user_id IS NOT NULL AND u.id IS NULL;
  
  RAISE NOTICE 'Validación de Migración:';
  RAISE NOTICE 'Total usuarios: %', user_count;
  RAISE NOTICE 'Total roles: %', role_count;
  RAISE NOTICE 'Total queries: %', query_count;
  RAISE NOTICE 'Queries huérfanas: %', orphan_queries;
  
  IF orphan_queries > 0 THEN
    RAISE WARNING 'Hay queries sin usuario asociado!';
  END IF;
  
  IF role_count < user_count THEN
    RAISE WARNING 'Hay usuarios sin roles asignados!';
  END IF;
END $$;
```

---

## 🔙 Rollback y Recuperación

### Crear Punto de Restauración

```sql
-- Antes de cualquier migración grande
BEGIN;

-- Crear tabla temporal de backup
CREATE TABLE users_backup AS SELECT * FROM public.users;
CREATE TABLE user_roles_backup AS SELECT * FROM public.user_roles;
CREATE TABLE queries_backup AS SELECT * FROM public.queries;

-- Hacer tus cambios aquí...

-- Si todo está bien:
COMMIT;

-- Si algo salió mal:
-- ROLLBACK;
```

### Restaurar desde Backup

```sql
-- Restaurar tabla completa
BEGIN;

-- Vaciar tabla actual
TRUNCATE public.users CASCADE;

-- Restaurar desde backup
INSERT INTO public.users SELECT * FROM users_backup;

COMMIT;
```

### Backup Automático con Timestamp

```sql
-- Crear backup con fecha
CREATE TABLE users_backup_20240115 AS 
  SELECT * FROM public.users;

-- Listar backups
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%_backup_%'
ORDER BY tablename;
```

---

## 🚨 Casos Especiales

### Migrar Usuarios de Auth.users a Public.users

```sql
-- Sincronizar usuarios de auth.users que no están en public.users
INSERT INTO public.users (id, email, auth_method, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'provider', 'email'),
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Asignar rol 'free' a usuarios sin rol
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'free'::app_role
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
```

### Limpiar Datos Duplicados

```sql
-- Encontrar usuarios duplicados por email
SELECT email, COUNT(*) 
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Eliminar duplicados (mantener el más reciente)
DELETE FROM public.users
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM public.users
  ) t
  WHERE t.rn > 1
);
```

### Migrar con Transformación de Datos

```sql
-- Ejemplo: Actualizar formato de roles antiguos
UPDATE public.users u
SET subscription_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = u.id AND ur.role = 'admin'
  ) THEN 'admin'
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = u.id AND ur.role = 'premium'
  ) THEN 'premium'
  ELSE 'none'
END;
```

---

## 📊 Estimación de Tiempos

| Tamaño de Datos | Tiempo Estimado | Método Recomendado |
|-----------------|-----------------|-------------------|
| < 1,000 registros | 1-5 min | SQL directo en Dashboard |
| 1,000 - 10,000 | 5-15 min | CSV export/import |
| 10,000 - 100,000 | 15-60 min | Supabase CLI dump |
| > 100,000 | 1-4 horas | Migración incremental |

---

## ⚠️ Advertencias Importantes

1. **Siempre haz backup antes de importar datos**
2. **Verifica RLS policies**: Los datos importados deben cumplir las políticas de seguridad
3. **UUIDs deben ser únicos**: No duplicar IDs entre proyectos
4. **Respetar foreign keys**: Importar en orden (users → user_roles → queries)
5. **Datos sensibles**: Nunca expongas emails o datos personales en archivos de texto plano

---

## 🆘 Solución de Problemas

### Error: "violates foreign key constraint"

```sql
-- Importar en orden correcto:
-- 1. users
-- 2. user_roles
-- 3. queries
-- 4. security_events
-- 5. function_usage
```

### Error: "duplicate key value violates unique constraint"

```sql
-- Usar ON CONFLICT
INSERT INTO public.users (...)
VALUES (...)
ON CONFLICT (id) DO NOTHING;  -- o DO UPDATE
```

### Error: "permission denied for table"

```sql
-- Usar service_role key en Supabase client
-- O ejecutar con permisos de admin en SQL Editor
```

---

Made with ❤️ using Lovable
