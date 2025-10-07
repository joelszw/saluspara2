import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  es: {
    translation: {
      // Navigation
      "nav.contact": "Contáctanos",
      "nav.aware": "Aware.doctor",
      "nav.login": "Iniciar sesión",
      "nav.signup": "Registro",
      "nav.logout": "Cerrar sesión",
      
      // Hero Section
      "hero.title": "Asistente médico de traumatología y ortopedia, pregúntale",
      "hero.subtitle": "Información para contrastar con tu experiencia como médico; agiliza tu trabajo y te ayuda en tu práctica diaria.",
      "hero.placeholder": "Describe tu duda clínica (p. ej., manejo de fractura de radio distal en adulto)...",
      "hero.submit": "Enviar",
      "hero.consulting": "Consultando…",
      "hero.guest_remaining": "Consultas restantes como invitado: {{count}} / 3",
      "hero.daily_monthly": "Hoy: {{daily}}/3 • Mes: {{monthly}}/20 (Plan gratuito)",
      "hero.limit_reached": "Límite alcanzado",
      "hero.signup_to_continue": "Regístrate o inicia sesión gratis para seguir usando.",
      
      // Chat Section
      "chat.welcome_title": "¡Hola! Soy tu asistente médico IA",
      "chat.welcome_subtitle": "Pregúntame sobre síntomas, medicamentos, procedimientos y más.",
      "chat.clear_history": "Limpiar historial",
      "chat.patient_warning.title": "⚕️ Esta plataforma es solo para personal sanitario.",
      "chat.patient_warning.message": "Si eres paciente, por favor consulta a tu médico para cualquier duda médica. No utilices esta información para autodiagnóstico o tratamiento.",
      
      // Features Section
      "features.title": "¿Por qué elegir Salustia?",
      "features.precision.title": "Precisión clínica especializada",
      "features.precision.desc": "Entrenado específicamente en traumatología y ortopedia con los últimos protocolos médicos.",
      "features.efficiency.title": "Agiliza tu consulta",
      "features.efficiency.desc": "Respuestas rápidas y fundamentadas que complementan tu experiencia clínica diaria.",
      "features.updated.title": "Siempre actualizado",
      "features.updated.desc": "Acceso a las últimas investigaciones y mejores prácticas en tu especialidad.",
      
      // Community Section
      "community.title": "Únete a la comunidad médica",
      "community.subtitle": "Más de 1,000 profesionales de traumatología ya usan Salustia",
      "community.cta": "Crear cuenta gratuita",
      "community.disclaimer": "Información para contrastar con tu experiencia como médico; agiliza tu trabajo y te ayuda en tu práctica diaria.",
      
      // LLMs Showcase
      "llms.title": "Mejor que solo cursos online",
      "llms.subtitle": "Tecnología médica de vanguardia",
      "llms.updated": "Actualizado con los mejores LLMs médicos",
      
      // Freemium Section
      "freemium.title": "Modelo freemium",
      "freemium.free_credits": "50 créditos gratuitos cada mes",
      "freemium.upgrade": "Comprar más créditos",
      "freemium.coming_soon": "Próximamente",
      
      // Auth
      "auth.login.title": "Inicia sesión",
      "auth.signup.title": "Crea tu cuenta",
      "auth.email": "Correo electrónico",
      "auth.password": "Contraseña",
      "auth.login.button": "Iniciar sesión",
      "auth.signup.button": "Crear cuenta",
      "auth.google": "Google",
      "auth.forgot_password": "¿Olvidaste tu contraseña?",
      
      // PubMed References Section
      "pubmed.title": "Referencias PubMed utilizadas",
      "pubmed.expand": "Ver referencias ({{count}})",
      "pubmed.collapse": "Ocultar referencias",
      "pubmed.translated_query": "Consulta traducida",
      "pubmed.disclaimer.title": "Aviso importante:",
      "pubmed.disclaimer.text": "Referencias para contrastar; no diagnóstico oficial. Siempre consulte con literatura especializada y colegas para decisiones clínicas.",

      // Footer
      "footer.legal": "Aviso legal",
      "footer.privacy": "Privacidad",
      "footer.cookies": "Cookies",
      "footer.terms": "Términos",
      "footer.contact": "Contacto"
    }
  },
  en: {
    translation: {
      // Navigation
      "nav.contact": "Contact",
      "nav.aware": "Aware.doctor",
      "nav.login": "Sign in",
      "nav.signup": "Sign up",
      "nav.logout": "Sign out",
      
      // Hero Section
      "hero.title": "Medical assistant for trauma and orthopedics, ask it",
      "hero.subtitle": "Information to contrast with your medical experience; streamlines your work and helps in your daily practice.",
      "hero.placeholder": "Describe your clinical question (e.g., management of distal radius fracture in adults)...",
      "hero.submit": "Submit",
      "hero.consulting": "Consulting…",
      "hero.guest_remaining": "Remaining guest queries: {{count}} / 3",
      "hero.daily_monthly": "Today: {{daily}}/3 • Month: {{monthly}}/20 (Free plan)",
      "hero.limit_reached": "Limit reached",
      "hero.signup_to_continue": "Sign up or sign in for free to continue using.",
      
      // Chat Section
      "chat.welcome_title": "Hello! I'm your medical AI assistant",
      "chat.welcome_subtitle": "Ask me about symptoms, medications, procedures and more.",
      "chat.clear_history": "Clear history",
      "chat.patient_warning.title": "⚕️ This platform is for healthcare professionals only.",
      "chat.patient_warning.message": "If you are a patient, please consult your doctor for any medical questions. Do not use this information for self-diagnosis or treatment.",
      
      // Features Section
      "features.title": "Why choose Salustia?",
      "features.precision.title": "Specialized clinical precision",
      "features.precision.desc": "Specifically trained in trauma and orthopedics with the latest medical protocols.",
      "features.efficiency.title": "Streamline your consultation",
      "features.efficiency.desc": "Fast and well-founded answers that complement your daily clinical experience.",
      "features.updated.title": "Always updated",
      "features.updated.desc": "Access to the latest research and best practices in your specialty.",
      
      // Community Section
      "community.title": "Join the medical community",
      "community.subtitle": "Over 1,000 trauma professionals already use Salustia",
      "community.cta": "Create free account",
      "community.disclaimer": "Information to contrast with your medical experience; streamlines your work and helps in your daily practice.",
      
      // LLMs Showcase
      "llms.title": "Better than just online courses",
      "llms.subtitle": "Cutting-edge medical technology",
      "llms.updated": "Updated with the best medical LLMs",
      
      // Freemium Section
      "freemium.title": "Freemium model",
      "freemium.free_credits": "50 free credits every month",
      "freemium.upgrade": "Buy more credits",
      "freemium.coming_soon": "Coming soon",
      
      // Auth
      "auth.login.title": "Sign in",
      "auth.signup.title": "Create your account",
      "auth.email": "Email",
      "auth.password": "Password",
      "auth.login.button": "Sign in",
      "auth.signup.button": "Create account",
      "auth.google": "Google",
      "auth.forgot_password": "Forgot your password?",
      
      // PubMed References Section
      "pubmed.title": "PubMed references used",
      "pubmed.expand": "View references ({{count}})",
      "pubmed.collapse": "Hide references",
      "pubmed.translated_query": "Translated query",
      "pubmed.disclaimer.title": "Important notice:",
      "pubmed.disclaimer.text": "References for contrast; not official diagnosis. Always consult specialized literature and colleagues for clinical decisions.",

      // Footer
      "footer.legal": "Legal notice",
      "footer.privacy": "Privacy",
      "footer.cookies": "Cookies",
      "footer.terms": "Terms",
      "footer.contact": "Contact"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // default language
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;