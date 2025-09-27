import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") ?? "";

const getCorsHeaders = (req: Request) => {
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
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ContactEmailRequest {
  nombre: string;
  apellido: string;
  pais: string;
  email: string;
  telefono?: string;
  consulta: string;
  captchaToken?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resend) throw new Error("Falta RESEND_API_KEY en los secretos de funciones.");

    const { nombre, apellido, pais, email, telefono, consulta, captchaToken }: ContactEmailRequest = await req.json();

    // Turnstile verification for abuse prevention (required)
    if (!TURNSTILE_SECRET) {
      return new Response(JSON.stringify({ error: "Falta TURNSTILE_SECRET en los secretos de funciones." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!captchaToken) {
      return new Response(JSON.stringify({ error: "Captcha requerido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: captchaToken,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: "Captcha inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic input validation
    if (!nombre || !apellido || !pais || !email || !consulta) {
      return new Response(JSON.stringify({ error: "Todos los campos obligatorios deben estar completos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Correo inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (consulta.length > 2000) {
      return new Response(JSON.stringify({ error: "La consulta es demasiado larga (máx. 2000 caracteres)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)} ${escapeHtml(apellido)}</p>
      <p><strong>País:</strong> ${escapeHtml(pais)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono || 'N/A')}</p>
      <p><strong>Consulta:</strong></p>
      <p>${escapeHtml(consulta).replace(/\n/g, '<br/>')}</p>
    `;

    const result = await resend.emails.send({
      from: "Soporte Aware <onboarding@resend.dev>",
      to: ["joelszw@gmail.com"],
      subject: "[Contacto] Consulta desde el chatbot médico",
      html,
      reply_to: email,
    });

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error en send-contact-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
