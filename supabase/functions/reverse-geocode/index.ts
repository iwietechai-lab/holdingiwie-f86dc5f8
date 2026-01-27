// Security: Proxy geocoding to hide user IP from third-party services
// This Edge Function prevents direct exposure of user coordinates to external APIs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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
