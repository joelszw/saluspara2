# Prompt Funcional: Salustia - Asistente Médico IA

## 🎯 Descripción General

Crea una aplicación web de asistente médico especializado en traumatología y ortopedia llamada "Salustia". La aplicación debe ofrecer consultas médicas asistidas por IA con referencias científicas en tiempo real de PubMed, disponible tanto para usuarios registrados como invitados.

**Tecnologías Base:**
- Frontend: React + TypeScript + Vite
- Estilos: Tailwind CSS con sistema de diseño personalizado
- Backend: Supabase (PostgreSQL + Edge Functions)
- IA: Llama 3.3 70B Instruct via HuggingFace Router
- Búsqueda científica: PubMed API
- Protección: Cloudflare Turnstile
- Internacionalización: i18next (ES/EN)

## 🌟 Funcionalidades Principales

### 1. Sistema de Chat Conversacional Inteligente

**Interfaz de Usuario:**
- Chat conversacional donde los usuarios pueden hacer preguntas médicas
- El chat debe mantener el historial completo de la conversación
- Interfaz limpia con burbujas de chat diferenciadas para usuario y AI
- Auto-scroll al recibir nuevas respuestas
- Indicador visual de "escribiendo..." mientras la IA genera respuesta
- Área de texto expandible para escribir consultas largas

**Funcionalidad del Chat:**
- La IA debe responder como especialista en traumatología y ortopedia
- Debe mantener contexto de toda la conversación
- Puede manejar consultas en español e inglés
- Si la respuesta es muy larga, debe ofrecer botón "Continuar respuesta" para obtener más información
- Historial guardado localmente para no perder conversaciones al recargar

### 2. Búsqueda Inteligente de Referencias Científicas (PubMed)

**Antes de responder, el sistema debe:**
- Traducir automáticamente la consulta al inglés si está en español
- Extraer palabras clave médicas relevantes de la consulta
- Buscar artículos científicos recientes en PubMed (últimos 3 años)
- Mostrar hasta 5 referencias científicas relevantes

**Visualización de Referencias:**
- Cada referencia debe mostrar: título, autores, año, revista, PMID
- Las referencias aparecen en una sección dedicada debajo de la respuesta de la IA
- Enlaces directos a PubMed para cada artículo
- La IA debe mencionar y citar estas referencias en su respuesta

### 3. Resúmenes Clínicos Automáticos

**Después de cada consulta, generar automáticamente un resumen estructurado con:**
- **Diagnóstico Principal:** El diagnóstico más probable
- **Diagnósticos Diferenciales:** Otras posibilidades
- **Evidencias Clave:** Hallazgos clínicos relevantes
- **Tratamiento Sugerido:** Opciones terapéuticas
- **Consideraciones Especiales:** Factores de riesgo, complicaciones

Este resumen aparece en la burbuja de respuesta de la IA en formato colapsable.

### 4. Sugerencias de Seguimiento Inteligentes

**Después de cada respuesta:**
- Generar automáticamente 3-5 preguntas de seguimiento relevantes
- Mostrarlas como botones clickeables debajo de la respuesta
- Al hacer clic en una sugerencia, automáticamente se envía esa pregunta
- Las sugerencias deben ser contextuales y médicamente relevantes

### 5. Sistema de Detección de Pacientes

**Protección para pacientes:**
- Detectar automáticamente si quien pregunta es un paciente (no profesional médico)
- Palabras clave como: "me duele", "tengo dolor", "soy paciente", "me pasó", etc.
- Mostrar alerta destacada recomendando consultar con médico presencial
- El mensaje debe ser empático pero firme sobre la importancia de atención médica real
- La alerta debe aparecer de forma prominente en la interfaz

### 6. Sistema de Usuarios y Límites

**Tipos de usuarios y límites exactos:**

| Rol | Diarias | Mensuales | CAPTCHA | Acceso |
|-----|---------|-----------|---------|--------|
| **Invitado** | 5 | N/A | Sí (cada consulta) | Solo chat |
| **Free** | 3 | 50 | No | Chat + Historial |
| **Premium** | 100 | 1000 | No | Todo sin restricciones |
| **Test** | 50 | 500 | No | Para pruebas |
| **Admin** | Ilimitado | Ilimitado | No | Panel admin completo |

