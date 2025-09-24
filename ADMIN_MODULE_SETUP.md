# Módulo de Administración de Usuarios - Aware Doctor AI

## 📋 Resumen

Se ha implementado un módulo completo de administración de usuarios con las siguientes funcionalidades:

## 🚀 Características Implementadas

### 1. Nuevos Roles de Usuario
- **free**: Límite de 3 consultas diarias, 50 mensuales
- **premium**: Sin límites
- **test**: Sin límite diario, 500 consultas mensuales  
- **admin**: Sin límites + acceso administrativo

### 2. Panel de Administración (`/admin`)
- Gestión completa de usuarios (crear, editar, eliminar)
- Asignación de roles
- Restablecimiento de contraseñas
- Estadísticas de uso del sistema
- Vista de actividad reciente

### 3. Base de Datos Actualizada
- Nuevas columnas: `role`, `monthly_uses`, `daily_uses`
- Función `check_usage_limits()` para verificar límites
- Políticas RLS actualizadas para administradores
- Función `get_user_role()` para evitar recursión

### 4. Sistema de Límites Mejorado
- Verificación automática basada en roles
- Mensajes de error personalizados
- Tracking de uso en tiempo real

## 🔧 Configuración del Usuario Admin

**IMPORTANTE**: Debes crear manualmente el usuario admin en Supabase:

### Paso 1: Crear Usuario en Supabase Auth
1. Ve a [Supabase Dashboard → Authentication → Users](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/auth/users)
2. Haz clic en "Add user"
3. Usa estos datos:
   - **Email**: `admin@aware.doctor`
   - **Password**: `admin`
   - **Confirm Password**: `admin`
   - **Auto Confirm User**: ✅ (marcado)

### Paso 2: Verificar Configuración
1. El usuario se creará automáticamente en la tabla `users` con rol `admin`
2. Accede a `/admin` con las credenciales:
   - **Usuario**: `admin@aware.doctor`
   - **Contraseña**: `admin`
3. El sistema forzará el cambio de contraseña en el primer login

## 📊 Estructura de Roles y Límites

| Rol | Límite Diario | Límite Mensual | Características |
|-----|---------------|----------------|-----------------|
| **free** | 3 | 50 | Usuario estándar |
| **test** | ∞ | 500 | Para pruebas extendidas |
| **premium** | ∞ | ∞ | Usuario premium |
| **admin** | ∞ | ∞ | + Panel administrativo |

## 🛡️ Seguridad

- Solo usuarios admin pueden acceder al panel de administración
- Políticas RLS impiden acceso no autorizado
- Verificación de permisos en cada operación
- Cambio obligatorio de contraseña en primer login del admin

## 🔗 Accesos

- **Panel Admin**: [https://ai.aware.doctor/admin](https://ai.aware.doctor/admin)
- **Supabase Users**: [Gestión de Usuarios](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/auth/users)
- **Supabase Auth Settings**: [Configuración Auth](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/auth/providers)

## ⚠️ Advertencias de Seguridad

El sistema ha detectado algunas advertencias de seguridad menores:
1. **OTP long expiry**: Configuración recomendada en Auth
2. **Leaked Password Protection**: Activar en configuración de Auth
3. **Postgres version**: Actualización disponible

Estas no afectan la funcionalidad principal pero se recomiendan para máxima seguridad.

## 🎯 Próximos Pasos

1. **Crear usuario admin** siguiendo los pasos arriba
2. **Probar el panel de administración** en `/admin`
3. **Crear usuarios de prueba** con diferentes roles
4. **Configurar límites** según necesidades del negocio

---

✅ **Estado**: Módulo completamente implementado y listo para uso.