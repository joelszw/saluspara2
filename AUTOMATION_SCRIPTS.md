# 🤖 Scripts de Automatización - Salustia Medical Assistant

Scripts útiles para automatizar tareas comunes de deployment, backup, y mantenimiento.

---

## 📋 Tabla de Contenidos

1. [Setup y Deploy](#setup-y-deploy)
2. [Backup Automático](#backup-automático)
3. [Monitoreo y Alertas](#monitoreo-y-alertas)
4. [Mantenimiento de Base de Datos](#mantenimiento-de-base-de-datos)
5. [CI/CD Pipeline](#cicd-pipeline)

---

## 🚀 Setup y Deploy

### Script de Instalación Completa

**`install.sh`** - Instala el proyecto desde cero

```bash
#!/bin/bash

echo "🚀 Instalando Salustia Medical Assistant..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instala Node.js >= 18"
    exit 1
fi

echo "✅ Node.js instalado: $(node -v)"

# Instalar dependencias
echo "📦 Instalando dependencias npm..."
npm install

# Instalar Supabase CLI
echo "⚡ Instalando Supabase CLI..."
npm install -g supabase

# Verificar instalación
if ! command -v supabase &> /dev/null; then
    echo "❌ Error instalando Supabase CLI"
    exit 1
fi

echo "✅ Supabase CLI instalado: $(supabase -v)"

# Login a Supabase
echo "🔐 Iniciando sesión en Supabase..."
supabase login

# Preguntar project-ref
read -p "Ingresa el project-ref de Supabase: " PROJECT_REF

# Link al proyecto
echo "🔗 Conectando al proyecto Supabase..."
supabase link --project-ref $PROJECT_REF

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones de base de datos..."
supabase db push

# Deploy edge functions
echo "⚡ Desplegando Edge Functions..."
supabase functions deploy

echo ""
echo "✨ Instalación completada!"
echo "Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
```

Uso:
```bash
chmod +x install.sh
./install.sh
```

---

### Script de Deploy Completo

**`deploy.sh`** - Despliega todo (frontend + backend)

```bash
#!/bin/bash

set -e  # Salir si hay error

echo "🚀 Desplegando Salustia Medical Assistant..."

# Variables
PROJECT_REF="injvwmsqinrcthgdlvux"
FRONTEND_BUILD_DIR="dist"

# 1. Build del frontend
echo "📦 Construyendo frontend..."
npm run build

if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
    echo "❌ Error: Build falló"
    exit 1
fi

echo "✅ Frontend construido exitosamente"

# 2. Deploy de Edge Functions
echo "⚡ Desplegando Edge Functions..."

FUNCTIONS=(
    "ask-medgemma"
    "admin-reset-password"
    "change-password"
    "europe-pmc-search"
    "export-history"
    "generate-summary"
    "promote-admin"
    "pubmed-search"
    "send-contact-email"
    "send-recovery-email"
)

for func in "${FUNCTIONS[@]}"; do
    echo "  Desplegando $func..."
    supabase functions deploy $func --project-ref $PROJECT_REF
done

echo "✅ Edge Functions desplegadas"

# 3. Ejecutar migraciones pendientes
echo "🗄️ Verificando migraciones..."
supabase db push --project-ref $PROJECT_REF

echo ""
echo "✨ Deploy completado exitosamente!"
echo "🌐 Tu app está lista en: https://app.lovable.dev/projects/[tu-proyecto]"
```

Uso:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

### Script de Configuración de Secretos

**`setup-secrets.sh`** - Configura todos los secretos de Supabase

```bash
#!/bin/bash

echo "🔐 Configurando secretos de Supabase..."

PROJECT_REF="injvwmsqinrcthgdlvux"

# Array de secretos requeridos
declare -A SECRETS=(
    ["HUGGINGFACE_API_TOKEN"]="Token de HuggingFace para IA"
    ["RESEND_API_KEY"]="API Key de Resend para emails"
    ["TURNSTILE_SECRET"]="Secret de Cloudflare Turnstile"
    ["SUPABASE_SERVICE_ROLE_KEY"]="Service Role Key de Supabase"
)

# Pedir cada secreto al usuario
for secret in "${!SECRETS[@]}"; do
    echo ""
    echo "📝 ${SECRETS[$secret]}"
    read -sp "Ingresa $secret: " value
    echo ""
    
    # Configurar en Supabase
    echo "$value" | supabase secrets set $secret --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo "✅ $secret configurado"
    else
        echo "❌ Error configurando $secret"
    fi
done

echo ""
echo "✨ Todos los secretos configurados!"

# Verificar secretos
echo ""
echo "🔍 Secretos configurados:"
supabase secrets list --project-ref $PROJECT_REF
```

Uso:
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

---

## 💾 Backup Automático

### Script de Backup Diario

**`backup-daily.sh`** - Backup automático de base de datos

```bash
#!/bin/bash

# Configuración
PROJECT_REF="injvwmsqinrcthgdlvux"
DB_PASSWORD="tu-password-aqui"
BACKUP_DIR="/backups/salustia"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Ejecutar backup
echo "🗄️ Iniciando backup de base de datos..."

supabase db dump \
  --db-url "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
  > "$BACKUP_DIR/salustia_backup_$DATE.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup completado: salustia_backup_$DATE.sql"
    
    # Comprimir backup
    gzip "$BACKUP_DIR/salustia_backup_$DATE.sql"
    echo "✅ Backup comprimido"
else
    echo "❌ Error creando backup"
    exit 1
fi

# Limpiar backups antiguos
echo "🧹 Limpiando backups antiguos (>$RETENTION_DAYS días)..."
find $BACKUP_DIR -name "salustia_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Contar backups restantes
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/salustia_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Total de backups: $BACKUP_COUNT"

echo "✨ Backup completado exitosamente!"
```

**Automatizar con cron (Linux/Mac):**

```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /path/to/backup-daily.sh >> /var/log/salustia-backup.log 2>&1
```

---

### Script de Backup a S3/Cloud Storage

**`backup-to-cloud.sh`** - Sube backups a AWS S3

```bash
#!/bin/bash

# Configuración
BACKUP_DIR="/backups/salustia"
S3_BUCKET="s3://tu-bucket/salustia-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear backup local
./backup-daily.sh

# Subir a S3
echo "☁️ Subiendo backup a S3..."

aws s3 cp \
  "$BACKUP_DIR/salustia_backup_$DATE.sql.gz" \
  "$S3_BUCKET/salustia_backup_$DATE.sql.gz"

if [ $? -eq 0 ]; then
    echo "✅ Backup subido a S3"
else
    echo "❌ Error subiendo a S3"
    exit 1
fi

echo "✨ Backup en cloud completado!"
```

---

## 📊 Monitoreo y Alertas

### Script de Health Check

**`health-check.sh`** - Verifica estado del sistema

```bash
#!/bin/bash

PROJECT_REF="injvwmsqinrcthgdlvux"
APP_URL="https://injvwmsqinrcthgdlvux.supabase.co"

echo "🏥 Health Check - Salustia Medical Assistant"
echo "==========================================="

# 1. Check Frontend
echo ""
echo "🌐 Verificando Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://salustia.lovable.app)

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend OK (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend DOWN (HTTP $FRONTEND_STATUS)"
fi

# 2. Check Supabase API
echo ""
echo "🗄️ Verificando Supabase API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/rest/v1/")

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "401" ]; then
    echo "✅ Supabase API OK (HTTP $API_STATUS)"
else
    echo "❌ Supabase API DOWN (HTTP $API_STATUS)"
fi

# 3. Check Edge Functions
echo ""
echo "⚡ Verificando Edge Functions..."

FUNCTIONS=("ask-medgemma" "pubmed-search" "export-history")

for func in "${FUNCTIONS[@]}"; do
    FUNC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$APP_URL/functions/v1/$func" \
      -H "Authorization: Bearer tu-anon-key")
    
    if [ "$FUNC_STATUS" = "200" ] || [ "$FUNC_STATUS" = "400" ] || [ "$FUNC_STATUS" = "401" ]; then
        echo "✅ $func OK (HTTP $FUNC_STATUS)"
    else
        echo "❌ $func DOWN (HTTP $FUNC_STATUS)"
    fi
done

# 4. Check Database
echo ""
echo "🗄️ Verificando Base de Datos..."

# Simple query para verificar conexión
supabase db execute --project-ref $PROJECT_REF \
  --sql "SELECT COUNT(*) FROM public.users;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Base de Datos OK"
else
    echo "❌ Base de Datos DOWN"
fi

echo ""
echo "==========================================="
echo "✨ Health Check Completado"
```

**Automatizar con cron cada 5 minutos:**

```bash
*/5 * * * * /path/to/health-check.sh >> /var/log/salustia-health.log 2>&1
```

---

### Script de Alertas por Email

**`alert-email.sh`** - Envía alertas por email

```bash
#!/bin/bash

# Configuración
ALERT_EMAIL="admin@example.com"
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Función para enviar email
send_alert() {
    local subject=$1
    local body=$2
    
    echo "$body" | mail -s "$subject" \
      -S smtp="$SMTP_SERVER:$SMTP_PORT" \
      -S smtp-auth=login \
      -S smtp-auth-user="$SMTP_USER" \
      -S smtp-auth-password="$SMTP_PASS" \
      -S smtp-use-starttls \
      $ALERT_EMAIL
}

# Ejecutar health check y capturar resultado
HEALTH_OUTPUT=$(./health-check.sh 2>&1)

# Verificar si hay errores
if echo "$HEALTH_OUTPUT" | grep -q "❌"; then
    send_alert \
      "🚨 Alerta: Salustia Health Check Failed" \
      "$HEALTH_OUTPUT"
    echo "📧 Alerta enviada a $ALERT_EMAIL"
fi
```

---

## 🗄️ Mantenimiento de Base de Datos

### Script de Limpieza de Datos Antiguos

**`cleanup-old-data.sql`** - Limpia datos antiguos

```sql
-- Eliminar queries de más de 1 año para usuarios free
DELETE FROM public.queries
WHERE timestamp < NOW() - INTERVAL '1 year'
  AND user_id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'free'
  );

-- Eliminar eventos de seguridad de más de 6 meses
DELETE FROM public.security_events
WHERE created_at < NOW() - INTERVAL '6 months';

-- Eliminar registros de uso de funciones de más de 3 meses
DELETE FROM public.function_usage
WHERE created_at < NOW() - INTERVAL '3 months';

-- Vacuum para recuperar espacio
VACUUM ANALYZE public.queries;
VACUUM ANALYZE public.security_events;
VACUUM ANALYZE public.function_usage;

-- Reportar espacio liberado
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Script Bash para ejecutarlo:**

```bash
#!/bin/bash
# cleanup-database.sh

PROJECT_REF="injvwmsqinrcthgdlvux"

echo "🧹 Limpiando base de datos..."

supabase db execute \
  --project-ref $PROJECT_REF \
  --file cleanup-old-data.sql

echo "✅ Limpieza completada"
```

---

### Script de Optimización de Índices

**`optimize-indexes.sql`** - Optimiza índices de la BD

```sql
-- Reindexar todas las tablas
REINDEX TABLE public.users;
REINDEX TABLE public.user_roles;
REINDEX TABLE public.queries;
REINDEX TABLE public.security_events;
REINDEX TABLE public.function_usage;

-- Actualizar estadísticas
ANALYZE public.users;
ANALYZE public.user_roles;
ANALYZE public.queries;
ANALYZE public.security_events;
ANALYZE public.function_usage;

-- Identificar índices no utilizados
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**`.github/workflows/deploy.yml`** - CI/CD automático

```yaml
name: Deploy Salustia

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Deploy Edge Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_REF: injvwmsqinrcthgdlvux
        run: |
          supabase functions deploy --project-ref $PROJECT_REF
          
      - name: Run Database Migrations
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_REF: injvwmsqinrcthgdlvux
        run: |
          supabase db push --project-ref $PROJECT_REF
```

---

### Script de Rollback Rápido

**`rollback.sh`** - Rollback a versión anterior

```bash
#!/bin/bash

echo "⏪ Rollback de Salustia Medical Assistant"

# Listar últimos 10 commits
echo "Últimos commits disponibles:"
git log --oneline -10

# Pedir commit hash
read -p "Ingresa el hash del commit para rollback: " COMMIT_HASH

# Confirmar
read -p "¿Confirmas rollback a $COMMIT_HASH? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Rollback cancelado"
    exit 0
fi

# Crear branch de backup
BACKUP_BRANCH="backup-$(date +%Y%m%d_%H%M%S)"
git branch $BACKUP_BRANCH

echo "✅ Backup creado en branch: $BACKUP_BRANCH"

# Hacer rollback
git reset --hard $COMMIT_HASH

# Push forzado (cuidado!)
read -p "¿Push forzado a main? (y/n): " PUSH_CONFIRM

if [ "$PUSH_CONFIRM" = "y" ]; then
    git push origin main --force
    echo "✅ Rollback completado y pusheado"
else
    echo "ℹ️ Rollback local completado (no pusheado)"
fi
```

---

## 📝 Package.json Scripts Útiles

Agregar a `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "./deploy.sh",
    "backup": "./backup-daily.sh",
    "health": "./health-check.sh",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "functions:deploy": "supabase functions deploy"
  }
}
```

---

Made with ❤️ using Lovable