**Detalles de implementación:**

1. **Invitados (Sin registro):**
   - 5 consultas gratuitas totales (no se resetean)
   - Contador guardado en `localStorage` con clave `guestQueryCount`
   - Validación CAPTCHA (Cloudflare Turnstile) en CADA consulta
   - No tienen acceso a historial persistente
   - Solo localStorage para la sesión actual
   - Al alcanzar 5 consultas, mensaje: "Has agotado tus consultas gratuitas. Regístrate para obtener 3 consultas diarias y 50 mensuales"

2. **Usuarios Gratuitos (Free):**
   - 3 consultas diarias (se resetean a medianoche)
   - 50 consultas mensuales (se resetean el día 1 de cada mes)
   - Sin CAPTCHA
   - Historial completo guardado en base de datos
   - Pueden exportar su historial
   - Al alcanzar límite: "Has alcanzado tu límite diario/mensual. Actualiza a Premium para más consultas"

3. **Usuarios Premium:**
   - 100 consultas diarias
   - 1000 consultas mensuales
   - Sin restricciones de CAPTCHA
   - Acceso prioritario (para futuras features)
   - Badge visual "Premium" en interfaz

4. **Usuarios Test:**
   - Rol especial para pruebas
   - 50 consultas diarias
   - 500 consultas mensuales
   - Sin CAPTCHA

5. **Administradores:**
   - Sin límites de consultas
   - Panel de administración completo
   - Pueden ver y gestionar todos los usuarios
   - Acceso a estadísticas globales
   - Pueden promover otros usuarios a admin

**Visualización de Límites:**
- Badge en header mostrando: "Consultas hoy: X/Y"
- Badge adicional: "Consultas mes: X/Y"
- Colores: verde (< 50%), amarillo (50-80%), rojo (> 80%)
- Mensaje emergente cuando se alcanza el límite
- Botón "Actualizar plan" visible cuando se aproxima al límite
- Para invitados: contador descendente "Te quedan X consultas gratuitas"

### 7. Sistema de Autenticación

**Métodos de ingreso:**
- Email y contraseña
- Inicio de sesión con Google
- Recuperación de contraseña por email
- CAPTCHA para acciones de autenticación

**Formularios:**
- Mismo formulario para Login y Registro (alternancia con tabs)
- Validación en tiempo real
- Mensajes de error claros
- Confirmación de registro exitoso

### 8. Panel de Administración

**Funcionalidades para administradores:**
- Ver lista completa de usuarios
- Buscar usuarios por email
- Ver estadísticas: total usuarios, usuarios activos hoy, consultas totales
- Promover usuarios a administrador
- Deshabilitar/habilitar cuentas de usuario
- Forzar cambio de contraseña
- Resetear contraseñas de usuarios

**Estadísticas visibles:**
- Gráfica de consultas por día (últimos 7 días)
- Total de usuarios registrados
- Usuarios activos hoy
- Total de consultas realizadas

### 9. Historial de Consultas

**Para usuarios registrados:**
- Ver todas las consultas previas ordenadas por fecha
- Buscar en historial
- Exportar historial completo a JSON
- Cada entrada muestra: fecha, hora, pregunta, respuesta resumida
- Click en una consulta para ver respuesta completa y referencias

### 10. Características de Seguridad

**Protecciones implementadas:**
- Detección de información personal (PII) en consultas
- Limitación de caracteres en consultas (evitar abuso)
- Rate limiting por IP para invitados
- Validación CAPTCHA para invitados
- Registro de eventos de seguridad
- Sanitización de inputs para prevenir inyección de código

### 11. Interfaz Multiidioma

**Idiomas soportados:**
- Español (predeterminado)
- Inglés

**Funcionalidad:**
- Botón de cambio de idioma en header
- Todo el texto de la interfaz traducido
- Las respuestas de la IA adaptan el idioma según la consulta
- Persistencia de preferencia de idioma

