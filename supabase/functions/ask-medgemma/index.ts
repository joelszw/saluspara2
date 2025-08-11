import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const HUGGINGFACE_API_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AskRequest { prompt: string }

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

    const { prompt } = (await req.json()) as AskRequest;
    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "El prompt no puede estar vacío." }), {
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

    // Call Hugging Face Inference API
    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/google/medgemma-4b-it",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 512, temperature: 0.2 },
        }),
      }
    );

    if (!hfRes.ok) {
      const errorText = await hfRes.text();
      console.error("HuggingFace error:", errorText);
      return new Response(JSON.stringify({ error: "Error al consultar el modelo." }), {
        status: 500,
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
      prompt,
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
