# ⚡ Quick Start - Exportar e Importar Salustia

## 🎯 Exportación Rápida (3 pasos)

### 1️⃣ Exportar Código
```bash
# Conectar a GitHub (lo más fácil)
# Click en botón GitHub → Connect → Create Repository
```

### 2️⃣ Exportar Base de Datos
```sql
-- Ir a Supabase SQL Editor
-- Ejecutar DATABASE_EXPORT.sql (incluido en este kit)
```

### 3️⃣ Exportar Edge Functions
```bash
# Las funciones ya están en supabase/functions/
# Copiar toda la carpeta o usar GitHub
```

## 🚀 Importación Rápida (4 pasos)

### 1️⃣ Clonar Código
```bash
git clone tu-repo-github
cd proyecto
npm install
```

### 2️⃣ Crear Proyecto Supabase
- Ir a supabase.com → Crear proyecto
- Ejecutar `DATABASE_EXPORT.sql` en SQL Editor

### 3️⃣ Configurar Secretos
```bash
supabase link --project-ref tu-proyecto-ref
supabase secrets set HUGGINGFACE_API_TOKEN=xxx
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set TURNSTILE_SECRET=xxx
supabase secrets set ALLOWED_PROMOTION_EMAILS=admin@example.com
```

### 4️⃣ Desplegar Functions
```bash
supabase functions deploy
```

## ✅ Listo!
```bash
npm run dev  # Local
# O deploy a Vercel/Netlify
```

## 📚 Archivos del Kit

- **EXPORT_KIT_README.md** - Guía completa de exportación
- **DATABASE_EXPORT.sql** - SQL completo de base de datos
- **DEPLOYMENT_GUIDE.md** - Guía de despliegue detallada
- **TROUBLESHOOTING.md** - Solución de problemas
- **PROMPT_FUNCIONAL.md** - Prompt para recrear con IA
- **supabase/functions/** - Edge functions

---

**Dudas?** Revisa EXPORT_KIT_README.md para instrucciones detalladas.