### 12. Modo Oscuro/Claro

**Sistema de temas:**
- Toggle visible en header
- Modo oscuro por defecto
- Modo claro disponible
- Transiciones suaves entre temas
- Preferencia guardada en navegador

### 13. Páginas Principales

**Landing Page (Para usuarios no autenticados):**
- Hero section con título impactante y CTA
- Sección de características principales
- Sección de comunidad (estadísticas de uso)
- Showcase de modelos de IA utilizados
- Sección de planes (Freemium)
- Footer con enlaces legales y redes sociales

**Dashboard (Para usuarios autenticados):**
- Header con logo, navegación, cambio de idioma, tema, perfil
- Chat conversacional como elemento principal
- Sidebar o sección con historial de consultas
- Indicadores de uso (consultas restantes)

**Página de Contacto:**
- Formulario para enviar mensajes
- Campos: nombre, email, asunto, mensaje
- Envío por email al administrador

**Página de Admin:**
- Solo accesible para administradores
- Gestión completa de usuarios
- Estadísticas y métricas
- Panel de promoción de usuarios

### 14. Diseño Visual y UX

**Inspiración: qure.ai**

**Esquema de colores exacto (HSL):**

*Modo Claro:*
```css
--background: 0 0% 100%
--foreground: 222.2 84% 4.9%
--card: 0 0% 100%
--card-foreground: 222.2 84% 4.9%
--popover: 0 0% 100%
--popover-foreground: 222.2 84% 4.9%
--primary: 221.2 83.2% 53.3%  /* Azul médico profesional */
--primary-foreground: 210 40% 98%
--secondary: 210 40% 96.1%
--secondary-foreground: 222.2 47.4% 11.2%
--muted: 210 40% 96.1%
--muted-foreground: 215.4 16.3% 46.9%
--accent: 210 40% 96.1%
--accent-foreground: 222.2 47.4% 11.2%
--destructive: 0 84.2% 60.2%
--destructive-foreground: 210 40% 98%
--border: 214.3 31.8% 91.4%
--input: 214.3 31.8% 91.4%
--ring: 221.2 83.2% 53.3%
```

*Modo Oscuro:*
```css
--background: 222.2 84% 4.9%
--foreground: 210 40% 98%
--card: 222.2 84% 4.9%
--card-foreground: 210 40% 98%
--popover: 222.2 84% 4.9%
--popover-foreground: 210 40% 98%
--primary: 217.2 91.2% 59.8%  /* Azul brillante para dark mode */
--primary-foreground: 222.2 47.4% 11.2%
--secondary: 217.2 32.6% 17.5%
--secondary-foreground: 210 40% 98%
--muted: 217.2 32.6% 17.5%
--muted-foreground: 215 20.2% 65.1%
--accent: 217.2 32.6% 17.5%
--accent-foreground: 210 40% 98%
--destructive: 0 62.8% 30.6%
--destructive-foreground: 210 40% 98%
--border: 217.2 32.6% 17.5%
--input: 217.2 32.6% 17.5%
--ring: 224.3 76.3% 48%
```

**Tipografía:**
- Fuente principal: Inter (sans-serif moderna)
- Títulos (Hero): 3xl-6xl, font-bold, tracking-tight
- Subtítulos: xl-2xl, font-semibold
- Texto normal: base, font-normal
- Texto pequeño: sm, text-muted-foreground
- Uso de italic para citas médicas

**Componentes UI específicos:**

