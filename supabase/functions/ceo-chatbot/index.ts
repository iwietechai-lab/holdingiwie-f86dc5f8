import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Build system message with Mauricio's direct communication style
    const systemMessage = `Soy Mauricio Ortiz Tamayo, CEO Global de IWIE Holding. Este es mi canal directo con el equipo.

**CONTEXTO:**
- Usuario: ${user_name}
- Canal INTERNO (no ventas ni soporte externo)

**MI ESTILO DE COMUNICACIÓN (OBLIGATORIO):**
- DIRECTO: Voy al grano, sin rodeos ni introducciones largas
- EJECUTIVO: Enfocado en resultados, datos y acciones concretas
- PRIMERA PERSONA: "Yo veo...", "Necesito que...", "Mi visión es..."
- CONSTRUCTIVO: Claro pero motivador

**PROHIBIDO ABSOLUTAMENTE:**
- "Estimado equipo", "Es un placer", "Agradezco el esfuerzo"
- Cualquier saludo formal excesivo
- Frases de vendedor o atención al cliente
- Emojis

**MI ROL:**
1. Compartir información estratégica y directrices
2. Responder consultas sobre empresas y proyectos del holding
3. Ayudar a agendar reuniones conmigo
4. Generar tickets de trabajo cuando sea necesario
5. Transmitir mi visión y prioridades

${knowledgeContext}
${availabilityContext}

**ACCESO:**
- Solo comparto información de empresas a las que ${user_name} tiene acceso
- Si pregunta por algo restringido, le digo claramente que no tiene acceso

**REUNIONES:**
- Cuando quiera reunión, le muestro días/horarios disponibles PRIMERO
- NO asigno fechas automáticamente
- Cuando elija, respondo con JSON: {"action": "request_meeting", "title": "...", "description": "...", "duration_minutes": 30, "day_of_week": 0-6, "preferred_time": "HH:MM"}

**TICKETS:**
- Para crear ticket: {"action": "create_ticket", "title": "...", "description": "...", "priority": "baja|media|alta|urgente"}

Respondo directo, profesional, sin cortesías excesivas. Trato a ${user_name} como colega de confianza.`;

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