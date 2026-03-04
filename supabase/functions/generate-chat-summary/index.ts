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

interface MessageInput {
  sender: string;
  content: string;
  sent_at: string;
}

interface RequestBody {
  chat_id: string;
  messages: MessageInput[];
}

serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chat_id, messages } = await req.json() as RequestBody;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format messages for the AI
    const conversationText = messages.map(m => 
      `[${new Date(m.sent_at).toLocaleString('es-CL')}] ${m.sender}: ${m.content}`
    ).join('\n');

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://api.lovable.dev/api/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Eres un asistente empresarial que genera informes ejecutivos de conversaciones.
            
Tu tarea es analizar la conversación proporcionada y generar un informe ejecutivo estructurado que incluya:

1. **Resumen Ejecutivo**: Descripción breve del tema principal de la conversación
2. **Participantes**: Lista de las personas involucradas
3. **Puntos Clave Discutidos**: Los temas principales tratados
4. **Decisiones Tomadas**: Si hubo acuerdos o decisiones
5. **Acciones Pendientes**: Tareas o seguimientos mencionados
6. **Conclusiones**: Síntesis final

Genera el informe en español, de forma profesional y concisa.`
          },
          {
            role: 'user',
            content: `Por favor genera un informe ejecutivo de la siguiente conversación:\n\n${conversationText}`
          }
        ],
        model: 'google/gemini-2.5-flash',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || 'No se pudo generar el informe';

    return new Response(
      JSON.stringify({ summary, chat_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating summary:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
