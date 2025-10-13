# Prompt Funcional: Salustia - Asistente Médico IA

## 🎯 Descripción General

Crea una aplicación web de asistente médico especializado en traumatología y ortopedia llamada "Salustia". La aplicación debe ofrecer consultas médicas asistidas por IA con referencias científicas en tiempo real de PubMed, disponible tanto para usuarios registrados como invitados.

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

**Tipos de usuarios:**

1. **Invitados (Sin registro):**
   - 5 consultas gratuitas
   - Contador visible de consultas restantes
   - Requiere validación CAPTCHA (Cloudflare Turnstile) para prevenir abuso
   - Contador guardado en navegador

2. **Usuarios Gratuitos (Registrados):**
   - 20 consultas diarias
   - 300 consultas mensuales
   - Sin CAPTCHA
   - Historial guardado en base de datos

3. **Usuarios Premium:**
   - 200 consultas diarias
   - 4000 consultas mensuales
   - Acceso prioritario
   - Sin restricciones de CAPTCHA

4. **Administradores:**
   - Sin límites de consultas
   - Panel de administración completo

**Visualización de Límites:**
- Mostrar siempre las consultas restantes del día/mes
- Mensaje claro cuando se alcanza el límite
- Invitación a registrarse cuando invitado agota consultas
- Invitación a actualizar a Premium cuando usuario gratuito alcanza límites

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

**Esquema de colores profesional:**
- Colores primarios: Azules profundos (#0F172A, navy)
- Acentos: Coral/Salmon (#F97316) para CTAs y elementos importantes
- Secundarios: Teal (#14B8A6) para highlights
- Neutros: Grises y blancos para texto y fondos
- Fondos con gradientes sutiles

**Tipografía:**
- Sans-serif moderna (Inter, Work Sans o similar)
- Jerarquía clara: títulos grandes y bold, subtítulos medianos, texto legible
- Uso de italic para citas o elementos especiales

**Componentes UI:**
- Cards con sombras suaves y hover effects
- Botones con estados hover y active
- Inputs con focus states claros
- Toasts/notificaciones para feedback de acciones
- Skeleton loaders mientras carga contenido
- Animaciones sutiles en transiciones

**Layout:**
- Hero section prominente con estadísticas destacadas
- Secciones lineales con scroll fluido
- Grids o carousels para elementos repetidos
- Diseño completamente responsive (mobile-first)
- Navegación sticky en header

**Elementos visuales:**
- Iconos modernos (Lucide React)
- Ilustraciones o gráficos médicos profesionales
- Imágenes optimizadas (webp)
- Contrastes adecuados para accesibilidad

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

### 17. Elementos Técnicos Mínimos Necesarios

**Frontend:**
- React con TypeScript
- Tailwind CSS para estilos
- Sistema de rutas (React Router)
- Gestión de estado (React hooks)
- Cliente de autenticación
- i18n para múltiples idiomas

**Backend/Servicios necesarios:**
- Base de datos con tablas: users, queries, security_events
- Sistema de autenticación (email/password y OAuth Google)
- Funciones serverless para:
  - Consulta principal a IA
  - Búsqueda de PubMed
  - Generación de resúmenes
  - Generación de sugerencias
  - Gestión de usuarios (admin)
  - Envío de emails
- Almacenamiento de secretos (API keys)

**Integraciones externas:**
- API de modelo de IA para respuestas médicas
- API de PubMed/Europe PMC para referencias
- Cloudflare Turnstile para CAPTCHA
- Servicio de email (Resend o similar)

**Configuración requerida:**
- Variables de entorno para API keys
- Políticas de seguridad a nivel de base de datos
- Límites de uso por rol de usuario
- CORS configurado correctamente

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
