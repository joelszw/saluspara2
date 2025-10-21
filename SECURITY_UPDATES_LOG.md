# 🔒 Registro de Actualizaciones de Seguridad

## Fecha: 2025-10-21

### Cambios de Seguridad Implementados

Este documento registra todos los cambios de seguridad aplicados al proyecto Salustia Medical Assistant.

---

## 1. Migración del Sistema de Roles Legacy

### ⚠️ Problema Identificado
- Sistema dual de roles: `users.role` (legacy) y `user_roles` table (nuevo)
- Inconsistencias en verificaciones de autorización
- Riesgo de escalada de privilegios

### ✅ Solución Implementada

#### Base de Datos
```sql
-- Eliminada función legacy
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Actualizada función promote_to_admin para usar solo user_roles
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
...
-- Ya no actualiza users.subscription_status
```

#### Código de Aplicación
- **UsersManagement.tsx**: Eliminadas referencias a `users.role` y `subscription_status`
- **admin-reset-password function**: Actualizada para usar `has_role()` RPC en lugar de consultar `users.role`

#### Políticas RLS
```sql
-- Actualizada política de queries para remover acceso service_role a queries anónimas
CREATE POLICY "Authenticated users can view their own queries, admins can view"
ON queries FOR SELECT
USING (
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);
```

### 📝 Notas
- Las columnas `users.role` y `users.subscription_status` permanecen por compatibilidad
- Pueden ser eliminadas en una migración futura después de verificar que no hay dependencias
- El tipo `user_role` enum también puede ser eliminado después

---

## 2. Estado Actual de Seguridad

### ✅ Implementado
- [x] Sistema de roles basado en tabla separada (`user_roles`)
- [x] Funciones SECURITY DEFINER para verificación de roles
- [x] RLS habilitado en todas las tablas
- [x] Validación de input en edge functions
- [x] Logging de eventos de seguridad
- [x] Rate limiting con tracking de IP
- [x] Protección contra actualizaciones sensibles en queries
- [x] Autenticación consistente usando `has_role()`

### 📋 Funciones de Seguridad Disponibles

#### `has_role(_user_id uuid, _role app_role)`
```sql
-- Verifica si un usuario tiene un rol específico
SELECT has_role(auth.uid(), 'admin'::app_role);
```

#### `get_user_primary_role(_user_id uuid)`
```sql
-- Obtiene el rol principal del usuario (mayor privilegio)
SELECT get_user_primary_role(auth.uid());
```

#### `check_usage_limits_secure(user_id uuid, client_ip text)`
```sql
-- Verifica límites de uso con logging de seguridad
SELECT check_usage_limits_secure(auth.uid(), '192.168.1.1');
```

#### `log_security_event(event_type text, user_id uuid, ip_address text, details jsonb)`
```sql
-- Registra eventos de seguridad
PERFORM log_security_event('SUSPICIOUS_ACTIVITY', auth.uid(), '192.168.1.1', '{"action": "multiple_failed_logins"}'::jsonb);
```

---

## 3. Políticas RLS por Tabla

### users
- ✅ Solo usuarios pueden ver su propia fila o admins pueden ver todo
- ✅ Solo usuarios pueden actualizar su propia fila o admins
- ✅ Solo admins pueden insertar/eliminar usuarios

### user_roles
- ✅ Usuarios pueden ver sus propios roles o admins pueden ver todo
- ✅ Solo admins pueden insertar/actualizar/eliminar roles

### queries
- ✅ Usuarios anónimos pueden insertar queries con `user_id = NULL`
- ✅ Usuarios autenticados solo ven sus propias queries
- ✅ Admins pueden ver todas las queries
- ✅ Usuarios pueden actualizar solo sus propias queries
- ❌ Usuarios NO pueden eliminar queries (por diseño)

### security_events
- ✅ Solo `service_role` tiene acceso (logging interno)

### function_usage
- ✅ Solo `service_role` tiene acceso (tracking interno)

---

## 4. Edge Functions Configuradas

