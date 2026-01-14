import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KnowledgeEntry {
  id: string;
  type: 'text' | 'url' | 'pdf';
  title: string;
  content: string;
}

interface ChatRequest {
  message: string;
  chatbot_id: string;
  company_id: string;
  knowledge_base?: KnowledgeEntry[];
  system_prompt?: string;
  history?: { role: string; content: string }[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, knowledge_base, system_prompt, history } = body;

    console.log('CEO Chatbot request:', { message, company_id: body.company_id });

    // Build knowledge context
    let knowledgeContext = '';
    if (knowledge_base && knowledge_base.length > 0) {
      knowledgeContext = '\n\nBase de conocimiento disponible:\n' + 
        knowledge_base.map(k => `- ${k.title}: ${k.content}`).join('\n');
    }

    // Build conversation history
    const conversationHistory = (history || []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Get Lovable AI Gateway key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system message
    const systemMessage = `${system_prompt || 'Eres el asistente virtual del CEO. Responde de manera profesional y cordial.'}

Tu objetivo es ayudar a los empleados con:
1. Consultas sobre la empresa y políticas
2. Crear solicitudes de reunión
3. Generar tickets de trabajo
4. Responder preguntas generales

${knowledgeContext}

Cuando el usuario quiera crear una reunión, responde con un JSON en el formato:
{"action": "create_meeting", "title": "...", "description": "...", "duration_minutes": 60}

Cuando el usuario quiera crear un ticket, responde con un JSON en el formato:
{"action": "create_ticket", "title": "...", "description": "...", "priority": "media|alta|urgente|baja"}

Para respuestas normales, responde directamente en texto.`;

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMessage },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';

    console.log('AI Response:', assistantMessage);

    // Check if response contains an action
    let metadata = null;
    try {
      const jsonMatch = assistantMessage.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Not JSON, that's fine
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        metadata,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('CEO Chatbot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