*Botones:*
- Primary: `bg-primary text-primary-foreground hover:bg-primary/90`
- Secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- Outline: `border-2 border-primary text-primary hover:bg-primary/10`
- Ghost: `hover:bg-accent hover:text-accent-foreground`
- Destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90`
- Tamaños: sm (h-9), default (h-10), lg (h-11)
- Bordes redondeados: rounded-md (6px)

*Cards:*
- Fondo: `bg-card`
- Borde: `border border-border`
- Sombra: `shadow-sm hover:shadow-md transition-shadow`
- Padding: `p-6`
- Bordes redondeados: `rounded-lg`

*Inputs:*
- Fondo: `bg-background`
- Borde: `border-input`
- Focus: `focus:ring-2 focus:ring-ring focus:border-transparent`
- Altura: `h-10`
- Texto: `text-sm`

*Toasts:*
- Success: verde con icono de check
- Error: rojo con icono de X
- Warning: amarillo con icono de alerta
- Info: azul con icono de información
- Duración: 5000ms por defecto
- Posición: bottom-right

*Skeleton Loaders:*
- Fondo base: `bg-muted`
- Animación: `animate-pulse`
- Usar durante: carga de mensajes, referencias PubMed, resúmenes

**Layout específico:**

*Header:*
- Altura: `h-16`
- Sticky: `sticky top-0 z-50`
- Backdrop blur: `backdrop-blur-sm bg-background/95`
- Contenido: Logo (izq), navegación (centro), acciones (der)
- Border inferior: `border-b border-border`

*Hero Section:*
- Altura mínima: `min-h-screen`
- Gradiente de fondo: `bg-gradient-to-br from-primary/5 to-background`
- Título: `text-5xl md:text-6xl font-bold`
- Subtítulo: `text-xl md:text-2xl text-muted-foreground`
- CTA button: tamaño lg, primary variant

*Chat Container:*
- Max width: `max-w-4xl mx-auto`
- Padding: `p-4 md:p-6`
- Altura: `h-[600px]` con scroll interno
- Fondo: `bg-card/50 backdrop-blur`

*Burbujas de Chat:*
- Usuario: `bg-primary text-primary-foreground ml-auto max-w-[80%]`
- AI: `bg-muted mr-auto max-w-[80%]`
- Padding: `p-4`
- Border radius: `rounded-2xl`
- Margen entre mensajes: `mb-4`

**Elementos visuales:**
- Iconos: Lucide React (24px por defecto, 16px para inline)
- Colores de iconos: `text-muted-foreground` por defecto
- Hover en iconos interactivos: `hover:text-foreground`
- Transiciones: `transition-all duration-200`
- Animaciones de entrada: `animate-fade-in` (framer-motion)

**Responsive breakpoints:**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

**Accesibilidad:**
- Contraste mínimo 4.5:1 para texto normal
- Contraste mínimo 3:1 para textos grandes
- Focus visible en todos los elementos interactivos
- Labels para todos los inputs
- ARIA labels donde sea necesario

### 15. Experiencia de Usuario (Flujos)

**Flujo de usuario invitado:**
1. Llega a landing page
2. Ve información sobre la aplicación
3. Hace scroll hasta el chat en hero
4. Escribe primera consulta
5. Completa CAPTCHA
6. Recibe respuesta con referencias PubMed
7. Ve resumen clínico
8. Ve sugerencias de seguimiento
9. Puede hacer hasta 5 consultas
10. Al agotar, ve invitación a registrarse

**Flujo de usuario registrado:**
1. Hace login (email/password o Google)
2. Ve dashboard con chat
3. Escribe consulta sin CAPTCHA
4. Recibe respuesta completa con referencias
5. Ve historial de consultas previas en sidebar
6. Puede exportar historial
7. Ve contador de consultas restantes
8. Al alcanzar límite, ve invitación a Premium

**Flujo de administrador:**
1. Login con cuenta admin
2. Accede a panel de administración
3. Ve estadísticas globales
4. Gestiona usuarios (buscar, promover, deshabilitar)
5. Puede usar chat sin límites
6. Accede a todos los historiales

### 16. Comportamientos Especiales

**Continuación de respuestas:**
- Si la IA no termina la respuesta (por límite de tokens)
- Mostrar botón "Continuar respuesta"
- Al hacer click, la IA continúa desde donde se quedó
- No repetir información ya dada

**Manejo de errores:**
- Si falla búsqueda de PubMed: continuar sin referencias
- Si falla generación de resumen: mostrar solo respuesta
- Si falla generación de sugerencias: ocultar sección
- Siempre mostrar mensajes amigables al usuario

**Optimizaciones:**
- Búsqueda de PubMed en paralelo con respuesta de IA
- Generación de resumen después de respuesta principal
- Generación de sugerencias asíncrona
- Cache de referencias por palabras clave

### 17. Arquitectura de Base de Datos (PostgreSQL/Supabase)

**Tabla: users**
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'none',
  daily_count INTEGER NOT NULL DEFAULT 0,
  monthly_count INTEGER NOT NULL DEFAULT 0,
  daily_uses INTEGER NOT NULL DEFAULT 0,
  monthly_uses INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auth_method TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('free', 'premium', 'test', 'admin');
```

