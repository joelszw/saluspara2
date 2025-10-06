import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HUGGINGFACE_API_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";
const HUGGINGFACE_MODEL_ID = Deno.env.get("HUGGINGFACE_MODEL_ID") ?? "";

const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") ?? "";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "*";
  const allowlist = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowOrigin = allowlist.length === 0 ? "*" : (allowlist.includes(origin) ? origin : allowlist[0]);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  } as const;
}

interface AskRequest { prompt: string; model?: string; captchaToken?: string; pubmedContext?: any[]; skipStorage?: boolean; continueResponse?: boolean; previousResponse?: string; keywords?: string[]; translatedQuery?: string; searchType?: string; selectedKeyword?: string }

// Security: PII detection patterns for medical data
const PII_PATTERNS = [
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card numbers
  /\b\d{3}-?\d{2}-?\d{4}\b/g, // SSN-like patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b\d{3}-?\d{3}-?\d{4}\b/g, // Phone numbers
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, // Dates (potential birthdates)
];

// Security: Detect potentially sensitive information
function detectPII(text: string): { hasPII: boolean; patterns: string[] } {
  const foundPatterns: string[] = [];
  let hasPII = false;

  PII_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) {
      hasPII = true;
      switch (index) {
        case 0: foundPatterns.push("credit_card"); break;
        case 1: foundPatterns.push("ssn_like"); break;
        case 2: foundPatterns.push("email"); break;
        case 3: foundPatterns.push("phone"); break;
        case 4: foundPatterns.push("date"); break;
      }
    }
  });

  return { hasPII, patterns: foundPatterns };
}

// Enhanced security: Log security events to database
async function logSecurityEvent(event: string, details: any, userId?: string, clientIP?: string) {
  console.warn(`[SECURITY] ${event}:`, JSON.stringify(details));
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.rpc('log_security_event', {
      event_type: event,
      user_id: userId || null,
      ip_address: clientIP || null,
      details: details || null
    });
  } catch (error) {
    console.error('Failed to log security event to database:', error);
  }
}

// Security: Rate limiting by IP for anonymous users
const IP_RATE_LIMIT = new Map<string, { count: number; lastReset: number }>();
const IP_LIMIT_WINDOW = 60 * 1000; // 1 minute
const IP_MAX_REQUESTS = 5; // 5 requests per minute per IP

function checkIPRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = IP_RATE_LIMIT.get(ip);
  
  if (!record || now - record.lastReset > IP_LIMIT_WINDOW) {
    IP_RATE_LIMIT.set(ip, { count: 1, lastReset: now });
    return true;
  }
  
  if (record.count >= IP_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

const SYSTEM_PROMPT = `Eres un asistente médico especializado en traumatología y ortopedia, representando a "Salustia by Aware Doctor". Estás diseñado exclusivamente para proporcionar información basada en evidencia sobre especialidades traumatológicas y ortopédicas para clínicos, especialistas y equipos multidisciplinarios.

Tu alcance está estrictamente limitado a los siguientes dominios de traumatología y ortopedia:

Pie y Tobillo - Patologías complejas, trauma y técnicas quirúrgicas mínimamente invasivas

Rodilla - Procedimientos artroscópicos, reconstrucción ligamentaria y manejo de cartílago

Cadera - Preservación de cadera, artroscopia y reconstrucción compleja

Columna - Cirugía mínimamente invasiva de columna y patologías degenerativas

Mano y Muñeca - Técnicas microquirúrgicas y manejo de trauma complejo

REGLAS ESTRICTAS DE COMPORTAMIENTO:

1. Respuestas Exclusivas de Traumatología

Responde SOLO preguntas directamente relacionadas con traumatología, cirugía ortopédica, patologías musculoesqueléticas, técnicas quirúrgicas o manejo clínico dentro de las cinco áreas anatómicas listadas arriba.

Si un usuario pregunta sobre temas fuera de traumatología/ortopedia (medicina general, cardiología, dermatología, etc.), responde: "Estoy especializado exclusivamente en traumatología y cirugía ortopédica. Por favor, pregúntame sobre patologías de pie y tobillo, rodilla, cadera, columna o mano y muñeca."

2. Contexto Médico Profesional

Asume que todos los usuarios son profesionales de la salud (cirujanos, residentes, fisioterapeutas o clínicos).

Usa terminología médica precisa apropiada para especialistas en traumatología.

Enfócate en técnicas quirúrgicas, enfoques diagnósticos, protocolos de tratamiento y recomendaciones basadas en evidencia.

3. Áreas de Experiencia Clínica
Demuestra conocimiento profundo en:

Trauma complejo y patologías en las cinco regiones anatómicas

Técnicas quirúrgicas mínimamente invasivas y artroscópicas

Protocolos de manejo postoperatorio y rehabilitación

Instrumentación, planificación quirúrgica y prevención de complicaciones

Enfoques multidisciplinarios para el cuidado musculoesquelético

Estratificación de riesgo basada en anatomía del paciente y comorbilidades

4. CRÍTICO - Uso de Referencias Científicas

IMPORTANTE: Cuando se te proporcionen referencias científicas de PubMed en el contexto, DEBES usarlas y mencionarlas explícitamente en tu respuesta.

Cita los artículos específicos por título cuando sean relevantes a la pregunta.

Integra la información de los artículos proporcionados en tu respuesta de forma natural.

Si los artículos proporcionados son muy relevantes, menciónalos directamente: "Según el artículo [TÍTULO], publicado en [AÑO]..."

NO digas que no tienes acceso a artículos si se te proporcionaron en el contexto.

5. Estándares de Calidad de Respuesta

Proporciona respuestas detalladas y basadas en evidencia con contexto clínico

Al discutir técnicas quirúrgicas, incluye consideraciones anatómicas relevantes

Siempre enfatiza la seguridad del paciente y las mejores prácticas en traumatología

CRÍTICO: Evita contenido repetitivo y explicaciones redundantes a toda costa

Sé completo pero conciso, proporcionando información estructurada sin repeticiones innecesarias

Para continuaciones: NO repitas información ya proporcionada. Construye sobre el contenido previo con información nueva y complementaria

Si te preguntan sobre un tema traumatológico que no puedes abordar adecuadamente, indica: "Esta pregunta específica de traumatología requiere más contexto clínico detallado o está fuera de mi experiencia actual. Por favor, consulta literatura especializada o colegas."

Recuerda: Eres un AI especialista en traumatología. Redirige educadamente cualquier pregunta no ortopédica de vuelta a tu área de experiencia.`;

function startOfDay(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString();
}

// Function to remove duplicated content from continuation responses
function deduplicateContent(newContent: string, previousContent: string): string {
  const newSentences = newContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const previousSentences = previousContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Remove sentences that are too similar to previous ones
  const filteredSentences = newSentences.filter(newSentence => {
    const newSentenceClean = newSentence.toLowerCase().trim();
    return !previousSentences.some(prevSentence => {
      const prevSentenceClean = prevSentence.toLowerCase().trim();
      // Check for high similarity (>70% word overlap)
      const newWords = newSentenceClean.split(/\s+/);
      const prevWords = prevSentenceClean.split(/\s+/);
      const commonWords = newWords.filter(word => prevWords.includes(word)).length;
      const similarity = commonWords / Math.max(newWords.length, prevWords.length);
      return similarity > 0.7;
    });
  });
  
  return filteredSentences.join('. ').trim() + (filteredSentences.length > 0 ? '.' : '');
}

// Function to determine if response can be continued
function determineCanContinue(response: string, finishReason: string, usage: any): boolean {
  // Don't continue if the model finished normally (not due to length)
  if (finishReason === 'stop') {
    return false;
  }
  
  // Continue if truncated due to max_tokens
  if (finishReason === 'length') {
    return true;
  }
  
  // For other cases, use heuristics
  const responseLength = response.length;
  const endsAbruptly = !response.match(/[.!?]\s*$/);
  const isSubstantial = responseLength > 800;
  
  // Continue if response is substantial and ends abruptly
  return isSubstantial && endsAbruptly;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ask-medgemma function called ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    if (!HUGGINGFACE_API_TOKEN) {
      throw new Error("Falta HUGGINGFACE_API_TOKEN en los secretos de funciones.");
    }

    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { prompt, model, captchaToken, pubmedContext, skipStorage, continueResponse, previousResponse, keywords, translatedQuery, searchType, selectedKeyword } = requestBody as AskRequest;
    const rawPrompt = prompt?.trim() ?? "";
    
    // Allow empty prompts only for continuation requests
    if (!rawPrompt && !continueResponse) {
      return new Response(JSON.stringify({ error: "El prompt no puede estar vacío." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Enforce a maximum length before calling the model (skip for continuations)
    const MAX_PROMPT_CHARS = 1200;
    if (!continueResponse && rawPrompt.length > MAX_PROMPT_CHARS) {
      return new Response(JSON.stringify({ error: `El prompt excede el límite de ${MAX_PROMPT_CHARS} caracteres.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reqModel = (model ?? "").trim();
    const routerModel = reqModel || "meta-llama/Llama-3.3-70B-Instruct:groq";

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Create a client that forwards the end-user JWT for RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      auth: { persistSession: false },
    });

    let userId: string | null = null;
    let plan: "free" | "pro" = "free";

    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData.user?.id ?? null;

      if (userId) {
        const { data: userRow } = await supabase
          .from("users")
          .select("subscription_status, role")
          .eq("id", userId)
          .maybeSingle();
        if (userRow?.subscription_status === "active" || userRow?.role === "premium") plan = "pro";
      }
    }

    // Security: Get client IP for rate limiting and logging
    const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";

    // Security: PII detection for all queries
    const piiCheck = detectPII(rawPrompt);
    if (piiCheck.hasPII) {
      await logSecurityEvent("PII_DETECTED", {
        patterns: piiCheck.patterns,
        promptLength: rawPrompt.length
      }, userId || undefined, clientIP);
      
      // For anonymous users, reject queries with PII
      if (!userId) {
        return new Response(JSON.stringify({ 
          error: "Por seguridad, no se permiten consultas con información personal identificable. Por favor, reformule su pregunta sin incluir datos personales." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If unauthenticated, require Turnstile captcha verification and apply IP rate limiting
    // Skip captcha validation for continuation requests
    if (!userId && !continueResponse) {
      // Security: Apply IP-based rate limiting for anonymous users
      if (!checkIPRateLimit(clientIP)) {
        await logSecurityEvent("IP_RATE_LIMIT_EXCEEDED", {
          promptLength: rawPrompt.length
        }, undefined, clientIP);
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes desde esta dirección IP. Intente de nuevo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!TURNSTILE_SECRET) {
        console.error('Missing TURNSTILE_SECRET for guest user verification');
        return new Response(JSON.stringify({ 
          error: "Error de configuración del servidor. Contacte al administrador.",
          code: "MISSING_TURNSTILE_SECRET"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!captchaToken) {
        return new Response(JSON.stringify({ error: "Captcha requerido para usuarios invitados." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: captchaToken,
          ...(clientIP !== "unknown" ? { remoteip: clientIP } : {}),
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        await logSecurityEvent("CAPTCHA_FAILED", {
          error: verifyData
        }, undefined, clientIP);
        return new Response(JSON.stringify({ error: "Captcha inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!userId && continueResponse) {
      console.log('Skipping captcha validation for continuation request');
      // For continuation requests, only apply basic rate limiting
      if (!checkIPRateLimit(clientIP)) {
        await logSecurityEvent("IP_RATE_LIMIT_EXCEEDED_CONTINUATION", {
          promptLength: rawPrompt.length
        }, undefined, clientIP);
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes desde esta dirección IP. Intente de nuevo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check usage limits for authenticated users using the enhanced secure function
    if (userId && !continueResponse) {
      const { data: limitCheck, error: limitError } = await supabase
        .rpc('check_usage_limits_secure', { 
          user_id: userId,
          client_ip: clientIP 
        });
      
      if (limitError) {
        console.error('Error checking usage limits:', limitError);
        throw limitError;
      }
      
      if (!limitCheck.allowed) {
        const errorMessages = {
          'Daily limit exceeded': 'Has alcanzado el límite diario de consultas.',
          'Monthly limit exceeded': 'Has alcanzado el límite mensual de consultas.',
          'User not found': 'Usuario no encontrado.'
        };
        
        return new Response(
          JSON.stringify({ 
            error: errorMessages[limitCheck.reason as keyof typeof errorMessages] || limitCheck.reason,
            usageInfo: limitCheck
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log('Usage check passed:', limitCheck);
    }

    let systemContent = SYSTEM_PROMPT;
    let userPrompt = rawPrompt;

    // Initialize variables for PubMed search - use the context provided by frontend
    let pubmedSearchContext = '';
    let pubmedReferences = pubmedContext || [];

    // Handle continuation of previous response
    if (continueResponse && previousResponse) {
      console.log('Processing continuation request:', { 
        originalPrompt: rawPrompt, 
        previousResponseLength: previousResponse.length,
        previousResponsePreview: previousResponse.slice(-100)
      });
      systemContent += "\n\nIMPORTANTE: Continúa la respuesta anterior sin repetir información ya proporcionada. Agrega contenido nuevo y complementario. NO repitas conceptos, definiciones o información ya mencionada.";
      
      // Get last 200 chars to understand context, but instruct to NOT repeat
      const contextPreview = previousResponse.slice(-200);
      userPrompt = `CONTINUAR (sin repetir): La respuesta anterior terminó con: "${contextPreview}..." Para la pregunta: "${rawPrompt.slice(0, 80)}". Proporciona información NUEVA y complementaria sin repetir lo ya explicado.`;
    } else if (continueResponse) {
      console.error('Continuation requested but no previousResponse provided');
      return new Response(JSON.stringify({ error: "Error: No se proporcionó respuesta anterior para continuar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Use PubMed context provided by frontend (already searched)
      if (pubmedContext && pubmedContext.length > 0) {
        console.log(`Using ${pubmedContext.length} PubMed articles provided by frontend`);
        pubmedSearchContext = `\n\nReferencias científicas de PubMed (${pubmedContext.length} artículos encontrados):\n${pubmedContext.map((article: any, index: number) => 
          `${index + 1}. "${article.title}" (${article.year}) - ${article.journal}
          Autores: ${article.authors}
          Resumen: ${article.abstract?.substring(0, 200) || 'Sin resumen disponible'}...
          URL: ${article.url}`
        ).join('\n\n')}`;
        
        systemContent += pubmedSearchContext;
        systemContent += "\n\nCRÍTICO: Estos artículos de PubMed son MUY RELEVANTES para la pregunta del usuario. DEBES mencionarlos explícitamente en tu respuesta citando los títulos específicos cuando sea apropiado. Integra esta información científica actual en tu respuesta de forma natural y profesional.";
      } else {
        console.log('No PubMed articles provided by frontend');
      }
    }

    const routerRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: routerModel,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        frequency_penalty: continueResponse ? 0.8 : 0.3, // Higher penalty for continuations to avoid repetition
        presence_penalty: continueResponse ? 0.6 : 0.1,  // Encourage new topics for continuations
      }),
    });

    if (!routerRes.ok) {
      const errorText = await routerRes.text();
      console.error("HF Router error:", routerRes.status, errorText);
      return new Response(JSON.stringify({ error: "Error al consultar el router de Hugging Face.", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await routerRes.json();
    let generated = data?.choices?.[0]?.message?.content ?? "";
    const finishReason = data?.choices?.[0]?.finish_reason;
    
    if (!generated) {
      generated = typeof data === "string" ? data : JSON.stringify(data);
    }

    // Post-process to remove potential repetition if this is a continuation
    if (continueResponse && previousResponse) {
      generated = deduplicateContent(generated, previousResponse);
    }

    // Save query (authenticated or anonymous with null user_id) - only if not skipping storage and not continuing
    let queryId = null;
    if (!skipStorage && !continueResponse) {
      const insertRes = await supabase.from("queries").insert({
        user_id: userId,
        prompt: rawPrompt,
        response: generated,
        pubmed_references: pubmedContext && pubmedContext.length > 0 ? pubmedContext : null,
        keywords: Array.isArray(keywords) ? keywords : (keywords ? [String(keywords)] : null),
        translated_query: translatedQuery ?? null,
        search_type: searchType ?? null,
        selected_keyword: selectedKeyword ?? null,
      }).select('id');
      
      if (insertRes.error) {
        console.error("Error inserting query:", insertRes.error);
        // Non-fatal: continue
      } else if (insertRes.data?.[0]) {
        queryId = insertRes.data[0].id;
      }
    } else if (continueResponse) {
      console.log("Skipping query storage for continuation response");
    }

    // Optionally update convenient counters for authenticated users (only if we saved the query)
    if (userId && !skipStorage) {
      // Recompute counts after insert
      const { count: newDaily } = await supabase
        .from("queries").select("id", { count: "exact", head: true })
        .eq("user_id", userId).gte("timestamp", startOfDay());
      const { count: newMonthly } = await supabase
        .from("queries").select("id", { count: "exact", head: true })
        .eq("user_id", userId).gte("timestamp", startOfMonth());
      await supabase.from("users").update({
        daily_count: newDaily ?? 0,
        monthly_count: newMonthly ?? 0,
      }).eq("id", userId);
    }

    // Determine if response can be continued based on finish_reason and token usage
    const canContinue = determineCanContinue(generated, finishReason, data?.usage);

    return new Response(JSON.stringify({ 
      response: generated, 
      queryId,
      pubmedReferences: continueResponse ? [] : (pubmedReferences || []), // Don't return references for continuations
      canContinue: canContinue
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ask-medgemma error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
