import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HUGGINGFACE_API_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";
const HUGGINGFACE_MODEL_ID = Deno.env.get("HUGGINGFACE_MODEL_ID") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AskRequest { prompt: string; model?: string }

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HUGGINGFACE_API_TOKEN) {
      throw new Error("Falta HUGGINGFACE_API_TOKEN en los secretos de funciones.");
    }

    const { prompt, model } = (await req.json()) as AskRequest;
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
    // Determine model ID (request override takes precedence)
    const reqModel = (model ?? "").trim();
    const modelId = reqModel || HUGGINGFACE_MODEL_ID;
    if (!modelId) {
      return new Response(JSON.stringify({ error: "Falta HUGGINGFACE_MODEL_ID o proporciona 'model' en la petición." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Build constrained prompt to enforce traumatology-only scope
    const combinedPrompt = `${SYSTEM_PROMPT}\n\nUser question:\n${rawPrompt}\n\nFollow the STRICT BEHAVIORAL RULES above.`;
    // Call Hugging Face Inference API
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: combinedPrompt,
          parameters: { max_new_tokens: 512, temperature: 0.2 },
        }),
      }
    );

    if (!hfRes.ok) {
      const errorText = await hfRes.text();
      console.error("HuggingFace error:", hfRes.status, errorText);
      const message = hfRes.status === 404
        ? "Modelo de Hugging Face no encontrado o sin acceso. Verifica HUGGINGFACE_MODEL_ID y los permisos del token."
        : "Error al consultar el modelo de Hugging Face.";
      return new Response(JSON.stringify({ error: message, details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await hfRes.json();
    // HF returns array with generated_text or text; support both
    let generated = "";
    if (Array.isArray(data)) {
      const first = data[0];
      generated = first?.generated_text ?? first?.text ?? JSON.stringify(first);
    } else if (data?.generated_text || data?.text) {
      generated = data.generated_text ?? data.text;
    } else {
      generated = typeof data === "string" ? data : JSON.stringify(data);
    }

    // Save query (authenticated or anonymous with null user_id)
    const insertRes = await supabase.from("queries").insert({
      user_id: userId,
      prompt: rawPrompt,
      response: generated,
    });
    if (insertRes.error) {
      console.error("Error inserting query:", insertRes.error);
      // Non-fatal: continue
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

    return new Response(JSON.stringify({ response: generated }), {
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