**Políticas RLS para users:**
- SELECT: Usuario puede ver su propia fila O admin puede ver todas
- UPDATE: Usuario puede actualizar su propia fila O admin puede actualizar cualquiera
- INSERT: Solo admin
- DELETE: Solo admin

**Tabla: queries**
```sql
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- NULL para invitados
  prompt TEXT NOT NULL,
  response TEXT,
  summary TEXT,
  pubmed_references JSONB,
  keywords TEXT[],
  translated_query TEXT,
  search_type TEXT,
  selected_keyword TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Políticas RLS para queries:**
- SELECT: Usuario ve sus propias queries O admin ve todas O service_role ve invitados (user_id NULL)
- INSERT: Usuario puede insertar con su user_id O invitados con NULL
- UPDATE: Solo campo summary puede actualizarse por usuario/admin
- DELETE: No permitido

**Tabla: security_events**
```sql
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Políticas RLS:** Solo service_role

**Tabla: function_usage**
```sql
CREATE TABLE public.function_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip TEXT NOT NULL,
  function_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Políticas RLS:** Solo service_role

**Funciones de Base de Datos:**

1. `get_user_role(user_id UUID) RETURNS user_role`
   - Función SECURITY DEFINER
   - Retorna el rol del usuario
   - Usada en RLS policies

2. `check_usage_limits_secure(user_id UUID, client_ip TEXT) RETURNS JSONB`
   - Verifica límites diarios y mensuales
   - Detecta actividad sospechosa por IP (> 200 req/día)
   - Retorna: `{allowed: boolean, reason: string, daily_used, daily_limit, monthly_used, monthly_limit}`
   - Registra eventos de seguridad

3. `log_security_event(event_type TEXT, user_id UUID, ip_address TEXT, details JSONB)`
   - Registra eventos de seguridad
   - No falla si hay error (solo WARNING)

4. `handle_new_user()` - Trigger Function
   - Se ejecuta AFTER INSERT en auth.users
   - Crea registro en public.users automáticamente
   - Detecta método de auth (email/google)

**Triggers:**
- `on_auth_user_created`: Ejecuta handle_new_user() cuando se crea usuario
- `prevent_sensitive_query_updates`: Bloquea actualizaciones a campos sensibles en queries
- `prevent_sensitive_user_updates`: Protege daily_count, monthly_count, enabled

### 18. Edge Functions (Supabase Functions)

**Function: ask-medgemma**
- Ruta: `/functions/v1/ask-medgemma`
- Método: POST
- Auth: Opcional (acepta invitados)
- CORS: Habilitado

*Payload:*
```json
{
  "prompt": "consulta médica",
  "conversationHistory": [...],  // opcional
  "continueResponse": false,     // opcional
  "turnstileToken": "token",     // requerido para invitados
  "isGuest": true/false
}
```

*Proceso:*
1. Validación CAPTCHA (si es invitado)
2. Detección de PII (información personal)
3. Verificación de límites de uso
4. Traducción de query si está en español
5. Búsqueda PubMed en paralelo
6. Llamada a Llama 3.3 70B via HuggingFace Router
7. Generación de sugerencias de seguimiento
8. Guardado de query en BD
9. Generación asíncrona de resumen

*Respuesta:*
```json
{
  "response": "respuesta completa",
  "suggestions": ["pregunta 1", "pregunta 2", ...],
  "pubmedReferences": [...],
  "isPatientQuery": boolean,
  "summary": "resumen clínico estructurado",
  "continueAvailable": boolean
}
```

*Sistema Prompt Específico:*
```
Eres un asistente médico especializado en traumatología y ortopedia.
- Proporciona información basada en evidencia científica
- Usa las referencias de PubMed proporcionadas
- Estructura tus respuestas de forma clara
- Menciona diagnósticos diferenciales cuando sea relevante
- No des diagnósticos definitivos
- Recomienda consulta médica presencial cuando sea necesario
- Responde en el mismo idioma que la consulta
```

**Function: pubmed-search**
- Ruta: `/functions/v1/pubmed-search`
- Método: POST
- Auth: Opcional

*Payload:*
```json
{
  "query": "consulta original",
  "translatedQuery": "translated query", // opcional
  "maxResults": 5
}
```

*Lógica de Búsqueda Inteligente:*
1. Extracción de keywords médicas
2. Traducción automática ES->EN si es necesario
3. Sistema de scoring para especificidad (0-100)
4. Estrategia adaptativa:
   - Score > 70: Búsqueda estricta (AND)
   - Score 40-70: Búsqueda balanceada (combinación)
   - Score < 40: Búsqueda amplia (OR)
5. Filtro: últimos 3 años
6. Retry automático si falla
7. Fallback a búsqueda simple

*Respuesta:*
```json
{
  "articles": [
    {
      "title": "título",
      "authors": ["autor1", "autor2"],
      "journal": "revista",
      "year": "2024",
      "pmid": "12345678",
      "doi": "10.xxxx/xxxx",
      "abstract": "resumen"
    }
  ],
  "searchStrategy": "AND|OR|COMBINED",
  "keywords": ["keyword1", "keyword2"]
}
```

**Function: generate-summary**
- Ruta: `/functions/v1/generate-summary`
- Método: POST
- Auth: Requerido

*Payload:*
```json
{
  "prompt": "consulta original",
  "response": "respuesta de la IA"
}
```

*Estructura del Resumen Generado:*
```
📋 RESUMEN CLÍNICO

