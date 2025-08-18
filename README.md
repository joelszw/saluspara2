# Salustia - Medical AI Assistant

Asistente médico especializado en traumatología y ortopedia con integración a Europe PMC para referencias científicas actualizadas.

**URL**: https://lovable.dev/projects/9baa9f83-e7e2-41c4-99b1-1d9cc5a03258

## 🚀 Características

- **IA Médica Especializada**: Respuestas precisas en traumatología y ortopedia
- **Referencias Científicas**: Búsqueda automática en Europe PMC con artículos de los últimos 3 años  
- **Traducción Automática**: Traduce consultas de español a inglés para búsquedas más efectivas
- **Extracción de Palabras Clave**: Identifica términos médicos relevantes automáticamente
- **Sistema de Créditos**: Control de uso con planes freemium (INTACTO - NO modificar)
- **Multiidioma**: Soporte completo ES/EN
- **Dark Mode**: Tema oscuro por defecto con toggle
- **Responsive**: Diseño optimizado para todos los dispositivos

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Backend**: Supabase + Edge Functions
- **IA**: Hugging Face (MedGemma, Llama 3.3)
- **Referencias**: Europe PMC API
- **i18n**: react-i18next

## 📚 Europe PMC Integration

### Flujo de Búsqueda de Referencias

1. **Traducción**: Consulta del usuario (ES) → Inglés usando HuggingFace
2. **Extracción**: Identificación de 3-5 palabras clave médicas  
3. **Búsqueda**: Query a Europe PMC con filtros temporales (últimos 3 años)
4. **Contexto**: Artículos incluidos automáticamente en el prompt de MedGemma
5. **Display**: Sección expandible con referencias citadas

### Personalización Europe PMC

#### Modificar Modelo de Traducción
En `supabase/functions/europe-pmc-search/index.ts`:
```typescript
// Cambiar el modelo de traducción si es necesario
model: "meta-llama/Llama-3.3-70B-Instruct:groq" // Actual
```

#### Ajustar Query Europe PMC
```typescript
const searchUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&resultType=core&format=json&fromDate=${fromYear}-01-01&toDate=${currentYear}-12-31&pageSize=5`;

// Filtros adicionales disponibles:
// &source=MED para solo PubMed  
// &journalTitle="Nature" para revista específica
```

#### Filtros Temporales
```typescript
const fromYear = currentYear - 3; // Actual: últimos 3 años
// Cambiar a currentYear - 5 para expandir a 5 años
```

## 🔐 Seguridad (CRÍTICO - NO TOCAR)

- **JWT Authentication**: Via Supabase Auth - INTACTO
- **Rate Limiting**: Por plan de usuario - INTACTO  
- **Créditos/Consumo**: Sistema actual - INTACTO
- **RLS Policies**: Control de acceso - INTACTO
- **Tablas de usuarios**: Schema actual - INTACTO
- **Edge Functions existentes**: ask-medgemma preservado

## ⚠️ Importantes Salvaguardas

- **NO** modificar autenticación/registro existente
- **NO** tocar lógica de créditos por prompt
- **NO** exponer tokens de APIs en el frontend  
- **NO** cambiar nombres de tablas sin autorización
- **MANTENER** todos los endpoints server-side existentes
- **USAR** solo el design system para colores/estilos

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
