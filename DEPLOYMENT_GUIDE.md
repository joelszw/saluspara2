# 🚀 Guía de Despliegue - Salustia Medical Assistant

Esta guía cubre todas las opciones de despliegue para Salustia.

---

## 📋 Tabla de Contenidos

1. [Despliegue en Lovable (Recomendado)](#1-despliegue-en-lovable)
2. [Despliegue Local](#2-despliegue-local)
3. [Despliegue en Vercel](#3-despliegue-en-vercel)
4. [Despliegue en Netlify](#4-despliegue-en-netlify)
5. [Despliegue con Docker](#5-despliegue-con-docker)
6. [Configuración de Dominio Personalizado](#6-dominio-personalizado)

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

---

## 3. Despliegue en Vercel

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

## 6. Dominio Personalizado

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
