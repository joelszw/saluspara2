import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  userId: string;
  fromDate: string;
  toDate: string;
  format: 'csv' | 'json';
}

interface ExportQuery {
  prompt: string;
  response: string;
  summary: string | null;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Export history function called');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get JWT token from headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, fromDate, toDate, format }: ExportRequest = await req.json();

    // Validate request
    if (!userId || !fromDate || !toDate || !format) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, fromDate, toDate, format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user can only export their own data
    if (userId !== user.id) {
      console.error(`User ${user.id} tried to export data for user ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Can only export your own data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate format
    if (format !== 'csv' && format !== 'json') {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be "csv" or "json"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ error: 'Invalid date range: fromDate must be before toDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for maximum 1 year range
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYear) {
      return new Response(
        JSON.stringify({ error: 'Date range cannot exceed 1 year' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Exporting ${format} for user ${userId} from ${fromDate} to ${toDate}`);

    // Check user exists and is authenticated (no subscription restriction for exports)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} has subscription: ${userData.subscription_status}`);

    // Query the database with RLS automatically applied
    const { data: queries, error: queryError } = await supabase
      .from('queries')
      .select('prompt, response, summary, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', fromDate)
      .lte('timestamp', toDate)
      .order('timestamp', { ascending: false });

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queries' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queries || queries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No queries found in the specified date range' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${queries.length} queries to export for registered user`);

    // Log export activity for registered users (free tier allowed)
    await supabase
      .from('function_usage')
      .insert({
        user_id: userId,
        function_name: 'export-history',
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });

    // Generate the file content
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      // Generate CSV with UTF-8 BOM for Excel compatibility
      const csvHeader = 'Pregunta,Respuesta,Resumen Clínico,Fecha y Hora\n';
      const csvRows = queries.map((query: ExportQuery) => {
        const escapeCsv = (text: string | null) => {
          if (!text) return '';
          return `"${text.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')}"`;
        };
        
        return [
          escapeCsv(query.prompt),
          escapeCsv(query.response),
          escapeCsv(query.summary),
          escapeCsv(new Date(query.timestamp).toLocaleString('es-ES'))
        ].join(',');
      }).join('\n');
      
      content = '\uFEFF' + csvHeader + csvRows; // UTF-8 BOM
      contentType = 'text/csv;charset=utf-8';
      filename = `salustia-historial-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv`;
    } else {
      // Generate JSON
      const jsonData = {
        exportInfo: {
          generatedAt: new Date().toISOString(),
          userId: userId,
          dateRange: { 
            from: fromDate, 
            to: toDate 
          },
          totalQueries: queries.length,
          exportedBy: 'Salustia by Aware Doctor'
        },
        queries: queries.map((query: ExportQuery) => ({
          prompt: query.prompt,
          response: query.response,
          summary: query.summary,
          timestamp: query.timestamp
        }))
      };
      
      content = JSON.stringify(jsonData, null, 2);
      contentType = 'application/json;charset=utf-8';
      filename = `salustia-historial-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.json`;
    }

    console.log(`Generated ${format} file: ${filename}`);

    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': content.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in export-history function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});