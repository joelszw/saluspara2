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

interface SearchRequest {
  prompt: string;
}

// Security: Input validation and sanitization
function sanitizePrompt(prompt: string): string {
  // Remove potential script injections and limit length
  return prompt
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 500);
}

// Security: Log security events
function logSecurityEvent(event: string, details: any) {
  console.warn(`[SECURITY] ${event}:`, JSON.stringify(details));
}

interface EuropePMCArticle {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  doi: string;
  url: string;
  year: string;
  journal: string;
}

// Translate Spanish to English using HuggingFace
async function translateToEnglish(text: string): Promise<string> {
  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct:groq",
        messages: [
          {
            role: "system",
            content: "You are a professional medical translator. Translate the following Spanish medical text to English. Only return the English translation, nothing else."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original if translation fails
  }
}

// Extract keywords from English text using HuggingFace
async function extractKeywords(text: string): Promise<string[]> {
  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct:groq",
        messages: [
          {
            role: "system",
            content: "Extract 3-5 key medical terms or keywords from the following medical text. Return only the keywords separated by commas, nothing else. Focus on medical conditions, procedures, anatomy, and treatments."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Keyword extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const keywordsText = data?.choices?.[0]?.message?.content?.trim() || "";
    return keywordsText.split(",").map((k: string) => k.trim()).filter(Boolean);
  } catch (error) {
    console.error("Keyword extraction error:", error);
    return []; // Return empty array if extraction fails
  }
}

// Search Europe PMC for articles
async function searchEuropePMC(keywords: string[]): Promise<EuropePMCArticle[]> {
  if (keywords.length === 0) return [];

  try {
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - 3;
    const query = keywords.join(" ");
    
    const searchUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&resultType=core&format=json&fromDate=${fromYear}-01-01&toDate=${currentYear}-12-31&pageSize=5`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`Europe PMC API failed: ${response.status}`);
    }

    const data = await response.json();
    const articles = data?.resultList?.result || [];

    return articles.map((article: any): EuropePMCArticle => ({
      id: article.id || "",
      title: article.title || "Título no disponible",
      authors: article.authorString || "Autores no disponibles",
      abstract: article.abstractText ? (article.abstractText.substring(0, 200) + "...") : "Resumen no disponible",
      doi: article.doi || "",
      url: article.pmid ? `https://europepmc.org/article/MED/${article.pmid}` : `https://europepmc.org/article/${article.source}/${article.id}`,
      year: article.pubYear?.toString() || "Año no disponible",
      journal: article.journalTitle || "Revista no disponible"
    }));
  } catch (error) {
    console.error("Europe PMC search error:", error);
    return [];
  }
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

    const { prompt } = (await req.json()) as SearchRequest;
    
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "El prompt no puede estar vacío." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Security: Get client IP for logging
    const clientIP = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";

    // Security: Sanitize input prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    
    if (sanitizedPrompt !== prompt) {
      logSecurityEvent("PROMPT_SANITIZED", {
        originalLength: prompt.length,
        sanitizedLength: sanitizedPrompt.length,
        ip: clientIP
      });
    }

    // Security: Validate prompt length
    if (sanitizedPrompt.length > 500) {
      logSecurityEvent("PROMPT_TOO_LONG", {
        promptLength: sanitizedPrompt.length,
        ip: clientIP
      });
      return new Response(JSON.stringify({ error: "El prompt excede el límite de 500 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting Europe PMC search for prompt:", sanitizedPrompt);

    // Step 1: Translate to English (using sanitized prompt)
    const translatedPrompt = await translateToEnglish(sanitizedPrompt);
    console.log("Translated prompt:", translatedPrompt);

    // Step 2: Extract keywords
    const keywords = await extractKeywords(translatedPrompt);
    console.log("Extracted keywords:", keywords);

    // Step 3: Search Europe PMC
    const articles = await searchEuropePMC(keywords);
    console.log("Found articles:", articles.length);

    return new Response(JSON.stringify({ 
      articles,
      translatedPrompt,
      keywords 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("europe-pmc-search error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});