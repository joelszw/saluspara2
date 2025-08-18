import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HUGGINGFACE_API_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";

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

interface SummaryRequest { 
  queryId: string;
  prompt: string; 
  response: string; 
}

const SUMMARY_SYSTEM_PROMPT = `Eres un especialista en resumir consultas médicas de traumatología y ortopedia. Tu tarea es crear un resumen estructurado y conciso que destaque:

1. DIAGNÓSTICO PRINCIPAL: El diagnóstico más probable mencionado
2. DIAGNÓSTICOS DIFERENCIALES: Otras posibilidades diagnósticas consideradas
3. EVIDENCIAS CLAVE: Hallazgos clínicos, estudios o signos relevantes mencionados
4. TRATAMIENTO SUGERIDO: Opciones terapéuticas recomendadas
5. CONSIDERACIONES ESPECIALES: Factores de riesgo, complicaciones o seguimiento

Mantén un formato profesional y médico. Sé conciso pero completo. Si alguna sección no aplica, omítela.

Estructura tu respuesta así:
**DIAGNÓSTICO PRINCIPAL:** [diagnóstico]
**DIAGNÓSTICOS DIFERENCIALES:** [lista]
**EVIDENCIAS CLAVE:** [hallazgos relevantes]
**TRATAMIENTO:** [opciones terapéuticas]
**CONSIDERACIONES:** [factores especiales]`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!HUGGINGFACE_API_TOKEN) {
      throw new Error("Falta HUGGINGFACE_API_TOKEN en los secretos de funciones.");
    }

    const { queryId, prompt, response } = (await req.json()) as SummaryRequest;
    
    if (!queryId || !prompt || !response) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos." }), {
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

    // Verify user has access to this query
    let userId: string | null = null;
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData.user?.id ?? null;
    }

    // Generate summary using HuggingFace
    const summaryPrompt = `CONSULTA ORIGINAL: ${prompt}\n\nRESPUESTA MÉDICA: ${response}\n\nGenera un resumen estructurado de esta consulta médica:`;
    
    const routerRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct:groq",
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { role: "user", content: summaryPrompt },
        ],
        temperature: 0.1,
        max_tokens: 400,
      }),
    });

    if (!routerRes.ok) {
      const errorText = await routerRes.text();
      console.error("HF Router error:", routerRes.status, errorText);
      throw new Error("Error al generar resumen");
    }

    const data = await routerRes.json();
    let summary = data?.choices?.[0]?.message?.content ?? "";
    
    if (!summary) {
      summary = "No se pudo generar resumen automático.";
    }

    // Update the query with the summary
    const updateRes = await supabase
      .from("queries")
      .update({ summary })
      .eq("id", queryId)
      .eq("user_id", userId); // Ensure RLS - only update own queries

    if (updateRes.error) {
      console.error("Error updating query with summary:", updateRes.error);
      // Non-fatal: return summary anyway
    }

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-summary error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});