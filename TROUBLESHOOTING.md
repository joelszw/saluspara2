# 🔧 Guía de Solución de Problemas - Salustia

Esta guía te ayudará a resolver los problemas más comunes.

---

## 📋 Índice de Problemas

1. [Errores de Base de Datos](#errores-de-base-de-datos)
2. [Problemas con Edge Functions](#problemas-con-edge-functions)
3. [Errores de Autenticación](#errores-de-autenticación)
4. [Problemas de Build/Deploy](#problemas-de-builddeploy)
5. [Errores de CORS](#errores-de-cors)
6. [Problemas de Performance](#problemas-de-performance)

---

## Errores de Base de Datos

### ❌ "relation does not exist"

**Causa:** Tabla o columna no creada en la base de datos.

**Solución:**

```sql
-- Verificar tablas existentes
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ejecutar DATABASE_EXPORT.sql completo
-- Ir a Supabase Dashboard → SQL Editor
-- Pegar y ejecutar DATABASE_EXPORT.sql
```

### ❌ "new row violates row-level security policy"

**Causa:** RLS bloqueando la operación.

**Solución:**

```sql
-- Verificar políticas RLS
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Temporalmente deshabilitar RLS para debug (NO EN PRODUCCIÓN)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Verificar que el usuario tenga el rol correcto
SELECT * FROM user_roles WHERE user_id = 'tu-user-id';

-- Re-habilitar RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### ❌ "infinite recursion detected in policy"

**Causa:** Política RLS que referencia la misma tabla.

**Solución:**

```sql
-- Usar función SECURITY DEFINER
-- Ya implementado en has_role() y get_user_primary_role()

-- Verificar que uses has_role() en vez de checks directos
-- MAL:
CREATE POLICY "..." ON users USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- BIEN:
CREATE POLICY "..." ON users USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);
```

### ❌ "column does not exist"

**Causa:** Migraciones no ejecutadas o columna eliminada.

**Solución:**

```sql
-- Verificar columnas de una tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tu_tabla' AND table_schema = 'public';

-- Agregar columna faltante (ejemplo)
ALTER TABLE queries ADD COLUMN IF NOT EXISTS summary text;
```

---

## Problemas con Edge Functions

### ❌ Function retorna 500 Internal Server Error

**Debug:**

```bash
# Ver logs en tiempo real
supabase functions logs nombre-funcion --tail

# Ver logs recientes
supabase functions logs nombre-funcion --since 1h
```

**Causas comunes:**

1. **Secreto no configurado**
   ```bash
   # Listar secretos
   supabase secrets list
   
   # Agregar secreto faltante
   supabase secrets set NOMBRE_SECRETO=valor
   ```

2. **Error en código**
   - Revisa logs para stack trace
   - Verifica imports de Deno
   - Asegúrate de usar `https://` URLs en imports

3. **Timeout**
   ```typescript
   // Agregar timeout a fetch
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s
   
   const response = await fetch(url, {
     signal: controller.signal
   });
   
   clearTimeout(timeoutId);
   ```

### ❌ CORS Error en Function

**Síntoma:** Error en consola del navegador: "blocked by CORS policy"

**Solución:**

```typescript
// Asegúrate de tener CORS headers en TODAS las responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OPTIONS handler
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Todas las responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### ❌ Function no se invoca desde frontend

**Verificar:**

```typescript
// 1. Verificar nombre de función
const { data, error } = await supabase.functions.invoke('nombre-correcto', {
  body: { ... }
});

// 2. Verificar supabase/config.toml
[functions.nombre-correcto]
verify_jwt = false  # o true según necesites

// 3. Verificar que esté desplegada
// supabase functions list
```

---

## Errores de Autenticación

### ❌ "Invalid login credentials"

**Causas:**
1. Email/contraseña incorrectos
2. Usuario no existe
3. Usuario no confirmado (si email confirmation está activa)

**Solución:**

```typescript
// Verificar si usuario existe
const { data: users } = await supabase
  .from('users')
  .select('email')
  .eq('email', email);

console.log('User exists:', users?.length > 0);

// Para desarrollo: confirmar usuario manualmente
// Supabase Dashboard → Authentication → Users → [usuario] → Confirm user
```

### ❌ "User already registered"

**Solución:**

```typescript
// Intentar login en vez de signup
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// O recuperar contraseña
const { error } = await supabase.auth.resetPasswordForEmail(email);
```

### ❌ Session no persiste (se desloguea)

**Causa:** Problemas con localStorage o cookies

**Solución:**

```typescript
// Verificar configuración del cliente
const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Verificar en DevTools → Application → Local Storage
// Debe haber key: supabase.auth.token
```

### ❌ "Auth session missing!"

**Causa:** Usuario no autenticado intentando acción que requiere auth

**Solución:**

```typescript
// Siempre verificar sesión antes de operaciones protegidas
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  // Redirigir a login
  navigate('/auth');
  return;
}

// Continuar con operación
```

---

## Problemas de Build/Deploy

### ❌ Build falla: "Cannot find module"

**Solución:**

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar imports
# Usar rutas relativas correctas
import { Component } from '@/components/Component';  # ✅
import { Component } from '../components/Component';  # ✅
import { Component } from 'components/Component';     # ❌
```

### ❌ "Out of memory" durante build

**Solución:**

```bash
# Aumentar heap de Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# En Vercel: Project Settings → Environment Variables
NODE_OPTIONS=--max-old-space-size=4096
```

### ❌ Build exitoso pero página blanca

**Debug:**

```javascript
// 1. Abrir DevTools Console
// 2. Buscar errores JavaScript

// 3. Verificar que index.html cargue correctamente
// 4. Verificar rutas de assets

// 5. Verificar configuración de SPA
// Para Vercel: vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}

// Para Netlify: netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### ❌ TypeScript errors en build

**Solución:**

```bash
# Verificar tsconfig.json
# Asegurarse de que incluya todos los archivos necesarios

# Temporal: Saltear errores de tipo (NO RECOMENDADO)
# vite.config.ts
export default defineConfig({
  build: {
    // ...
  },
  esbuild: {
    logLevel: 'error'
  }
});
```

---

## Errores de CORS

### ❌ CORS error al llamar Edge Function

**Ya cubierto arriba en [CORS Error en Function](#-cors-error-en-function)**

### ❌ CORS error al llamar API externa

**Solución:**

```typescript
// NUNCA llamar APIs externas directamente desde frontend
// Usar Edge Function como proxy

// ❌ MAL (CORS error)
const response = await fetch('https://api-externa.com/endpoint');

// ✅ BIEN (via Edge Function)
const { data } = await supabase.functions.invoke('proxy-api-externa', {
  body: { ... }
});

// En la Edge Function:
const response = await fetch('https://api-externa.com/endpoint', {
  headers: {
    'Authorization': `Bearer ${Deno.env.get('API_KEY')}`
  }
});
```

---

## Problemas de Performance

### 🐌 App carga lento

**Optimizaciones:**

```typescript
// 1. Lazy loading de rutas
const Admin = lazy(() => import('./pages/Admin'));

<Suspense fallback={<Loading />}>
  <Admin />
</Suspense>

// 2. Lazy loading de componentes pesados
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// 3. Memoizar componentes
const MemoizedComponent = memo(MyComponent);

// 4. Optimizar queries de Supabase
// ❌ MAL: Trae todo
const { data } = await supabase.from('queries').select('*');

// ✅ BIEN: Solo campos necesarios + limit
const { data } = await supabase
  .from('queries')
  .select('id, prompt, timestamp')
  .limit(10);

// 5. Usar índices en DB
CREATE INDEX idx_queries_timestamp ON queries(timestamp DESC);
```

### 🐌 Edge Function tarda mucho

**Debug:**

```typescript
// Agregar logging de tiempo
console.time('operation');
const result = await someOperation();
console.timeEnd('operation');

// Verificar timeouts de APIs externas
const controller = new AbortController();
setTimeout(() => controller.abort(), 25000);

const response = await fetch(url, {
  signal: controller.signal
});
```

### 🐌 Demasiadas re-renders

**Solución:**

```typescript
// 1. Usar React DevTools Profiler
// 2. Identificar componentes que re-renderizan

// 3. Usar useMemo para cálculos pesados
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// 4. Usar useCallback para funciones
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);

// 5. Evitar crear objetos/arrays en render
// ❌ MAL
<Component style={{ margin: 10 }} />

// ✅ BIEN
const styles = { margin: 10 };
<Component style={styles} />
```

---

## 🆘 Último Recurso

Si nada funciona:

1. **Revisar logs en orden:**
   - Console del navegador
   - Network tab
   - Supabase Function Logs
   - Supabase Database Logs

2. **Preguntar en comunidad:**
   - [Discord de Lovable](https://discord.com/channels/1119885301872070706/1280461670979993613)
   - [Supabase Discord](https://discord.supabase.com/)

3. **Crear issue en GitHub** con:
   - Descripción del problema
   - Pasos para reproducir
   - Logs de error
   - Versiones de dependencias

4. **Rollback a versión anterior:**
   - En Lovable: Usar historial de versiones
   - En Vercel/Netlify: Rollback desde dashboard
   - En Git: `git revert` o `git reset`

---

## ✅ Checklist de Debug General

Cuando algo no funciona, sigue este orden:

1. [ ] Revisar console del navegador
2. [ ] Revisar Network tab (peticiones fallidas)
3. [ ] Verificar que usuario esté autenticado (si aplica)
4. [ ] Verificar RLS policies en Supabase
5. [ ] Revisar logs de Edge Functions
6. [ ] Verificar que secretos estén configurados
7. [ ] Verificar conexión a internet
8. [ ] Limpiar caché del navegador
9. [ ] Probar en modo incógnito
10. [ ] Probar en otro navegador

---

**¿Encontraste un error que no está aquí?** 

Documéntalo y agrégalo a este archivo para ayudar a otros. 🙏
