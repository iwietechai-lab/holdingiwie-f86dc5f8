import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcription, title, participants, duration_seconds } = await req.json();
    
    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const durationMinutes = Math.round((duration_seconds || 0) / 60);
    const participantNames = participants?.join(', ') || 'Participantes no especificados';

    const systemPrompt = `Eres un asistente ejecutivo especializado en generar resúmenes de reuniones. 
Tu tarea es analizar la transcripción de una reunión y generar un resumen estructurado en español.

El resumen debe incluir:
1. **Resumen Ejecutivo**: Un párrafo conciso con los puntos más importantes.
2. **Participantes**: Lista de participantes.
3. **Puntos Clave Discutidos**: Lista con viñetas de los temas principales.
4. **Decisiones Tomadas**: Cualquier decisión o acuerdo mencionado.
5. **Tareas y Próximos Pasos**: Acciones a seguir con responsables si se mencionan.
6. **Notas Adicionales**: Cualquier información relevante adicional.

Mantén el formato profesional y claro. Si alguna sección no tiene información, omítela.`;

    const response = await fetch('https://api.lovable.dev/api/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Por favor genera un resumen de la siguiente reunión:

**Título de la Reunión**: ${title || 'Reunión sin título'}
**Participantes**: ${participantNames}
**Duración**: ${durationMinutes} minutos

**Transcripción de la Reunión**:
${transcription}` 
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Summary API error:', errorText);
      throw new Error(`Summary API error: ${response.status}`);
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content || 'No se pudo generar el resumen.';

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Summary generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
