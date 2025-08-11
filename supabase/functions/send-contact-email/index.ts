import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  nombre: string;
  apellido: string;
  pais: string;
  email: string;
  telefono?: string;
  consulta: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resend) throw new Error("Falta RESEND_API_KEY en los secretos de funciones.");

    const { nombre, apellido, pais, email, telefono, consulta }: ContactEmailRequest = await req.json();

    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
      <p><strong>País:</strong> ${pais}</p>
      <p><strong>Correo:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${telefono || 'N/A'}</p>
      <p><strong>Consulta:</strong></p>
      <p>${consulta?.replace(/\n/g, '<br/>')}</p>
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
