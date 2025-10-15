# 📦 Kit de Exportación - Salustia Medical Assistant

Este kit contiene todo lo necesario para replicar el proyecto Salustia en otro entorno (servidor local, otro Lovable, etc.).

## 📋 Contenido del Kit

1. **Código Fuente** - Todo el código React/TypeScript
2. **Base de Datos** - SQL completo de estructura y datos
3. **Edge Functions** - Funciones serverless de Supabase
4. **Configuración** - Variables de entorno y configuraciones
5. **Documentación** - Guías completas de funcionalidad
6. **Assets** - Imágenes y recursos estáticos

---

## 🚀 Pasos para Exportar desde Lovable

### 1. Conectar a GitHub (RECOMENDADO)

La forma más fácil de exportar todo el código:

1. Click en el botón **GitHub** en la esquina superior derecha
2. Selecciona **Connect to GitHub**
3. Autoriza la app de Lovable en GitHub
4. Click en **Create Repository**
5. El código se sincronizará automáticamente

**Ventajas:**
- Sincronización bidireccional automática
- Control de versiones completo
- Puedes trabajar localmente con Git
- Fácil colaboración en equipo

### 2. Descargar Código Manualmente

Si no usas GitHub:

1. Activa **Dev Mode** (toggle arriba a la izquierda)
2. Ve a Account Settings → Labs → Enable Code Editing
3. Copia cada archivo manualmente

---

## 💾 Exportar Base de Datos Supabase

### Exportar Estructura (Schema)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux)
2. Navega a **SQL Editor**
3. Ejecuta este comando para obtener el schema completo:

```sql
-- Exportar estructura completa
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Para cada tabla, obtén el DDL completo desde el Table Editor
```

4. O usa el archivo `DATABASE_EXPORT.sql` incluido en este kit

### Exportar Datos

```sql
-- Exportar usuarios
COPY (SELECT * FROM public.users) TO STDOUT WITH CSV HEADER;

-- Exportar roles
COPY (SELECT * FROM public.user_roles) TO STDOUT WITH CSV HEADER;

-- Exportar queries
COPY (SELECT * FROM public.queries) TO STDOUT WITH CSV HEADER;

-- Exportar eventos de seguridad
COPY (SELECT * FROM public.security_events) TO STDOUT WITH CSV HEADER;

-- Exportar uso de funciones
COPY (SELECT * FROM public.function_usage) TO STDOUT WITH CSV HEADER;
```

### Exportar Funciones y Triggers

El archivo `DATABASE_EXPORT.sql` incluye:
- ✅ Todas las funciones SQL
- ✅ Todos los triggers
- ✅ Todas las políticas RLS
- ✅ Tipos de datos personalizados (enums)

---

## ⚙️ Exportar Edge Functions

Las edge functions están en la carpeta `supabase/functions/`:

```
supabase/functions/
├── ask-medgemma/
├── admin-reset-password/
├── change-password/
├── europe-pmc-search/
├── export-history/
├── generate-summary/
├── promote-admin/
├── pubmed-search/
└── send-contact-email/
```

Cada función tiene su propio `index.ts`. Copia toda la carpeta.

---

## 🔐 Variables de Entorno y Secretos

### Secretos de Supabase Requeridos

Ve a: [Supabase Functions Secrets](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/settings/functions)

**Lista de secretos configurados:**

```bash
# Supabase
SUPABASE_URL=https://injvwmsqinrcthgdlvux.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[configurar]
SUPABASE_ANON_KEY=[configurar]
SUPABASE_DB_URL=[configurar]

# HuggingFace (AI)
HUGGINGFACE_API_TOKEN=[configurar]
HUGGINGFACE_MODEL_ID=meta-llama/Llama-3.3-70B-Instruct

# Email (Resend)
RESEND_API_KEY=[configurar]

# Seguridad
TURNSTILE_SECRET=[configurar]
ALLOWED_PROMOTION_EMAILS=[configurar - emails separados por comas]
```

### Frontend (.env local)

NO hay archivo `.env` en Lovable, pero para desarrollo local necesitarás:

```bash
# .env.local (crear manualmente para local)
VITE_SUPABASE_URL=https://injvwmsqinrcthgdlvux.supabase.co
VITE_SUPABASE_ANON_KEY=[tu-anon-key]
VITE_TURNSTILE_SITE_KEY=[tu-site-key si usas Turnstile]
```

**IMPORTANTE:** Estos valores ya están hardcodeados en `src/integrations/supabase/client.ts` para Lovable.

---

## 📁 Estructura del Proyecto

```
salustia-medical-assistant/
├── src/                          # Código fuente React
│   ├── components/              # Componentes reutilizables
│   │   ├── admin/              # Panel de administración
│   │   ├── auth/               # Autenticación
│   │   ├── chat/               # Chat médico
│   │   ├── medical/            # Componentes médicos
│   │   ├── navigation/         # Navegación
│   │   ├── references/         # Referencias PubMed
│   │   ├── sections/           # Secciones de landing
│   │   ├── theme-provider.tsx  # Tema dark/light
│   │   └── ui/                 # Componentes UI base
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/           # Integraciones externas
│   │   └── supabase/           # Cliente Supabase
│   ├── lib/                     # Utilidades
│   ├── pages/                   # Páginas principales
│   ├── App.tsx                  # App principal
│   ├── index.css               # Estilos globales
│   └── main.tsx                # Entry point
├── supabase/                    # Backend Supabase
│   ├── functions/              # Edge Functions
│   │   ├── ask-medgemma/       # Chat con IA médica
│   │   ├── admin-reset-password/
│   │   ├── change-password/
│   │   ├── europe-pmc-search/
│   │   ├── export-history/
│   │   ├── generate-summary/
│   │   ├── promote-admin/
│   │   ├── pubmed-search/
│   │   └── send-contact-email/
│   └── config.toml             # Configuración functions
├── public/                      # Assets estáticos
├── index.html                   # HTML base
├── package.json                 # Dependencias npm
├── vite.config.ts              # Configuración Vite
├── tailwind.config.ts          # Configuración Tailwind
├── tsconfig.json               # Configuración TypeScript
└── README.md                    # Documentación
```

