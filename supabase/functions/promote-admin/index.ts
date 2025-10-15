import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Enhanced security logging
async function logSecurityEvent(eventType: string, details: any, ip?: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.rpc('log_security_event', {
      event_type: eventType,
      user_id: null,
      ip_address: ip || null,
      details: details || null
    });
    
    console.warn(`[SECURITY] ${eventType}:`, JSON.stringify(details));
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent('MISSING_AUTH_HEADER', {}, clientIP);
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's token to validate authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Validate JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      await logSecurityEvent('INVALID_AUTH_TOKEN', {}, clientIP);
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    
    if (!email) {
      await logSecurityEvent('MISSING_EMAIL', { user_id: user.id }, clientIP);
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await logSecurityEvent('INVALID_EMAIL_FORMAT', {
        email: email.substring(0, 10) + '...',
        user_id: user.id
      }, clientIP);
      
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow users to promote themselves (first-time admin setup)
    if (email.toLowerCase() !== user.email?.toLowerCase()) {
      await logSecurityEvent('UNAUTHORIZED_PROMOTION_ATTEMPT', { 
        requested_email: email.substring(0, 10) + '...',
        user_email: user.email?.substring(0, 10) + '...',
        user_id: user.id 
      }, clientIP);
      
      return new Response(JSON.stringify({ error: "Solo puedes promoverte a ti mismo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check allowed emails from environment
    const allowedEmails = (Deno.env.get("ALLOWED_PROMOTION_EMAILS") || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length === 0) {
      await logSecurityEvent('NO_ALLOWED_EMAILS_CONFIGURED', { user_id: user.id }, clientIP);
      return new Response(JSON.stringify({ error: "Admin promotion not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedEmails.includes(String(email).toLowerCase())) {
      await logSecurityEvent('EMAIL_NOT_IN_ALLOWLIST', {
        email: email.substring(0, 10) + '...',
        user_id: user.id
      }, clientIP);
      
      return new Response(JSON.stringify({ error: "Email not allowed for promotion" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client for privileged operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call the promotion function
    const { error } = await supabase.rpc('promote_to_admin', { user_email: email });

    if (error) {
      console.error('Error promoting user:', error);
      await logSecurityEvent('PROMOTION_RPC_ERROR', { 
        email: email.substring(0, 10) + '...',
        error: error.message,
        user_id: user.id 
      }, clientIP);
      
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark user as needing password change
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { force_password_change: true }
    });

    if (updateError) {
      console.warn('Could not set force_password_change flag:', updateError);
    }

    // Log successful promotion
    await logSecurityEvent('ADMIN_PROMOTION_SUCCESS', {
      email: email.substring(0, 10) + '...',
      user_id: user.id
    }, clientIP);

    return new Response(JSON.stringify({ success: true, message: `User ${email} promoted to admin` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});