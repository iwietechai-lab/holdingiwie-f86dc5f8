import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface CeoAvailability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ChatRequest {
  message: string;
  chatbot_id: string;
  company_id: string;
  knowledge_base?: KnowledgeEntry[];
  system_prompt?: string;
  history?: { role: string; content: string }[];
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, knowledge_base, system_prompt, history } = body;

    console.log('CEO Chatbot request:', { message, company_id: body.company_id });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch CEO availability
    const { data: availabilityData, error: availError } = await supabase
      .from('ceo_availability')
      .select('*')
      .eq('is_active', true)
      .order('day_of_week', { ascending: true });

    if (availError) {
      console.error('Error fetching availability:', availError);
    }

    // Format availability for the AI
    let availabilityContext = '';
    if (availabilityData && availabilityData.length > 0) {
      const groupedByDay: { [key: number]: CeoAvailability[] } = {};
      availabilityData.forEach((slot: CeoAvailability) => {
        if (!groupedByDay[slot.day_of_week]) {
          groupedByDay[slot.day_of_week] = [];
        }
        groupedByDay[slot.day_of_week].push(slot);
      });

      availabilityContext = '\n\nHORARIOS DISPONIBLES DEL CEO PARA REUNIONES:\n';
      for (const dayNum of Object.keys(groupedByDay).map(Number).sort()) {
        const daySlots = groupedByDay[dayNum];
        const slotsText = daySlots.map(s => `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`).join(', ');
        availabilityContext += `- ${DAY_NAMES[dayNum]}: ${slotsText}\n`;
      }
      availabilityContext += '\nNOTA: El CEO solo está disponible en estos días y horarios. NO puedes asignar reuniones fuera de estos horarios.';
    } else {
      availabilityContext = '\n\nNOTA: El CEO no tiene horarios de disponibilidad configurados actualmente. No se pueden agendar reuniones hasta que configure su disponibilidad.';
    }

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

    // Build system message with availability info
    const systemMessage = `${system_prompt || 'Eres el asistente virtual del CEO. Responde de manera profesional y cordial.'}

Tu objetivo es ayudar a los empleados con:
1. Consultas sobre la empresa y políticas
2. Ayudar a agendar reuniones con el CEO
3. Generar tickets de trabajo
4. Responder preguntas generales

${knowledgeContext}
${availabilityContext}

INSTRUCCIONES PARA REUNIONES:
- Cuando el usuario quiera agendar una reunión, PRIMERO muéstrale los días y horarios disponibles del CEO.
- NO asignes fechas automáticamente. Pide al usuario que elija un día y horario de los disponibles.
- Una vez que el usuario elija un día y horario específico, responde con el siguiente JSON para crear la solicitud:
{"action": "request_meeting", "title": "título de la reunión", "description": "descripción", "duration_minutes": 30, "day_of_week": número_del_día, "preferred_time": "HH:MM"}

Donde day_of_week es: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado

INSTRUCCIONES PARA TICKETS:
- Cuando el usuario quiera crear un ticket, responde con el siguiente JSON:
{"action": "create_ticket", "title": "...", "description": "...", "priority": "media|alta|urgente|baja"}

IMPORTANTE:
- Responde siempre en texto amigable y profesional.
- Cuando muestres los horarios disponibles, hazlo de forma clara y organizada.
- Solo incluye el JSON cuando el usuario haya confirmado todos los detalles necesarios.`;

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
