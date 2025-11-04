# 🚀 Plan de Migración - BuscaCot/Salustia
## Servidor Local + Supabase Cloud

---

## 🎯 Objetivo

Migrar **BuscaCot** a tu servidor local con esta arquitectura:

```
Internet (HTTPS)
    ↓
Tu Servidor Local
    ↓
Nginx Proxy Manager (dominio: tusubdominio.tudominio.com)
    ↓
Frontend Docker (React + Vite)
    ↓
Supabase Cloud (NUEVO proyecto, NO el actual)
    ↓
Edge Functions + PostgreSQL
```

**Ventajas:**
- ✅ Frontend en tu servidor (control total)
- ✅ Base de datos en Supabase Cloud (gratis, escalable, sin mantenimiento)
- ✅ Edge Functions en Supabase (serverless, fácil de actualizar)
- ✅ Backups automáticos de Supabase
- ✅ Sin necesidad de mantener PostgreSQL local

---

## 📋 Prerrequisitos

### En tu servidor local:
```bash
✅ Ubuntu 20.04+ o Debian 11+
✅ Docker y Docker Compose instalados
✅ Nginx Proxy Manager funcionando
✅ Mínimo 2GB RAM, 10GB disco
✅ Puertos 80 y 443 abiertos
```

### Cuentas necesarias:
```bash
✅ Cuenta Supabase (gratis en supabase.com)
✅ API Key de Hugging Face
✅ API Key de Resend (emails)
✅ Site Key de Cloudflare Turnstile
✅ Dominio/subdominio configurado
```

---

## 🗺️ Roadmap (5 Fases)

### **FASE 1** - Preparar GitHub ✅
- Asegurar que todo el código esté en GitHub
- Verificar que `DATABASE_EXPORT.sql` esté incluido
- Agregar archivos de configuración Docker

### **FASE 2** - Crear Nuevo Proyecto Supabase ☁️
- Crear proyecto nuevo en Supabase
- Importar schema de base de datos
- Desplegar Edge Functions
- Configurar secretos

### **FASE 3** - Preparar Servidor Local 🖥️
- Clonar repositorio
- Configurar variables de entorno
- Preparar Docker Compose

### **FASE 4** - Desplegar Frontend 🚀
- Build de Docker con variables correctas
- Configurar Nginx Proxy Manager
- Configurar SSL/HTTPS

### **FASE 5** - Pruebas y Verificación ✅
- Probar login/registro
- Probar chat con IA
- Verificar PubMed
- Crear usuario admin

---

## 📁 FASE 1: Preparar Archivos para GitHub

### 1.1. Crear Dockerfile Optimizado

**Archivo: `/Dockerfile`**

```dockerfile
# =====================================================
# BUSCACOT - FRONTEND DOCKER IMAGE
# =====================================================
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build arguments (se pasan al construir)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TURNSTILE_SITE_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# Build producción
RUN npm run build

# =====================================================
# Imagen final con Nginx
# =====================================================
FROM nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 1.2. Configuración Nginx para el Container

**Archivo: `/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA - Todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        image/svg+xml;

    # Cache para assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache para index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 1.3. Docker Compose Simple

**Archivo: `/docker-compose.yml`**

```yaml
version: '3.8'

networks:
  npm_default:
    external: true

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
        VITE_TURNSTILE_SITE_KEY: ${VITE_TURNSTILE_SITE_KEY}
    container_name: buscacot-frontend
    restart: unless-stopped
    networks:
      - npm_default
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

### 1.4. Archivo de Variables de Entorno

**Archivo: `/.env.example`**

```bash
# =====================================================
# BUSCACOT - VARIABLES DE ENTORNO
# =====================================================
# Copiar a .env y completar con tus valores
# =====================================================

# SUPABASE (del nuevo proyecto que crearás)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# TURNSTILE (Cloudflare)
VITE_TURNSTILE_SITE_KEY=tu-site-key-aqui
```

### 1.5. .dockerignore

**Archivo: `/.dockerignore`**

```
node_modules
npm-debug.log
.env
.env.*
dist
.git
.gitignore
*.md
docker-compose*.yml
.dockerignore
.vscode
.idea
coverage
*.log
```

### 1.6. Script de Deploy

**Archivo: `/scripts/deploy.sh`**

```bash
#!/bin/bash

