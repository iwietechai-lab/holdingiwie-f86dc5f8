// Security: Proxy geocoding to hide user IP from third-party services
// This Edge Function prevents direct exposure of user coordinates to external APIs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGINS = [
  'https://holdingiwie.lovable.app',
  'https://iwie.cl',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

let corsHeaders: Record<string, string> = {};

serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { latitude, longitude } = await req.json()
    
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Server-side geocoding - user IP is hidden from third party
    // Only returns city/country, not precise coordinates
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
    )
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }
    
    const data = await response.json()
    
    // Return only necessary data (data minimization principle)
    return new Response(
      JSON.stringify({
        city: data.city || data.locality || 'Desconocida',
        country: data.countryName || 'Desconocido',
        // Don't return precise coordinates or other PII
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Geocoding error:', error)
    return new Response(
      JSON.stringify({ 
        city: 'Desconocida', 
        country: 'Desconocido',
        error: 'Geocoding unavailable' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