🔍 DIAGNÓSTICO PRINCIPAL:
[Diagnóstico más probable basado en la consulta]

⚠️ DIAGNÓSTICOS DIFERENCIALES:
• Opción 1
• Opción 2
• Opción 3

📊 EVIDENCIAS CLAVE:
• Hallazgo clínico 1
• Hallazgo clínico 2

💊 TRATAMIENTO SUGERIDO:
[Opciones terapéuticas recomendadas]

⚕️ CONSIDERACIONES ESPECIALES:
[Factores de riesgo, complicaciones, seguimiento]
```

**Function: promote-admin**
- Ruta: `/functions/v1/promote-admin`
- Auth: Service Role ONLY
- Payload: `{targetUserId: "uuid", promoteToAdmin: boolean}`

**Function: admin-reset-password**
- Ruta: `/functions/v1/admin-reset-password`
- Auth: Admin only
- Payload: `{userId: "uuid", newPassword: "password"}`

**Function: change-password**
- Ruta: `/functions/v1/change-password`
- Auth: Requerido
- Payload: `{currentPassword: "xxx", newPassword: "yyy"}`

**Function: send-contact-email**
- Ruta: `/functions/v1/send-contact-email`
- Auth: Opcional
- Payload: `{name, email, subject, message}`
- Servicio: Resend API

**Function: export-history**
- Ruta: `/functions/v1/export-history`
- Auth: Requerido
- Formato de salida: JSON
- Incluye: todas las queries del usuario con respuestas completas

### 19. Integraciones Externas

**HuggingFace Router:**
- Endpoint: `https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct`
- Modelo: Llama 3.3 70B Instruct
- Headers: `Authorization: Bearer {HUGGINGFACE_API_TOKEN}`
- Parámetros:
  ```json
  {
    "inputs": "prompt completo",
    "parameters": {
      "max_new_tokens": 2000,
      "temperature": 0.7,
      "top_p": 0.95,
      "do_sample": true,
      "return_full_text": false
    }
  }
  ```

**PubMed E-utilities API:**
- Base URL: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- Endpoints usados:
  - `esearch.fcgi`: Búsqueda de artículos
  - `esummary.fcgi`: Resúmenes de artículos
- Parámetros:
  - `db=pubmed`
  - `retmode=json`
  - `retmax=5`
  - `sort=relevance`
  - `reldate=1095` (últimos 3 años)

**Cloudflare Turnstile:**
- Site Key: Pública (en frontend)
- Secret Key: En backend (TURNSTILE_SECRET)
- Endpoint de verificación: `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- Implementación: react-turnstile
- Validación: En cada consulta de invitados