# =====================================================
# SCRIPT DE DESPLIEGUE - BUSCACOT
# =====================================================

set -e

echo "🚀 Desplegando BuscaCot..."
echo ""

# Verificar .env
if [ ! -f .env ]; then
    echo "❌ Error: Archivo .env no encontrado"
    echo "Copia .env.example a .env y configúralo"
    exit 1
fi

# Pull últimos cambios
echo "📥 Obteniendo últimos cambios..."
git pull origin main

# Detener contenedor actual
echo "⏸️  Deteniendo contenedor actual..."
docker-compose down

# Reconstruir imagen
echo "🏗️  Reconstruyendo imagen..."
docker-compose build --no-cache

# Iniciar contenedor
echo "▶️  Iniciando contenedor..."
docker-compose up -d

# Esperar y verificar
echo "⏳ Esperando inicio..."
sleep 10

# Mostrar estado
echo ""
echo "📊 Estado:"
docker-compose ps

echo ""
echo "✅ Despliegue completado!"
echo "🔍 Verifica en: https://tu-subdominio.tudominio.com"
```

### 1.7. Script de Logs

**Archivo: `/scripts/logs.sh`**

```bash
#!/bin/bash
docker-compose logs -f --tail=100 frontend
```

### 1.8. Script de Restart

**Archivo: `/scripts/restart.sh`**

```bash
#!/bin/bash
echo "🔄 Reiniciando BuscaCot..."
docker-compose restart
echo "✅ Reiniciado!"
docker-compose ps
```

### 1.9. Hacer Scripts Ejecutables

Agregar al final del `README.md`:

```bash
# Hacer scripts ejecutables
chmod +x scripts/*.sh
```

---

## ☁️ FASE 2: Crear Nuevo Proyecto Supabase

### 2.1. Crear Proyecto

1. Ve a https://supabase.com
2. Click en **"New Project"**
3. Configuración:
   ```
   Name: BuscaCot
   Database Password: [genera una contraseña segura]
   Region: [elige la más cercana a tu ubicación]
   Plan: Free
   ```
4. Click **"Create new project"**
5. Espera 2-3 minutos mientras se crea

### 2.2. Guardar Credenciales

Una vez creado, ve a **Settings → API** y copia:

```bash
Project URL: https://xxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (SECRET!)
```

**Guárdalos en un lugar seguro**, los necesitarás después.

### 2.3. Importar Base de Datos

1. En Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Copia TODO el contenido de `DATABASE_EXPORT.sql`
4. Pégalo en el editor
5. Click **"Run"** (puede tomar 1-2 minutos)
6. Verifica que no hay errores en rojo

### 2.4. Verificar Tablas Creadas

En **Table Editor**, deberías ver:

```
✅ users
✅ user_roles
✅ queries
✅ security_events
✅ function_usage
```

### 2.5. Instalar Supabase CLI

```bash
# En tu computadora local (no en el servidor aún)
npm install -g supabase
```

### 2.6. Linkear Proyecto

```bash
# Desde la raíz del proyecto BuscaCot
supabase login

# Obtén el Project ID desde: Settings → General → Reference ID
supabase link --project-ref tu-project-ref-aqui
```

### 2.7. Desplegar Edge Functions

```bash
# Desplegar todas las funciones
supabase functions deploy

# O una por una:
supabase functions deploy ask-medgemma
supabase functions deploy pubmed-search
supabase functions deploy generate-summary
supabase functions deploy export-history
supabase functions deploy send-contact-email
supabase functions deploy change-password
supabase functions deploy admin-reset-password
supabase functions deploy promote-admin
```

### 2.8. Configurar Secretos

```bash
# Configurar API keys en Supabase
supabase secrets set HUGGINGFACE_API_TOKEN=hf_xxxxx
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set TURNSTILE_SECRET=0x4xxxxx
supabase secrets set ALLOWED_PROMOTION_EMAILS=tu-email@ejemplo.com

# Verificar
supabase secrets list
```

### 2.9. Configurar Authentication

En Supabase Dashboard:

1. **Authentication → Providers**
   - ✅ Enable Email provider
   - ✅ Confirm email: OFF (para desarrollo rápido)
   - ✅ Enable Google provider (si quieres login con Google)

2. **Authentication → URL Configuration**
   ```
   Site URL: https://tu-subdominio.tudominio.com
   Redirect URLs: https://tu-subdominio.tudominio.com/**
   ```

### 2.10. Configurar CORS (si es necesario)

En **Settings → API → CORS**:
```
Allowed Origins:
https://tu-subdominio.tudominio.com
http://localhost:5173 (para desarrollo)
```

---

## 🖥️ FASE 3: Preparar Servidor Local

### 3.1. Conectar al Servidor

```bash
ssh tu-usuario@tu-servidor-ip
```

### 3.2. Instalar Docker (si no está instalado)

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar
docker --version
docker-compose --version

# IMPORTANTE: Cerrar sesión y volver a conectar para que tome efecto
exit
ssh tu-usuario@tu-servidor-ip
```

### 3.3. Crear Estructura de Directorios

```bash
# Crear directorios
sudo mkdir -p /opt/buscacot
sudo chown -R $USER:$USER /opt/buscacot
cd /opt/buscacot
```

### 3.4. Clonar Repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/tu-usuario/tu-repo-buscacot.git .

# Verificar archivos
ls -la
```

### 3.5. Configurar Variables de Entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar con tus valores
nano .env
```

Completar `.env` con:

```bash
# SUPABASE (del proyecto que creaste en FASE 2)
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TURNSTILE
VITE_TURNSTILE_SITE_KEY=0x4xxxxxxxxx
```

**Guardar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.6. Verificar Red de Nginx Proxy Manager

```bash
# Ver redes Docker
docker network ls

# Debe existir 'npm_default' o similar
# Si no existe, créala:
docker network create npm_default
```

### 3.7. Hacer Scripts Ejecutables

```bash
chmod +x scripts/*.sh
```

---

## 🚀 FASE 4: Desplegar Frontend

### 4.1. Build y Deploy

```bash
cd /opt/buscacot

# Opción A: Usar script (recomendado)
./scripts/deploy.sh

# Opción B: Manual
docker-compose build --no-cache
docker-compose up -d
```

### 4.2. Verificar Contenedor

```bash
# Ver estado
docker-compose ps

# Debe mostrar:
# buscacot-frontend   Up   healthy

# Ver logs
docker-compose logs -f
```

### 4.3. Configurar Nginx Proxy Manager

**Acceder a NPM:**
```
http://tu-servidor-ip:81
```

**Crear Proxy Host:**

1. Click **"Proxy Hosts"** → **"Add Proxy Host"**

2. **Tab: Details**
   ```
   Domain Names: tu-subdominio.tudominio.com
   Scheme: http
   Forward Hostname/IP: buscacot-frontend
   Forward Port: 80

   ✅ Cache Assets
   ✅ Block Common Exploits
   ✅ Websockets Support
   ```

3. **Tab: SSL**
   ```
   ✅ Force SSL
   ✅ HTTP/2 Support
   ✅ HSTS Enabled

   SSL Certificate: Request a new SSL Certificate
   Email: tu-email@ejemplo.com
   ✅ I Agree to the Let's Encrypt Terms of Service
   ```

4. **Tab: Advanced** (opcional pero recomendado)
   ```nginx
   # Headers de seguridad
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header X-XSS-Protection "1; mode=block" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```

5. Click **"Save"**

### 4.4. Configurar DNS

En tu proveedor de DNS (Cloudflare, Namecheap, etc.):

```
Type: A
Name: tu-subdominio
Value: IP-DE-TU-SERVIDOR
TTL: Auto o 3600
Proxy: OFF (sin proxy, directo)
```

**Verificar DNS:**
```bash
# Desde tu PC
dig tu-subdominio.tudominio.com

# O
nslookup tu-subdominio.tudominio.com

# Debe mostrar tu IP
```

### 4.5. Esperar Propagación DNS

- Puede tomar de **5 minutos a 24 horas**
- Usualmente es rápido (10-30 mins)
- Mientras tanto, puedes probar con la IP directa

---

## ✅ FASE 5: Pruebas y Verificación

### 5.1. Verificar Frontend

Abre en navegador:
```
https://tu-subdominio.tudominio.com
```

**Checklist:**
- ✅ Página carga sin errores
- ✅ SSL (candado verde) funciona
- ✅ No hay errores en consola (F12)

### 5.2. Probar Registro de Usuario

1. Click en **"Sign Up"** o **"Register"**
2. Crea una cuenta con tu email
3. Verifica que el registro funciona

### 5.3. Probar Login

1. Inicia sesión con la cuenta creada
2. Verifica que entras al dashboard

### 5.4. Probar Chat con IA

1. Escribe una pregunta médica:
   ```
   ¿Cuáles son los síntomas de una fractura de radio?
   ```
2. Espera la respuesta (puede tomar 10-30 segundos)
3. Verifica que:
   - ✅ Recibe respuesta de la IA
   - ✅ Aparecen referencias de PubMed
   - ✅ Se genera resumen clínico
   - ✅ Aparecen sugerencias de seguimiento

### 5.5. Verificar Historial

1. Ve a la sección de **"Historial"**
2. Verifica que tu consulta anterior aparece
3. Prueba exportar historial

### 5.6. Crear Usuario Admin

**Opción A: Desde Supabase Dashboard**

1. Ve a **Authentication → Users**
2. Encuentra tu usuario
3. Copia tu User ID (UUID)
4. Ve a **SQL Editor**
5. Ejecuta:
   ```sql
   -- Ver usuarios actuales
   SELECT id, email FROM auth.users ORDER BY created_at DESC;

   -- Promover a admin (reemplaza el email)
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'tu-email@ejemplo.com'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

**Opción B: Usar la función promote-admin**

1. Asegúrate de que tu email está en `ALLOWED_PROMOTION_EMAILS`
2. Desde el frontend, llama a la función (esto puede requerir código)

### 5.7. Verificar Panel Admin

1. Logout y login nuevamente
2. Ve a `/admin`
3. Verifica que puedes acceder
4. Revisa estadísticas y lista de usuarios

### 5.8. Verificar Logs

En el servidor:

```bash
cd /opt/buscacot

# Ver logs en tiempo real
./scripts/logs.sh

# O manualmente
docker-compose logs -f

# Ver solo errores
docker-compose logs | grep -i error
```

### 5.9. Verificar Supabase Functions

En Supabase Dashboard:

1. Ve a **Edge Functions**
2. Verifica que todas las funciones están desplegadas
3. Click en cada una y ve **Logs**
4. Deberías ver las llamadas de tus pruebas

### 5.10. Checklist Final

```
✅ Frontend carga correctamente
✅ SSL/HTTPS funciona
✅ Registro de usuarios funciona
✅ Login funciona
✅ Chat con IA responde
✅ Referencias PubMed aparecen
✅ Resúmenes clínicos se generan
✅ Historial se guarda
✅ Exportar historial funciona
✅ Usuario admin creado
✅ Panel admin accesible
✅ Logs sin errores críticos
✅ Supabase functions activas
```

---

## 🔧 Mantenimiento

### Actualizar la Aplicación

```bash
cd /opt/buscacot

# Opción A: Usar script
./scripts/deploy.sh

# Opción B: Manual
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Ver Logs

```bash
# Script
./scripts/logs.sh

# Manual
docker-compose logs -f --tail=100
```

### Reiniciar

```bash
# Script
./scripts/restart.sh

# Manual
docker-compose restart
```

### Backup de Base de Datos

**Desde Supabase Dashboard:**

1. Ve a **Database → Backups**
2. Click **"Create backup"**
3. Se guardará automáticamente en Supabase

**Export manual:**

1. Ve a **SQL Editor**
2. Ejecuta: `pg_dump ...` (Supabase tiene herramientas para esto)
3. O usa Supabase CLI:
   ```bash
   supabase db dump -f backup.sql
   ```

### Monitoreo

```bash
# Estado de contenedor
docker-compose ps

# Uso de recursos
docker stats buscacot-frontend

# Espacio en disco
df -h

# Logs del sistema
journalctl -u docker -f
```

---

## 🚨 Troubleshooting

### Problema: Container no inicia

```bash
# Ver logs detallados
docker-compose logs

# Verificar puerto 80 libre
sudo netstat -tulpn | grep :80

# Recrear contenedor
docker-compose down
docker-compose up -d
```

### Problema: No conecta con Supabase

```bash
# Verificar variables de entorno en el build
docker exec buscacot-frontend cat /usr/share/nginx/html/assets/*.js | grep supabase

# Si no encuentra la URL, reconstruir:
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problema: SSL no funciona

1. Verificar DNS apunta a tu servidor
2. Verificar puertos 80 y 443 abiertos
3. En NPM, forzar renovación de certificado
4. Ver logs de NPM: `docker logs npm -f`

### Problema: Edge Functions fallan

1. Ve a Supabase Dashboard → Edge Functions → Logs
2. Verifica secretos: `supabase secrets list`
3. Redeploy función específica:
   ```bash
   supabase functions deploy ask-medgemma
   ```

---

## 📊 Arquitectura Final

```
┌─────────────────────────────────────────┐
│         Internet (HTTPS)                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  tu-subdominio.tudominio.com (DNS)      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│    Tu Servidor Local                    │
│  ┌──────────────────────────────────┐   │
│  │  Nginx Proxy Manager (NPM)       │   │
│  │  - Puerto 80/443                 │   │
│  │  - SSL Let's Encrypt             │   │
│  └──────────┬───────────────────────┘   │
│             │                            │
│  ┌──────────▼───────────────────────┐   │
│  │  buscacot-frontend (Docker)      │   │
│  │  - React + Vite + Nginx          │   │
│  │  - Puerto interno: 80            │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼──────────────────────────┘
              │ API calls
              │
┌─────────────▼──────────────────────────┐
│    Supabase Cloud (NUEVO proyecto)     │
│  ┌──────────────────────────────────┐  │
│  │  Kong API Gateway                │  │
│  │  - Auth (GoTrue)                 │  │
│  │  - REST API (PostgREST)          │  │
│  │  - Realtime                      │  │
│  │  - Storage                       │  │
│  └──────────┬───────────────────────┘  │
│             │                           │
│  ┌──────────▼───────────────────────┐  │
│  │  PostgreSQL 15                   │  │
│  │  - users, queries, etc.          │  │
│  │  - Backups automáticos           │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Edge Functions (Deno)           │  │
│  │  - ask-medgemma                  │  │
│  │  - pubmed-search                 │  │
│  │  - generate-summary              │  │
│  │  - export-history                │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │ External API calls
              │
     ┌────────┴────────┐
     │                 │
┌────▼─────┐   ┌───────▼────┐
│Hugging   │   │  PubMed    │
│Face API  │   │  NCBI API  │
└──────────┘   └────────────┘
```

---

## 📝 Resumen de Comandos Útiles

```bash
# === SERVIDOR ===
ssh tu-usuario@tu-servidor-ip
cd /opt/buscacot

# === DEPLOY ===
./scripts/deploy.sh              # Deploy completo
./scripts/restart.sh             # Reiniciar
./scripts/logs.sh                # Ver logs

# === DOCKER ===
docker-compose ps                # Estado
docker-compose logs -f           # Logs en vivo
docker-compose restart           # Reiniciar
docker-compose down              # Detener
docker-compose up -d             # Iniciar

# === SUPABASE CLI ===
supabase login                   # Login
supabase link                    # Linkear proyecto
supabase functions deploy        # Deploy functions
supabase secrets list            # Ver secretos
supabase db dump -f backup.sql  # Backup DB

# === GIT ===
git pull origin main             # Actualizar código
git status                       # Ver cambios

# === MONITORING ===
docker stats                     # Uso de recursos
df -h                           # Espacio disco
free -h                         # Memoria
htop                            # Procesos
```

---

## 🎯 ¿Listo para Comenzar?

**Orden recomendado:**

1. ✅ **FASE 1** - Agregar archivos a GitHub (30 mins)
2. ☁️ **FASE 2** - Crear proyecto Supabase (45 mins)
3. 🖥️ **FASE 3** - Preparar servidor (20 mins)
4. 🚀 **FASE 4** - Desplegar frontend (30 mins)
5. ✅ **FASE 5** - Pruebas (30 mins)

**Total estimado: 2.5 - 3 horas**

---

**¿Empezamos con la FASE 1?** 🚀