---

## 🛠️ Instalación en Servidor Local

### Prerrequisitos

```bash
node >= 18
npm >= 9
supabase CLI (opcional pero recomendado)
```

### Pasos

1. **Clonar/Copiar el código**

```bash
git clone [tu-repo-github]
cd salustia-medical-assistant
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar Supabase**

Opción A - Conectar a proyecto existente:
```bash
# Editar src/integrations/supabase/client.ts
# Ya tiene las URLs correctas
```

Opción B - Crear nuevo proyecto Supabase:
```bash
# Ir a https://supabase.com
# Crear nuevo proyecto
# Ejecutar DATABASE_EXPORT.sql en SQL Editor
# Actualizar URLs en client.ts
```

4. **Configurar Edge Functions**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref injvwmsqinrcthgdlvux

# Configurar secretos
supabase secrets set HUGGINGFACE_API_TOKEN=tu_token
supabase secrets set RESEND_API_KEY=tu_key
# ... etc

# Deploy functions
supabase functions deploy
```

5. **Ejecutar en desarrollo**

```bash
npm run dev
```

El proyecto estará en `http://localhost:5173`

---

## 🔄 Importar en Otro Lovable

### Método 1: Via GitHub (RECOMENDADO)

1. Conecta el proyecto actual a GitHub (ver arriba)
2. En el nuevo Lovable:
   - Crea proyecto nuevo
   - Conecta a GitHub
   - Selecciona el mismo repositorio
3. El código se sincronizará automáticamente

### Método 2: Copia Manual

1. Crea nuevo proyecto en Lovable
2. Activa Dev Mode
3. Copia archivos uno por uno desde este proyecto
4. Usa el archivo `PROMPT_FUNCIONAL.md` para recrear con IA

**IMPORTANTE:** 
- La base de datos NO se copia automáticamente
- Debes ejecutar `DATABASE_EXPORT.sql` en el nuevo proyecto Supabase
- Debes configurar los secretos manualmente en Supabase

---

## 📚 Archivos de Documentación Incluidos

| Archivo | Descripción |
|---------|-------------|
| `PROMPT_FUNCIONAL.md` | Prompt completo para recrear el proyecto |
| `DATABASE_EXPORT.sql` | Export completo de base de datos |
| `EDGE_FUNCTIONS_GUIDE.md` | Guía de edge functions |
| `SECURITY_SETUP.md` | Configuración de seguridad |
| `DEPLOYMENT_GUIDE.md` | Guía de despliegue |
| `API_DOCUMENTATION.md` | Documentación de APIs |

---

## ⚠️ Consideraciones Importantes

### Seguridad

1. **NUNCA** expongas secretos en el código
2. **SIEMPRE** usa Supabase Secrets para API keys
3. **VERIFICA** que RLS esté habilitado en todas las tablas
4. **REVISA** las políticas de seguridad después de importar

### Base de Datos

1. Ejecuta las migraciones en **orden secuencial**
2. Verifica que todos los triggers se crearon correctamente
3. Valida que las funciones de seguridad funcionan:
   ```sql
   SELECT has_role('user-id-aqui'::uuid, 'admin'::app_role);
   ```

### Edge Functions

1. Las functions requieren Deno runtime (automático en Supabase)
2. Configura **TODOS** los secretos antes de desplegar
3. Verifica los logs en caso de errores:
   - [Function Logs](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/functions)

---

## 🆘 Soporte

### Recursos Oficiales

- [Documentación Lovable](https://docs.lovable.dev/)
- [Documentación Supabase](https://supabase.com/docs)
- [Comunidad Discord Lovable](https://discord.com/channels/1119885301872070706/1280461670979993613)

### Archivos de Ayuda en Este Kit

- `TROUBLESHOOTING.md` - Solución de problemas comunes
- `FAQ.md` - Preguntas frecuentes
- `ARCHITECTURE.md` - Arquitectura del sistema

---

## ✅ Checklist de Exportación

Antes de migrar, asegúrate de tener:

- [ ] Código fuente (via GitHub o copia manual)
- [ ] `DATABASE_EXPORT.sql` ejecutado
- [ ] Edge functions copiadas
- [ ] `supabase/config.toml` configurado
- [ ] Todos los secretos de Supabase configurados
- [ ] Variables de entorno para frontend (.env.local)
- [ ] Documentación (`PROMPT_FUNCIONAL.md`, etc.)
- [ ] Assets y archivos públicos
- [ ] Dependencias instaladas (`npm install`)
- [ ] Proyecto ejecutándose (`npm run dev`)

---

## 📝 Notas Finales

Este proyecto usa:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Llama 3.3 70B via HuggingFace Router
- **Auth**: Supabase Auth + Cloudflare Turnstile
- **Email**: Resend API

**El proyecto está 100% funcional y seguro después de las últimas correcciones de seguridad aplicadas.**

---

Made with ❤️ using Lovable