**Resend (Email):**
- API Key: RESEND_API_KEY
- Endpoint: `https://api.resend.com/emails`
- Usado para:
  - Emails de contacto
  - Recuperación de contraseña
  - Notificaciones admin

### 20. Variables de Entorno / Secrets

**Secrets Requeridos en Supabase:**
```
HUGGINGFACE_API_TOKEN=hf_xxxxx
TURNSTILE_SECRET=0x4xxx
RESEND_API_KEY=re_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_ANON_KEY=eyJxxx
```

**Variables Frontend (.env):**
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
VITE_TURNSTILE_SITE_KEY=0x4xxx
```

## 🎨 Personalidad de la IA

**Comportamiento esperado:**
- Profesional y empático
- Especializado en traumatología y ortopedia
- Siempre cita fuentes científicas cuando están disponibles
- No da diagnósticos definitivos, sino orientación profesional
- Recomienda consulta presencial cuando detecta paciente
- Respuestas estructuradas y claras
- Usa terminología médica pero la explica cuando es necesario
- Ofrece diagnósticos diferenciales cuando aplica

## 📋 Casos de Uso Ejemplo

1. **Médico consulta sobre fractura:**
   - Usuario: "Paciente con fractura de Colles, ¿cuál es el mejor abordaje quirúrgico?"
   - Sistema busca en PubMed papers recientes sobre fractura de Colles
   - IA responde con opciones de tratamiento citando las referencias encontradas
   - Genera resumen con diagnóstico, tratamiento y consideraciones
   - Sugiere preguntas como "¿Qué complicaciones post-quirúrgicas son comunes?"

2. **Paciente hace consulta:**
   - Usuario: "Me duele mucho la rodilla al caminar"
   - Sistema detecta que es un paciente
   - Muestra alerta prominente recomendando consulta médica presencial
   - Aún así proporciona información general educativa
   - Sugiere preguntas más específicas para cuando consulte con su médico

3. **Invitado agota consultas:**
   - Usuario hace su 5ta consulta
   - Recibe respuesta normal
   - Ve mensaje: "Has agotado tus 5 consultas gratuitas. Regístrate para obtener 20 consultas diarias"
   - Botón claro para ir a registro

## 🔐 Consideraciones de Seguridad

- Nunca mostrar información sensible de otros usuarios
- Validar y sanitizar todos los inputs
- Rate limiting para prevenir abuso
- Logs de eventos de seguridad
- Encriptación de contraseñas
- Tokens JWT para autenticación
- CAPTCHA para acciones sensibles
- Políticas de privacidad claras

## ✅ Checklist de Funcionalidades

- [ ] Chat conversacional con historial persistente
- [ ] Búsqueda automática de PubMed con cada consulta
- [ ] Generación de resúmenes clínicos estructurados
- [ ] Sugerencias de seguimiento inteligentes
- [ ] Detección de pacientes con alerta
- [ ] Sistema de roles: Invitado, Free, Premium, Admin
- [ ] Límites de consultas según rol
- [ ] CAPTCHA para invitados
- [ ] Autenticación email/password y Google
- [ ] Panel de administración completo
- [ ] Exportación de historial
- [ ] Multiidioma (ES/EN)
- [ ] Modo oscuro/claro
- [ ] Continuación de respuestas largas
- [ ] Diseño responsive y accesible
- [ ] Manejo robusto de errores
- [ ] Landing page atractiva
- [ ] Página de contacto funcional

---

**Nota final:** La aplicación debe sentirse profesional, confiable y orientada al sector salud. Cada interacción debe reforzar la credibilidad científica mediante referencias a PubMed y lenguaje médico apropiado, mientras mantiene una UX fluida y moderna.