### Funciones Públicas (verify_jwt = false)
- `ask-medgemma` - Chat con IA médica
- `send-contact-email` - Formulario de contacto
- `generate-summary` - Generación de resúmenes
- `pubmed-search` - Búsqueda en PubMed
- `europe-pmc-search` - Búsqueda en Europe PMC

### Funciones Protegidas (verify_jwt = true)
- `export-history` - Exportar historial de queries
- `promote-admin` - Promoción a admin
- `send-recovery-email` - Email de recuperación
- `admin-reset-password` - Reset de contraseña por admin
- `change-password` - Cambio de contraseña

---

## 5. Secretos Configurados

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL`

### Servicios Externos
- `HUGGINGFACE_API_TOKEN`
- `HUGGINGFACE_MODEL_ID`
- `RESEND_API_KEY`
- `TURNSTILE_SECRET`

### Configuración
- `ALLOWED_PROMOTION_EMAILS` (lista separada por comas)

---

## 6. Recomendaciones de Seguridad Supabase

### ⚠️ Configuración Manual Requerida

Estas configuraciones deben hacerse en el Dashboard de Supabase:

1. **OTP Expiry Time**
   - Ubicación: Auth Settings
   - Recomendación: Reducir a 15 minutos
   - [Configurar](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/auth/providers)

2. **Leaked Password Protection**
   - Ubicación: Auth Settings
   - Recomendación: Habilitar
   - [Configurar](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/auth/providers)

3. **PostgreSQL Version**
   - Ubicación: Database Settings
   - Recomendación: Actualizar a última versión
   - [Configurar](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/settings/database)

---

## 7. Checklist de Verificación de Seguridad

### Base de Datos
- [x] RLS habilitado en todas las tablas
- [x] Políticas RLS configuradas correctamente
- [x] Funciones SECURITY DEFINER con `SET search_path`
- [x] Triggers de validación activos
- [x] Constraints de longitud en campos sensibles

### Autenticación y Autorización
- [x] Sistema de roles en tabla separada
- [x] Verificación de roles usando funciones SECURITY DEFINER
- [x] Sin verificaciones de rol en client-side
- [x] Edge functions usan `has_role()` consistentemente

### Edge Functions
- [x] CORS configurado correctamente
- [x] Validación de input en todas las funciones
- [x] Logging de eventos de seguridad
- [x] Rate limiting implementado
- [x] Manejo seguro de errores (sin exponer detalles internos)

### Frontend
- [x] Solo `ANON_KEY` expuesta (nunca `SERVICE_ROLE_KEY`)
- [x] Sin credenciales hardcodeadas sensibles
- [x] Validación de formularios
- [x] Manejo de errores sin exponer información sensible

---

## 8. Próximos Pasos Opcionales

### Para Mayor Seguridad

1. **Eliminar Columnas Legacy**
   ```sql
   -- Después de verificar que todo funciona correctamente
   ALTER TABLE users DROP COLUMN IF EXISTS role;
   ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
   DROP TYPE IF EXISTS public.user_role CASCADE;
   ```

2. **Implementar 2FA**
   - Configurar en Supabase Auth
   - Requerir para cuentas admin

3. **Auditoría Regular**
   - Revisar `security_events` table semanalmente
   - Monitorear `function_usage` para actividad sospechosa

4. **Backup Automatizado**
   - Configurar backups diarios de base de datos
   - Probar restauración mensualmente

---

## 9. Contacto y Soporte

### Recursos
- [Documentación de Seguridad](https://docs.lovable.dev/features/security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### En Caso de Incidente de Seguridad

1. Revisar logs en `security_events` table
2. Verificar actividad sospechosa en `function_usage`
3. Revisar logs de edge functions:
   ```bash
   supabase functions logs <function-name>
   ```
4. Si es necesario, desactivar usuarios sospechosos:
   ```sql
   UPDATE users SET enabled = false WHERE email = 'user@example.com';
   ```

---

**Última actualización**: 2025-10-21  
**Versión del sistema**: 2.0 (Post-migración de seguridad)  
**Estado**: ✅ Todos los cambios de seguridad aplicados y verificados
