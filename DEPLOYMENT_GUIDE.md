# 🚀 Guía de Despliegue - Salustia Medical Assistant

Esta guía cubre todas las opciones de despliegue para Salustia.

---

## 📋 Tabla de Contenidos

1. [Despliegue en Lovable (Recomendado)](#1-despliegue-en-lovable)
2. [Despliegue Local](#2-despliegue-local)
3. [Despliegue en VPS con Supabase Local](#3-despliegue-en-vps-con-supabase-local)
4. [Despliegue en Vercel](#4-despliegue-en-vercel)
5. [Despliegue en Netlify](#5-despliegue-en-netlify)
6. [Despliegue con Docker](#6-despliegue-con-docker)
7. [Configuración de Dominio Personalizado](#7-dominio-personalizado)

---

## 1. Despliegue en Lovable

### Opción Más Fácil ✨

1. Click en el botón **Publish** (arriba a la derecha)
2. Tu app se despliega automáticamente
3. URL: `https://tu-proyecto.lovable.app`

### Ventajas
- ✅ Zero configuración
- ✅ Deploy automático en cada cambio
- ✅ SSL/HTTPS incluido
- ✅ CDN global
- ✅ Rollback instantáneo

### Dominio Personalizado

1. Ve a Project → Settings → Domains
2. Agrega tu dominio (ej: `www.salustia.com`)
3. Configura DNS según las instrucciones
4. Espera verificación (5-10 minutos)

**Nota:** Requiere plan pago de Lovable

---

## 2. Despliegue Local

### Prerrequisitos

```bash
Node.js >= 18
npm >= 9
Git
```

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/salustia.git
cd salustia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (opcional para local)
# Editar src/integrations/supabase/client.ts si cambias de proyecto Supabase

# 4. Ejecutar en desarrollo
npm run dev

# 5. Compilar para producción
npm run build

# 6. Previsualizar build de producción
npm run preview
```

La app estará en:
- Desarrollo: `http://localhost:5173`
- Preview: `http://localhost:4173`


## 3. Despliegue en VPS con Supabase Local

### 🎯 Despliegue Completo Self-Hosted

Esta opción te da control total ejecutando tanto el frontend como Supabase en tu propio VPS.

### Prerrequisitos del VPS

```bash
# Sistema
Ubuntu 20.04+ o Debian 11+
4GB RAM mínimo (8GB recomendado)
20GB espacio en disco mínimo
Docker y Docker Compose instalados

# Puertos requeridos
80 (HTTP)
443 (HTTPS)
5432 (PostgreSQL - opcional si expones DB)
3000 (API de Supabase)
```

### Paso 1: Instalar Docker

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### Paso 2: Instalar Supabase CLI

```bash
# Via npm (recomendado)
npm install -g supabase

# O via Homebrew (si lo tienes)
brew install supabase/tap/supabase

# Verificar
supabase --version
```

### Paso 3: Inicializar Supabase Local

```bash
# Crear directorio para el proyecto
mkdir -p /opt/salustia
cd /opt/salustia

# Inicializar Supabase
supabase init

# Esto crea la estructura:
# /opt/salustia/
# ├── supabase/
# │   ├── config.toml
# │   ├── seed.sql
# │   └── migrations/
```

### Paso 4: Importar Base de Datos

```bash
# Copiar el archivo DATABASE_EXPORT.sql al servidor
# Puedes usar scp:
# scp DATABASE_EXPORT.sql user@tu-vps:/opt/salustia/supabase/migrations/00000000000000_initial_schema.sql

# O crear la migración manualmente:
cd /opt/salustia
cat > supabase/migrations/00000000000000_initial_schema.sql << 'EOF'
# Pegar aquí el contenido de DATABASE_EXPORT.sql
EOF
```

### Paso 5: Configurar Supabase

Edita `supabase/config.toml`:

```toml
# Proyecto
project_id = "local-salustia"

[api]
enabled = true
port = 54321
schemas = ["public", "storage"]
max_rows = 1000
extra_search_path = ["extensions"]

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://localhost"

[auth]
enabled = true
site_url = "https://tu-dominio.com"
additional_redirect_urls = ["http://localhost:5173"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

# Configurar las edge functions
[functions.ask-medgemma]
verify_jwt = false

[functions.send-contact-email]
verify_jwt = false

[functions.generate-summary]
verify_jwt = false

[functions.pubmed-search]
verify_jwt = false

[functions.export-history]
verify_jwt = true

[functions.promote-admin]
verify_jwt = true

[functions.send-recovery-email]
verify_jwt = true

[functions.admin-reset-password]
verify_jwt = true
```

### Paso 6: Copiar Edge Functions

```bash
# Copiar las funciones al directorio correcto
cd /opt/salustia

# Estructura debe ser:
# supabase/functions/
# ├── ask-medgemma/index.ts
# ├── admin-reset-password/index.ts
# ├── change-password/index.ts
# ├── europe-pmc-search/index.ts
# ├── export-history/index.ts
# ├── generate-summary/index.ts
# ├── promote-admin/index.ts
# ├── pubmed-search/index.ts
# └── send-contact-email/index.ts

# Copiar desde tu repo GitHub o manualmente
git clone https://github.com/tu-usuario/salustia.git temp
cp -r temp/supabase/functions/* supabase/functions/
rm -rf temp
```

### Paso 7: Configurar Secretos

```bash
# Crear archivo .env para secretos
cat > supabase/.env.local << 'EOF'
HUGGINGFACE_API_TOKEN=tu_token_aqui
RESEND_API_KEY=tu_key_aqui
TURNSTILE_SECRET=tu_secret_aqui
ALLOWED_PROMOTION_EMAILS=admin@example.com,otro@example.com
EOF

# Cargar secretos en Supabase
supabase secrets set --env-file supabase/.env.local
```

### Paso 8: Iniciar Supabase

```bash
cd /opt/salustia

# Iniciar Supabase (esto descargará las imágenes Docker la primera vez)
supabase start

# Salida mostrará:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# anon key: eyJh...
# service_role key: eyJh...
```

### Paso 9: Desplegar Frontend

```bash
# Clonar código del frontend
cd /opt/salustia
git clone https://github.com/tu-usuario/salustia.git frontend
cd frontend

# Instalar dependencias
npm install

# Configurar cliente Supabase para apuntar al local
# Editar src/integrations/supabase/client.ts:

# OPCIÓN A: Hardcodear (no recomendado para producción)
# const SUPABASE_URL = "http://tu-vps-ip:54321";
# const SUPABASE_PUBLISHABLE_KEY = "eyJh..."; # usar anon key de supabase start

# OPCIÓN B: Usar variables de entorno (recomendado)
# Crear .env.production:
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=http://tu-vps-ip:54321
VITE_SUPABASE_ANON_KEY=eyJh... # del output de supabase start
EOF

# Construir para producción
npm run build

# El build estará en dist/
```

### Paso 10: Configurar Nginx como Reverse Proxy

```bash
# Instalar Nginx
sudo apt install nginx -y

# Configurar sitio
sudo nano /etc/nginx/sites-available/salustia
```

Pega esta configuración:

```nginx
# Frontend
server {
    listen 80;
    server_name tu-dominio.com;
    
    root /opt/salustia/frontend/dist;
    index index.html;
    
    # Servir frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy a Supabase API
    location /api/ {
        proxy_pass http://localhost:54321/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Proxy a Supabase Auth
    location /auth/ {
        proxy_pass http://localhost:54321/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Proxy a Supabase Storage
    location /storage/ {
        proxy_pass http://localhost:54321/storage/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Proxy a Edge Functions
    location /functions/ {
        proxy_pass http://localhost:54321/functions/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Cache para assets estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/salustia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 11: Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Esto configurará SSL automáticamente en Nginx
# Los certificados se renovarán automáticamente
```

### Paso 12: Configurar Supabase como Servicio

Crear un servicio systemd para que Supabase se inicie automáticamente:

```bash
sudo nano /etc/systemd/system/supabase.service
```

Contenido:

```ini
[Unit]
Description=Supabase Local Instance
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/salustia
ExecStart=/usr/local/bin/supabase start
ExecStop=/usr/local/bin/supabase stop
User=root

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable supabase
sudo systemctl start supabase

# Verificar estado
sudo systemctl status supabase
```

### Actualizar el Código

Cuando hagas cambios en el código:

```bash
# Frontend
cd /opt/salustia/frontend
git pull
npm install
npm run build
sudo systemctl reload nginx

# Edge Functions
cd /opt/salustia
git pull
supabase functions deploy

# Migraciones de DB
cd /opt/salustia
# Copiar nueva migración a supabase/migrations/
supabase db push
```

### Monitoreo

```bash
# Ver logs de Supabase
supabase status
docker-compose -f /opt/salustia/supabase/docker/docker-compose.yml logs -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de funciones específicas
supabase functions logs ask-medgemma --tail
```

### Backup

```bash
# Backup de base de datos
supabase db dump -f backup-$(date +%Y%m%d).sql

# O con pg_dump directamente
docker exec supabase_db_salustia pg_dump -U postgres postgres > backup.sql

# Restaurar
supabase db reset
psql -h localhost -p 54322 -U postgres postgres < backup.sql
```

### Ventajas de Self-Hosting

- ✅ Control total de los datos
- ✅ Sin límites de API calls
- ✅ Sin costos recurrentes de Supabase Cloud
- ✅ Cumplimiento con regulaciones de datos locales
- ✅ Personalización completa

### Desventajas

- ❌ Requiere mantenimiento del servidor
- ❌ Necesitas gestionar backups
- ❌ Responsable de la seguridad
- ❌ Sin escalado automático
- ❌ Requiere conocimientos de DevOps

---

## 4. Despliegue en Vercel

### Via GitHub (Recomendado)

1. **Conecta tu repositorio a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Click "New Project"
   - Importa tu repo de GitHub
   - Selecciona "Vite" como framework preset

2. **Configurar Build Settings**
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Variables de Entorno**
   
   Agrega estas variables en Vercel Dashboard → Settings → Environment Variables:
   
   ```bash
   VITE_SUPABASE_URL=https://injvwmsqinrcthgdlvux.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

4. **Deploy**
   - Click "Deploy"
   - Espera 2-3 minutos
   - Tu app estará en `https://tu-proyecto.vercel.app`

### Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Deploy Automático

Cada push a la rama `main` desplegará automáticamente en producción.

Cada push a otras ramas creará un preview deployment.

---

## 4. Despliegue en Netlify

### Via GitHub

1. **Conecta repositorio**
   - Ve a [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Conecta GitHub y selecciona tu repo

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Variables de Entorno**
   
   Settings → Environment Variables:
   ```bash
   VITE_SUPABASE_URL=https://injvwmsqinrcthgdlvux.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

4. **Deploy**
   - Click "Deploy site"
   - URL: `https://tu-sitio.netlify.app`

### Via CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Inicializar
netlify init

# Deploy
netlify deploy

# Deploy a producción
netlify deploy --prod
```

### Archivo de Configuración

Crea `netlify.toml` en la raíz:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

---

## 5. Despliegue con Docker

### Dockerfile

Crea `Dockerfile` en la raíz:

```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Crea `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Comandos Docker

```bash
# Build
docker build -t salustia-app .

# Run
docker run -p 80:80 salustia-app

# Con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 7. Dominio Personalizado

### Para Lovable

1. Project Settings → Domains
2. Agrega dominio: `www.tusitio.com`
3. Configura DNS:
   ```
   Type: CNAME
   Name: www
   Value: [valor-proporcionado-por-lovable]
   ```

### Para Vercel

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Para Netlify

```
Type: CNAME  
Name: www
Value: tu-sitio.netlify.app
```

### Apex Domain (sin www)

Para dominios apex (ej: `tusitio.com` sin www), necesitas:

**Vercel:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Netlify:**
```
Type: A
Name: @
Value: 75.2.60.5
```

### SSL/HTTPS

- **Lovable**: Automático
- **Vercel**: Automático (Let's Encrypt)
- **Netlify**: Automático (Let's Encrypt)
- **Custom Server**: Usa [Certbot](https://certbot.eff.org/)

---

## ⚙️ Configuración de Edge Functions

Las Edge Functions de Supabase se despliegan por separado del frontend.

### Desde Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref injvwmsqinrcthgdlvux

# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ask-medgemma

# Ver logs
supabase functions logs ask-medgemma
```

### Configurar Secretos

```bash
supabase secrets set HUGGINGFACE_API_TOKEN=tu_token
supabase secrets set RESEND_API_KEY=tu_key
supabase secrets set TURNSTILE_SECRET=tu_secret
supabase secrets set ALLOWED_PROMOTION_EMAILS=email1@example.com,email2@example.com

# Ver secretos configurados (sin valores)
supabase secrets list
```

---

## 🔧 Variables de Entorno por Entorno

### Desarrollo Local

No necesita `.env` porque usa valores hardcodeados en `client.ts`

### Staging/Test

Si creas un proyecto Supabase separado para staging:

```bash
VITE_SUPABASE_URL=https://tu-proyecto-staging.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-staging
```

### Producción

Usa las credenciales del proyecto principal:

```bash
VITE_SUPABASE_URL=https://injvwmsqinrcthgdlvux.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE:** El `ANON_KEY` es público y seguro de compartir. El `SERVICE_ROLE_KEY` NUNCA debe estar en el frontend.

---

## 📊 Monitoreo Post-Deploy

### Vercel

- **Analytics**: Automático en Dashboard
- **Logs**: Vercel Dashboard → Deployments → Logs

### Netlify

- **Analytics**: Netlify Analytics (addon pago)
- **Logs**: Netlify Dashboard → Deploys → Deploy log

### Supabase Functions

```bash
# Ver logs en tiempo real
supabase functions logs ask-medgemma --tail

# Ver logs de un período
supabase functions logs ask-medgemma --since 1h
```

### Monitoreo de Base de Datos

[Supabase Dashboard → Database → Logs](https://supabase.com/dashboard/project/injvwmsqinrcthgdlvux/database/logs)

---

## 🚨 Troubleshooting Común

### Build falla con "Out of memory"

```bash
# Aumentar memoria de Node
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Functions no responden

```bash
# Verificar secretos
supabase secrets list

# Ver logs de error
supabase functions logs nombre-funcion

# Re-deploy
supabase functions deploy nombre-funcion
```

### CORS errors

Verifica que el dominio esté en `ALLOWED_ORIGINS` en las edge functions.

### Rutas 404 en producción

Asegúrate de tener redirects configurados:

**Vercel:** Agrega `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify:** Ya incluido en `netlify.toml` arriba.

---

## ✅ Checklist Pre-Deploy

- [ ] Código compilado sin errores (`npm run build`)
- [ ] Tests pasando (`npm run test` si tienes)
- [ ] Base de datos migrada y funcionando
- [ ] Edge functions desplegadas
- [ ] Secretos configurados en Supabase
- [ ] Variables de entorno configuradas
- [ ] Dominio DNS configurado (si aplica)
- [ ] SSL/HTTPS activo
- [ ] Logs monitoreados
- [ ] Backup de base de datos hecho

---

## 🎯 Recomendaciones de Producción

### Performance

- ✅ Activar compresión Gzip/Brotli
- ✅ Configurar cache headers
- ✅ Usar CDN (incluido en Vercel/Netlify/Lovable)
- ✅ Lazy loading de componentes
- ✅ Optimizar imágenes

### Seguridad

- ✅ Usar HTTPS siempre
- ✅ RLS habilitado en todas las tablas
- ✅ Secretos en Supabase Secrets (nunca en código)
- ✅ Rate limiting en edge functions
- ✅ CORS configurado correctamente

### Monitoreo

- ✅ Logs de errores
- ✅ Analytics de uso
- ✅ Alertas de downtime
- ✅ Backup automático de DB

---

**¿Listo para desplegar? 🚀**

Elige tu plataforma favorita y sigue los pasos. ¡Tu app estará en vivo en minutos!
