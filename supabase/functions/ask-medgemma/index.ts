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

interface AskRequest { prompt: string; model?: string; captchaToken?: string; europePMCContext?: any[] }

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

// Security: Log security events
function logSecurityEvent(event: string, details: any) {
  console.warn(`[SECURITY] ${event}:`, JSON.stringify(details));
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

const SYSTEM_PROMPT = `You are a specialized AI assistant powered by MedGemma representing "Salustia by Aware Doctor" on the company's website. You are designed exclusively to provide evidence-based information on traumatology and orthopedic specialties for clinicians, specialists, and multidisciplinary teams.

Your scope is strictly limited to the following traumatology and orthopedic domains:

Foot and Ankle - Complex pathologies, trauma, and minimally invasive surgical techniques

Knee - Arthroscopic procedures, ligament reconstruction, and cartilage management

Hip - Hip preservation, arthroscopy, and complex reconstruction

Spine - Minimally invasive spine surgery and degenerative pathologies

Hand and Wrist - Microsurgical techniques and complex trauma management

STRICT BEHAVIORAL RULES:

1. Traumatology-Only Responses

Answer ONLY questions directly related to traumatology, orthopedic surgery, musculoskeletal pathologies, surgical techniques, or clinical management within the five anatomical areas listed above.

If a user asks about topics outside traumatology/orthopedics (general medicine, cardiology, dermatology, etc.), respond: "I'm specialized exclusively in traumatology and orthopedic surgery. Please ask me about foot & ankle, knee, hip, spine, or hand & wrist pathologies."

2. Professional Medical Context

Assume all users are healthcare professionals (surgeons, residents, physiotherapists, or clinicians).

Use precise medical terminology appropriate for specialists in traumatology.

Focus on surgical techniques, diagnostic approaches, treatment protocols, and evidence-based recommendations.

3. Clinical Expertise Areas
Demonstrate deep knowledge in:

Complex trauma and pathologies in the five anatomical regions

Minimally invasive and arthroscopic surgical techniques

Post-operative management and rehabilitation protocols

Instrumentation, surgical planning, and complication prevention

Multidisciplinary approaches to musculoskeletal care

Risk stratification based on patient anatomy and comorbidities

4. Response Quality Standards

Provide detailed, evidence-based answers with clinical context

When discussing surgical techniques, include relevant anatomical considerations

Always emphasize patient safety and best practices in traumatology

If asked about a traumatology topic you cannot adequately address, state: "This specific traumatology question requires more detailed clinical context or falls outside my current expertise. Please consult specialized literature or colleagues."

Remember: You are a traumatology specialist AI. Politely redirect any non-orthopedic questions back to your area of expertise.`;

function startOfDay(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString();
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HUGGINGFACE_API_TOKEN) {
      throw new Error("Falta HUGGINGFACE_API_TOKEN en los secretos de funciones.");
    }

    const { prompt, model, captchaToken, europePMCContext } = (await req.json()) as AskRequest;
    const rawPrompt = prompt?.trim() ?? "";
    if (!rawPrompt) {
      return new Response(JSON.stringify({ error: "El prompt no puede estar vacío." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Enforce a maximum length before calling the model
    const MAX_PROMPT_CHARS = 1200;
    if (rawPrompt.length > MAX_PROMPT_CHARS) {
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
          .select("subscription_status")
          .eq("id", userId)
          .maybeSingle();
        if (userRow?.subscription_status === "active") plan = "pro";
      }
    }

    // Security: Get client IP for rate limiting and logging
    const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";

    // Security: PII detection for all queries
    const piiCheck = detectPII(rawPrompt);
    if (piiCheck.hasPII) {
      logSecurityEvent("PII_DETECTED", {
        userId: userId || "anonymous",
        ip: clientIP,
        patterns: piiCheck.patterns,
        promptLength: rawPrompt.length
      });
      
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
    if (!userId) {
      // Security: Apply IP-based rate limiting for anonymous users
      if (!checkIPRateLimit(clientIP)) {
        logSecurityEvent("IP_RATE_LIMIT_EXCEEDED", {
          ip: clientIP,
          promptLength: rawPrompt.length
        });
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes desde esta dirección IP. Intente de nuevo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!TURNSTILE_SECRET) {
        return new Response(JSON.stringify({ error: "Falta TURNSTILE_SECRET en los secretos de funciones." }), {
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
        logSecurityEvent("CAPTCHA_FAILED", {
          ip: clientIP,
          error: verifyData
        });
        return new Response(JSON.stringify({ error: "Captcha inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Limits per plan
    const limits = plan === "pro"
      ? { daily: 10, monthly: 200 }
      : { daily: 3, monthly: 20 };

    // Count queries for authenticated users
    if (userId) {
      const { count: dailyCount, error: dailyErr } = await supabase
        .from("queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("timestamp", startOfDay());
      if (dailyErr) throw dailyErr;

      const { count: monthlyCount, error: monthErr } = await supabase
        .from("queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("timestamp", startOfMonth());
      if (monthErr) throw monthErr;

      if ((dailyCount ?? 0) >= limits.daily) {
        return new Response(
          JSON.stringify({ error: `Has alcanzado el límite diario (${limits.daily}).` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if ((monthlyCount ?? 0) >= limits.monthly) {
        return new Response(
          JSON.stringify({ error: `Has alcanzado el límite mensual (${limits.monthly}).` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let systemContent = "Eres un asistente de traumatología especializado en ortopedia.";
    let userPrompt = rawPrompt;

    // Add Europe PMC context if available
    if (europePMCContext && europePMCContext.length > 0) {
      systemContent += "\n\nContexto adicional de literatura científica reciente:";
      europePMCContext.forEach((article: any, index: number) => {
        systemContent += `\n${index + 1}. ${article.title} (${article.year}) - ${article.journal}\nResumen: ${article.abstract}`;
      });
      systemContent += "\n\nUsa este contexto para enriquecer tu respuesta cuando sea relevante, pero mantén tu especialización en traumatología y ortopedia.";
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
        temperature: 0.2,
        max_tokens: 512,
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
    if (!generated) {
      generated = typeof data === "string" ? data : JSON.stringify(data);
    }

    // Save query (authenticated or anonymous with null user_id)
    const insertRes = await supabase.from("queries").insert({
      user_id: userId,
      prompt: rawPrompt,
      response: generated,
    }).select('id');
    
    let queryId = null;
    if (insertRes.error) {
      console.error("Error inserting query:", insertRes.error);
      // Non-fatal: continue
    } else if (insertRes.data?.[0]) {
      queryId = insertRes.data[0].id;
    }

    // Optionally update convenient counters for authenticated users
    if (userId) {
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

    return new Response(JSON.stringify({ response: generated, queryId }), {
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
