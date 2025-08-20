# Salustia - Medical AI Assistant

Asistente médico especializado en traumatología y ortopedia con integración a PubMed para referencias científicas actualizadas.

**URL**: https://lovable.dev/projects/9baa9f83-e7e2-41c4-99b1-1d9cc5a03258

## 🚀 Características

- **Chat Conversacional**: Interfaz dinámica tipo Aware.Doctor IA con burbujas de chat
- **Sugerencias de Seguimiento**: 2-3 preguntas generadas automáticamente por IA después de cada respuesta
- **IA Médica Especializada**: Respuestas precisas en traumatología y ortopedia  
- **Referencias Científicas**: Búsqueda automática en PubMed con artículos de los últimos 3 años
- **Resúmenes Clínicos**: Generación automática de resúmenes para usuarios autenticados
- **Traducción Automática**: Traduce consultas de español a inglés para búsquedas más efectivas
- **Extracción de Palabras Clave**: Identifica términos médicos relevantes automáticamente
- **Historial Persistente**: Conversaciones guardadas en localStorage/servidor
- **Sistema de Créditos**: Control de uso con planes freemium (INTACTO - NO modificar)
- **Multiidioma**: Soporte completo ES/EN con react-i18next
- **Dark Mode**: Tema oscuro por defecto con paleta médica profesional
- **Responsive**: Diseño optimizado para todos los dispositivos

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Supabase + Edge Functions
- **IA**: Hugging Face (MedGemma, Llama 3.3)
- **Referencias**: PubMed API
- **i18n**: react-i18next

## 💬 Arquitectura de Chat Conversacional

### Componentes de Chat

- **ChatBubbleUser**: Mensajes del usuario (derecha, verde)
- **ChatBubbleAI**: Respuestas IA con ícono médico y resumen clínico
- **FollowUpSuggestions**: Botones clickeables de sugerencias de seguimiento
- **ClearHistoryButton**: Botón para limpiar historial de conversación
- **ConversationalChat**: Contenedor principal con input persistente (sticky)

### Flujo Conversacional

1. **Usuario escribe** → mensaje aparece en burbuja derecha verde
2. **IA procesa** → respuesta aparece en burbuja izquierda con contexto PubMed
3. **Generación de sugerencias** → 2-3 preguntas de seguimiento aparecen como botones
4. **Auto-scroll** → desplazamiento automático a nuevos mensajes
5. **Input limpieza** → campo se vacía después de enviar

### Funcionalidades Avanzadas

- **Historial persistente**: localStorage para invitados, base de datos para usuarios
- **Animaciones suaves**: Framer Motion para fade/slide-in de mensajes
- **Responsivo**: Scroll y input optimizados para móvil
- **Accesibilidad**: ARIA labels, contraste AA, navegación por teclado

## 📚 PubMed Integration

### Flujo de Búsqueda de Referencias

1. **Traducción**: Consulta del usuario (ES) → Inglés usando Helsinki-NLP/opus-mt-es-en
2. **Extracción**: Identificación de 4-5 palabras clave médicas usando modelos HuggingFace
3. **Búsqueda**: Query a PubMed con filtros temporales (últimos 3 años)
4. **Contexto**: Artículos incluidos automáticamente en el prompt de MedGemma
5. **Display**: Sección expandible con referencias citadas integrada en cada respuesta

### Personalización PubMed

#### Modificar Modelo de Traducción
En `supabase/functions/pubmed-search/index.ts`:
```typescript
// Cambiar el modelo de traducción
const result = await hf.translation({
  model: 'Helsinki-NLP/opus-mt-es-en', // Cambiar aquí para otro modelo
  inputs: spanishText,
})
```

#### Modificar Extracción de Keywords
```typescript
// Personalizar el prompt de extracción
const prompt = `Extract 4-5 important medical keywords from this text for PubMed search. Return only the keywords separated by commas, no explanations: "${text}"`
```

#### Ajustar Query PubMed
```typescript
const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&mindate=${minYear}/01/01&maxdate=${currentYear}/12/31&retmax=10&retmode=json`

// Filtros adicionales disponibles:
// &field=title para buscar solo en títulos
// &journal="Nature" para revista específica
```

#### Filtros Temporales
```typescript
const minYear = currentYear - 3; // Actual: últimos 3 años
// Cambiar a currentYear - 5 para expandir a 5 años
```

## 🔐 Seguridad (CRÍTICO - NO TOCAR)

- **JWT Authentication**: Via Supabase Auth - INTACTO
- **Rate Limiting**: Por plan de usuario - INTACTO  
- **Créditos/Consumo**: Sistema actual - INTACTO
- **RLS Policies**: Control de acceso - INTACTO
- **Tablas de usuarios**: Schema actual - INTACTO
- **Edge Functions existentes**: ask-medgemma preservado

## 🎨 Paleta de Colores Médica

- **Primary**: `#55FF61` (verde brillante) - Botones principales y acciones
- **Success**: `#129524` (verde oscuro) - Estados exitosos y confirmaciones  
- **Secondary**: `#0BF4FF` (cian) - Elementos secundarios
- **Info**: `#006FB9` (azul) - Información contextual
- **Accent**: `#3E9DE1` (azul claro) - Acentos y highlights
- **Background Dark**: `#151516` (casi negro) - Fondo principal modo oscuro
- **Card Dark**: `#282828` (gris oscuro) - Tarjetas en modo oscuro

## 🧪 Tests Críticos

### Funcionalidad Preservada
1. **Autenticación**: Login/signup funcionan sin cambios
2. **Contador de Créditos**: Sistema de uso disminuye correctamente
3. **Llamadas Server-side**: Sin llamadas directas a Hugging Face desde navegador
4. **Scroll automático**: Funciona en móvil y desktop
5. **Input clearing**: Se vacía después de enviar mensajes

### Performance y UX
- **Auto-scroll suave** a nuevos mensajes
- **Animaciones optimizadas** con `will-change`
- **Carga lazy** de referencias PubMed
- **Re-renders eficientes** con React.memo

## ⚠️ Importantes Salvaguardas

- **NO** modificar autenticación/registro existente
- **NO** tocar lógica de créditos por prompt
- **NO** exponer tokens de APIs en el frontend  
- **NO** cambiar nombres de tablas sin autorización
- **MANTENER** todos los endpoints server-side existentes
- **USAR** solo el design system para colores/estilos
- **PRESERVAR** flujo de MedGemma y PubMed existente

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9baa9f83-e7e2-41c4-99b1-1d9cc5a03258) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9baa9f83-e7e2-41c4-99b1-1d9cc5a03258) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
