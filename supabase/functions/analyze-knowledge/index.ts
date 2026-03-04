import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://holdingiwie.lovable.app',
  'https://id-preview--884c43a8-f6d4-4c81-bcd5-d38f99303288.lovable.app',
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

interface AnalyzeRequest {
  knowledgeId?: string;
  content?: string;
  title?: string;
  category?: string;
  companyName?: string;
  action: 'analyze' | 'chat' | 'suggest_response';
  message?: string;
  context?: string;
}

serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { knowledgeId, content, title, category, companyName, action, message, context } = await req.json() as AnalyzeRequest;

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'analyze') {
      // Analyze knowledge content and extract key points
      systemPrompt = `Eres un asistente ejecutivo de alto nivel que analiza información estratégica para CEOs.
Tu rol es:
1. Resumir el contenido de manera clara y ejecutiva
2. Extraer los puntos clave más importantes
3. Identificar acciones recomendadas
4. Sugerir cómo comunicar esta información al equipo

Responde en español de manera profesional y concisa.`;

      userPrompt = `Analiza el siguiente contenido de conocimiento corporativo:

**Título:** ${title || 'Sin título'}
**Categoría:** ${category || 'General'}
**Empresa:** ${companyName || 'No especificada'}

**Contenido:**
${content}

Por favor proporciona:
1. **Resumen Ejecutivo** (2-3 oraciones)
2. **Puntos Clave** (lista de 3-5 puntos principales)
3. **Acciones Recomendadas** (si aplica)
4. **Sugerencia de Comunicación** (cómo transmitir esto al equipo)`;

    } else if (action === 'chat') {
      // Internal chatbot for understanding knowledge
      systemPrompt = `Eres un asistente ejecutivo inteligente que ayuda al CEO a comprender y gestionar el conocimiento corporativo.
Tienes acceso al siguiente contexto de conocimiento:

${context || 'No hay contexto disponible'}

Tu rol es:
- Responder preguntas sobre el conocimiento cargado
- Ayudar a estructurar estrategias y directrices
- Sugerir mejoras o aclaraciones
- Proponer cómo comunicar la información al equipo

Responde de manera profesional, clara y en español.`;

      userPrompt = message || '';

    } else if (action === 'suggest_response') {
      // Suggest how the CEO chatbot should respond
      systemPrompt = `Eres un asistente que ayuda al CEO a definir cómo su chatbot debe comunicar información al equipo.

Contexto del conocimiento:
${context || 'No hay contexto disponible'}

Tu rol es sugerir:
1. El tono apropiado para comunicar esta información
2. Los puntos más importantes a transmitir
3. Qué información puede compartirse y cuál es confidencial
4. Ejemplos de respuestas que el chatbot podría dar

Responde en español de manera clara y estructurada.`;

      userPrompt = message || 'Sugiere cómo el chatbot debería transmitir esta información al equipo.';
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Se requiere agregar créditos a Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    // If analyzing, try to extract structured key points
    let keyPoints: string[] = [];
    if (action === 'analyze') {
      const keyPointsMatch = aiResponse.match(/\*\*Puntos Clave\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);
      if (keyPointsMatch) {
        const pointsText = keyPointsMatch[1];
        keyPoints = pointsText
          .split(/[-•\d.]\s*/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 10);
      }

      // Extract summary
      const summaryMatch = aiResponse.match(/\*\*Resumen Ejecutivo\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : aiResponse.substring(0, 500);

      return new Response(JSON.stringify({
        success: true,
        response: aiResponse,
        summary: summary,
        keyPoints: keyPoints,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-knowledge function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
