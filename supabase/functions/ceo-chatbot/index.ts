import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KnowledgeEntry {
  id: string;
  company_id: string;
  category: string;
  title: string;
  content: string;
  is_confidential: boolean;
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
  user_id: string;
  user_name: string;
  user_company_id: string;
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
    const { message, user_id, user_name, user_company_id, history } = body;

    console.log('CEO Chatbot request:', { message, user_id, user_name, user_company_id });

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

    // Fetch knowledge entries the user has access to
    // User can access: 1) Their own company's knowledge, 2) Knowledge from companies they have explicit access to
    const { data: userAccessData } = await supabase
      .from('ceo_knowledge_access')
      .select('company_id')
      .eq('user_id', user_id);

    const accessibleCompanies = [user_company_id];
    if (userAccessData) {
      userAccessData.forEach((access: { company_id: string }) => {
        if (!accessibleCompanies.includes(access.company_id)) {
          accessibleCompanies.push(access.company_id);
        }
      });
    }

    console.log('Accessible companies for user:', accessibleCompanies);

    // Fetch knowledge entries from accessible companies
    const { data: knowledgeData, error: knowledgeError } = await supabase
      .from('ceo_knowledge')
      .select('*')
      .in('company_id', accessibleCompanies)
      .order('category', { ascending: true });

    if (knowledgeError) {
      console.error('Error fetching knowledge:', knowledgeError);
    }

    // Fetch company names for context
    const { data: companiesData } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', accessibleCompanies);

    const companyNames: { [key: string]: string } = {};
    if (companiesData) {
      companiesData.forEach((c: { id: string; name: string }) => {
        companyNames[c.id] = c.name;
      });
    }

    // Build knowledge context organized by company and category
    let knowledgeContext = '';
    if (knowledgeData && knowledgeData.length > 0) {
      const groupedByCompany: { [key: string]: KnowledgeEntry[] } = {};
      knowledgeData.forEach((entry: KnowledgeEntry) => {
        if (!groupedByCompany[entry.company_id]) {
          groupedByCompany[entry.company_id] = [];
        }
        groupedByCompany[entry.company_id].push(entry);
      });

      knowledgeContext = '\n\nBASE DE CONOCIMIENTO DEL CEO:\n';
      for (const companyId of Object.keys(groupedByCompany)) {
        const companyName = companyNames[companyId] || companyId;
        knowledgeContext += `\n=== ${companyName} ===\n`;
        
        const entries = groupedByCompany[companyId];
        const byCategory: { [key: string]: KnowledgeEntry[] } = {};
        entries.forEach(e => {
          if (!byCategory[e.category]) byCategory[e.category] = [];
          byCategory[e.category].push(e);
        });

        for (const category of Object.keys(byCategory)) {
          knowledgeContext += `\n[${category.toUpperCase()}]\n`;
          byCategory[category].forEach(e => {
            knowledgeContext += `• ${e.title}: ${e.content}\n`;
          });
        }
      }
    } else {
      knowledgeContext = '\n\nNOTA: No hay información específica configurada para este usuario aún.';
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

    // Build system message with CEO internal communication style
    const systemMessage = `Eres el asistente virtual personal de Mauricio, CEO de IWIE Holding. Tu función es ser el canal de comunicación directa entre el CEO y su equipo.

IMPORTANTE - CONTEXTO DEL USUARIO ACTUAL:
- Nombre del usuario: ${user_name}
- SIEMPRE saluda al usuario por su nombre de manera cordial y profesional.
- Este es un canal de comunicación INTERNA, no de ventas ni atención al cliente.

TU TONO Y ESTILO:
- Habla como lo haría un CEO comunicándose con su equipo de trabajo
- Sé directo, profesional pero cercano
- No uses frases de vendedor ni de atención al cliente
- Transmite la visión y valores del CEO
- Cuando compartas información de la base de conocimiento, hazlo como si el CEO la estuviera explicando personalmente
- Puedes usar primera persona cuando transmitas directrices del CEO (ej: "Mi visión es...")

TU OBJETIVO ES AYUDAR CON:
1. Compartir información estratégica, proyecciones y directrices del CEO
2. Responder consultas sobre las empresas y proyectos del holding
3. Ayudar a agendar reuniones con el CEO
4. Generar tickets de trabajo cuando sea necesario
5. Transmitir ideas e información relevante según el nivel de acceso del usuario

${knowledgeContext}
${availabilityContext}

RESTRICCIONES DE ACCESO:
- Solo puedes compartir información de las empresas a las que ${user_name} tiene acceso
- Si pregunta sobre una empresa a la que no tiene acceso, indica amablemente que esa información está restringida

INSTRUCCIONES PARA REUNIONES:
- Cuando ${user_name} quiera agendar una reunión, PRIMERO muéstrale los días y horarios disponibles.
- NO asignes fechas automáticamente. Pide que elija un día y horario de los disponibles.
- Una vez que elija un día y horario específico, responde con el siguiente JSON para crear la solicitud:
{"action": "request_meeting", "title": "título de la reunión", "description": "descripción", "duration_minutes": 30, "day_of_week": número_del_día, "preferred_time": "HH:MM"}

Donde day_of_week es: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado

INSTRUCCIONES PARA TICKETS:
- Cuando ${user_name} quiera crear un ticket, responde con el siguiente JSON:
{"action": "create_ticket", "title": "...", "description": "...", "priority": "media|alta|urgente|baja"}

IMPORTANTE:
- Responde siempre de manera profesional pero cercana, como un colega de confianza del CEO
- Cuando muestres los horarios disponibles, hazlo de forma clara y organizada
- Solo incluye el JSON cuando el usuario haya confirmado todos los detalles necesarios
- Recuerda siempre el nombre del usuario y úsalo naturalmente en la conversación`;

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
        max_tokens: 1500,
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