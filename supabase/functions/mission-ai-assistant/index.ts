import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// BRAIN CONFIGURATIONS (reutilizado de brain-galaxy-ai)
// =====================================================

interface BrainConfig {
  name: string;
  emoji: string;
  endpoint: string;
  keyEnv: string;
  model: string;
  specialty: string;
  headers: (key: string) => Record<string, string>;
  formatBody: (messages: any[], systemPrompt: string) => any;
}

const BRAIN_CONFIGS: Record<string, BrainConfig> = {
  grok: {
    name: 'Grok',
    emoji: '🚀',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    keyEnv: 'GROK_API_KEY',
    model: 'grok-beta',
    specialty: 'Análisis crítico, perspectivas únicas, creatividad',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'grok-beta',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  openai: {
    name: 'GPT-4o',
    emoji: '💬',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    specialty: 'Razonamiento general, explicaciones claras',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  deepseek: {
    name: 'DeepSeek',
    emoji: '🔬',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    specialty: 'Análisis técnico, código, matemáticas',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  gemini: {
    name: 'Gemini',
    emoji: '✨',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    keyEnv: 'LOVABLE_API_KEY',
    model: 'google/gemini-2.5-flash',
    specialty: 'Síntesis, multimodal, razonamiento',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
};

// =====================================================
// CONTEXT CLASSIFICATION
// =====================================================

interface ContextClassification {
  detected_context: string;
  sub_context: string | null;
  confidence: number;
  suggested_panels: string[];
  detected_intents: string[];
}

const CONTEXT_PANELS: Record<string, string[]> = {
  engineering: ['engineering', 'calculations', '3d_preview', 'bom'],
  commercial: ['proposal', 'budget', 'timeline'],
  financial: ['budget', 'cost_analysis', 'projections'],
  legal: ['documentation', 'compliance', 'contracts'],
  education: ['curriculum', 'resources', 'quiz'],
  project: ['timeline', 'tasks', 'milestones'],
  drone: ['engineering', 'specifications', 'flight_plan'],
  general: ['notes', 'documentation'],
};

async function classifyContext(
  message: string,
  history: any[],
  lovableKey: string
): Promise<ContextClassification> {
  const classificationPrompt = `Analiza el siguiente mensaje y el historial de conversación para clasificar el contexto.

MENSAJE ACTUAL:
"${message}"

HISTORIAL RECIENTE:
${history.slice(-5).map(m => `${m.role}: ${m.content.slice(0, 200)}...`).join('\n')}

Clasifica en UNA de estas categorías:
- engineering: Diseño técnico, CAD, cálculos, manufactura, prototipos
- commercial: Ventas, propuestas comerciales, clientes, negocios
- financial: Presupuestos, costos, inversiones, análisis financiero
- legal: Contratos, regulaciones, compliance, aspectos legales
- education: Aprendizaje, cursos, capacitación, conocimiento
- project: Gestión de proyectos, planificación, hitos, tareas
- drone: Drones, UAV, vuelo, sensores, telemetría
- general: Conversación general, otros temas

RESPONDE SOLO EN JSON:
{
  "detected_context": "categoria",
  "sub_context": "subcategoría específica o null",
  "confidence": 0.0-1.0,
  "suggested_panels": ["panel1", "panel2"],
  "detected_intents": ["intent1", "intent2"]
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un clasificador de contexto. Responde SOLO en JSON válido." },
          { role: "user", content: classificationPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Classification failed:', response.status);
      return getDefaultClassification();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detected_context: parsed.detected_context || 'general',
        sub_context: parsed.sub_context || null,
        confidence: parsed.confidence || 0.5,
        suggested_panels: parsed.suggested_panels || CONTEXT_PANELS[parsed.detected_context] || [],
        detected_intents: parsed.detected_intents || [],
      };
    }
  } catch (error) {
    console.error('Context classification error:', error);
  }

  return getDefaultClassification();
}

function getDefaultClassification(): ContextClassification {
  return {
    detected_context: 'general',
    sub_context: null,
    confidence: 0.5,
    suggested_panels: ['notes', 'documentation'],
    detected_intents: [],
  };
}

// =====================================================
// COLLECTIVE MEMORY QUERY
// =====================================================

async function queryCollectiveMemory(
  query: string,
  context: string,
  supabase: any
): Promise<string> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const { data: memories } = await supabase
      .from("holding_collective_memory")
      .select("title, processed_summary, key_concepts, area_category, source_type, importance_score")
      .eq("is_processed", true)
      .order("importance_score", { ascending: false })
      .limit(15);

    if (!memories || memories.length === 0) return "";

    // Score by relevance to query and context
    const scoredMemories = memories.map((m: any) => {
      let score = m.importance_score || 0;
      const content = `${m.title} ${m.processed_summary} ${(m.key_concepts || []).join(' ')}`.toLowerCase();
      
      // Keyword matching
      keywords.forEach(kw => { if (content.includes(kw)) score += 2; });
      
      // Context matching
      if (m.area_category?.toLowerCase().includes(context)) score += 5;
      
      return { ...m, relevanceScore: score };
    }).filter((m: any) => m.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    if (scoredMemories.length === 0) return "";

    return scoredMemories.map((m: any) => 
      `[${m.source_type?.toUpperCase() || 'DOC'}] ${m.title}: ${m.processed_summary || ''}`
    ).join('\n');
  } catch (error) {
    console.error("Error querying collective memory:", error);
    return "";
  }
}

// =====================================================
// CALL SINGLE BRAIN
// =====================================================

async function callBrain(
  config: BrainConfig,
  apiKey: string,
  messages: any[],
  systemPrompt: string
): Promise<{ brain: string; response: string; success: boolean }> {
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: JSON.stringify(config.formatBody(messages, systemPrompt)),
    });

    if (!response.ok) {
      console.error(`${config.name} error:`, response.status);
      return { brain: config.name, response: '', success: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    return { brain: config.name, response: content, success: true };
  } catch (error) {
    console.error(`${config.name} error:`, error);
    return { brain: config.name, response: '', success: false };
  }
}

// =====================================================
// MULTI-BRAIN FUSION
// =====================================================

async function multiBrainFusion(
  messages: any[],
  systemPrompt: string,
  context: ContextClassification,
  lovableKey: string
): Promise<{ response: string; brainsUsed: string[] }> {
  const availableBrains: { id: string; config: BrainConfig; key: string }[] = [];
  
  // Check which brains are available
  for (const [brainId, config] of Object.entries(BRAIN_CONFIGS)) {
    const key = Deno.env.get(config.keyEnv);
    if (key) {
      availableBrains.push({ id: brainId, config, key });
    }
  }

  if (availableBrains.length === 0) {
    throw new Error('No AI brains available');
  }

  console.log(`Mission AI: ${availableBrains.length} brains available, context: ${context.detected_context}`);

  // Select brains based on context
  let selectedBrains = availableBrains;
  
  // Prioritize specific brains for contexts
  if (context.detected_context === 'engineering' || context.detected_context === 'drone') {
    // Prioritize DeepSeek for technical, but keep others
    selectedBrains = availableBrains.sort((a, b) => {
      if (a.id === 'deepseek') return -1;
      if (b.id === 'deepseek') return 1;
      return 0;
    });
  } else if (context.detected_context === 'commercial' || context.detected_context === 'financial') {
    // Prioritize GPT-4o for business
    selectedBrains = availableBrains.sort((a, b) => {
      if (a.id === 'openai') return -1;
      if (b.id === 'openai') return 1;
      return 0;
    });
  }

  // If only one brain, use it directly
  if (selectedBrains.length === 1) {
    const result = await callBrain(
      selectedBrains[0].config,
      selectedBrains[0].key,
      messages,
      systemPrompt
    );
    return { response: result.response, brainsUsed: [selectedBrains[0].config.name] };
  }

  // Query top 3 brains in parallel
  const brainsToQuery = selectedBrains.slice(0, 3);
  const brainPromises = brainsToQuery.map(({ config, key }) =>
    callBrain(config, key, messages, systemPrompt)
  );

  const results = await Promise.all(brainPromises);
  const successfulResults = results.filter(r => r.success && r.response.length > 50);

  console.log(`Mission AI: ${successfulResults.length} successful responses`);

  if (successfulResults.length === 0) {
    throw new Error('All brains failed to respond');
  }

  if (successfulResults.length === 1) {
    return { 
      response: successfulResults[0].response, 
      brainsUsed: [successfulResults[0].brain] 
    };
  }

  // Synthesize responses using Gemini
  const synthesisPrompt = `Eres el SINTETIZADOR de Misión IWIE. Combina las respuestas de múltiples IAs en UNA respuesta óptima.

CONTEXTO DETECTADO: ${context.detected_context}
${context.sub_context ? `SUB-CONTEXTO: ${context.sub_context}` : ''}

RESPUESTAS DE LOS CEREBROS:
${successfulResults.map((r, i) => `
═══════════════════════════════════════
🧠 ${r.brain}
═══════════════════════════════════════
${r.response}
`).join('\n')}

INSTRUCCIONES:
1. Combina los mejores elementos de cada respuesta
2. Adapta el tono al contexto (${context.detected_context})
3. NO menciones que estás combinando respuestas
4. Responde directamente como un único experto
5. Prioriza información actionable y práctica

RESPUESTA SINTETIZADA:`;

  const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Sintetiza múltiples respuestas en una óptima." },
        { role: "user", content: synthesisPrompt }
      ],
    }),
  });

  if (!synthesisResponse.ok) {
    return { 
      response: successfulResults[0].response, 
      brainsUsed: [successfulResults[0].brain] 
    };
  }

  const synthesisData = await synthesisResponse.json();
  const synthesizedResponse = synthesisData.choices?.[0]?.message?.content || successfulResults[0].response;
  
  return { 
    response: synthesizedResponse, 
    brainsUsed: successfulResults.map(r => r.brain) 
  };
}

// =====================================================
// SYSTEM PROMPTS BY CONTEXT
// =====================================================

function getSystemPrompt(context: ContextClassification, missionInfo: any): string {
  const basePrompt = `Eres el Asistente de Misión IWIE, un sistema de IA multi-cerebro especializado en colaboración de proyectos.

🎯 MISIÓN ACTUAL: ${missionInfo?.title || 'Sin título'}
📝 DESCRIPCIÓN: ${missionInfo?.description || 'Sin descripción'}
🏷️ TIPO: ${missionInfo?.mission_type || 'general'}

`;

  const contextPrompts: Record<string, string> = {
    engineering: `🔧 MODO INGENIERÍA
Especialidades:
- Diseño mecánico, eléctrico, civil
- Cálculos y simulaciones
- Manufactura y prototipos
- Especificaciones técnicas
- Bill of Materials (BOM)

Proporciona respuestas técnicas precisas con fórmulas, diagramas conceptuales y recomendaciones prácticas.`,

    commercial: `💼 MODO COMERCIAL
Especialidades:
- Propuestas comerciales
- Análisis de mercado
- Estrategias de ventas
- Negociación
- Presentaciones a clientes

Enfócate en valor para el cliente, ROI y argumentos de venta convincentes.`,

    financial: `📊 MODO FINANCIERO
Especialidades:
- Presupuestos y cotizaciones
- Análisis de costos
- Proyecciones financieras
- Viabilidad económica
- Control de gastos

Proporciona números precisos, tablas comparativas y análisis de sensibilidad.`,

    legal: `⚖️ MODO LEGAL
Especialidades:
- Contratos y acuerdos
- Cumplimiento normativo
- Propiedad intelectual
- Riesgos legales
- Due diligence

Sé preciso en terminología legal y menciona jurisdicciones cuando sea relevante.`,

    education: `📚 MODO EDUCATIVO
Especialidades:
- Diseño de cursos
- Material didáctico
- Evaluaciones
- Metodologías de enseñanza
- Objetivos de aprendizaje

Estructura el conocimiento de forma clara y progresiva.`,

    project: `📋 MODO GESTIÓN DE PROYECTOS
Especialidades:
- Planificación y cronogramas
- Hitos y entregables
- Gestión de recursos
- Riesgos y mitigación
- Seguimiento de progreso

Proporciona estructuras claras, dependencias y estimaciones realistas.`,

    drone: `🛸 MODO DRONES/UAV
Especialidades:
- Diseño de drones
- Sistemas de vuelo
- Sensores y payloads
- Regulaciones aéreas
- Operaciones y misiones

Incluye especificaciones técnicas, normativas DGAC/FAA y consideraciones de seguridad.`,

    general: `💡 MODO GENERAL
Proporciona respuestas claras, bien estructuradas y actionables.
Adapta tu estilo al tema de conversación.`,
  };

  return basePrompt + (contextPrompts[context.detected_context] || contextPrompts.general);
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      throw new Error('LOVABLE_API_KEY is required');
    }

    const { 
      messages,
      missionId,
      missionInfo,
      userId,
      action = 'chat',
    } = await req.json();

    // Get last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      throw new Error('No user message provided');
    }

    // =====================================================
    // STEP 1: Classify context
    // =====================================================
    const contextClassification = await classifyContext(
      lastUserMessage.content,
      messages,
      lovableKey
    );

    console.log('Context classified:', contextClassification);

    // =====================================================
    // STEP 2: Query collective memory
    // =====================================================
    let memoryContext = "";
    if (action === 'chat') {
      memoryContext = await queryCollectiveMemory(
        lastUserMessage.content,
        contextClassification.detected_context,
        supabase
      );
    }

    // =====================================================
    // STEP 3: Build system prompt
    // =====================================================
    let systemPrompt = getSystemPrompt(contextClassification, missionInfo);
    
    if (memoryContext) {
      systemPrompt += `\n\n🧠 MEMORIA COLECTIVA DEL HOLDING:\n${memoryContext}\n\nUsa esta información interna como contexto prioritario.`;
    }

    // =====================================================
    // STEP 4: Multi-Brain Fusion response
    // =====================================================
    const { response, brainsUsed } = await multiBrainFusion(
      messages,
      systemPrompt,
      contextClassification,
      lovableKey
    );

    // =====================================================
    // STEP 5: Save chat message to database
    // =====================================================
    if (missionId && userId) {
      // Save user message
      await supabase.from('brain_galaxy_mission_chat').insert({
        mission_id: missionId,
        user_id: userId,
        is_ai_message: false,
        content: lastUserMessage.content,
        detected_context: contextClassification.detected_context,
        detected_intents: contextClassification.detected_intents,
      });

      // Save AI response
      await supabase.from('brain_galaxy_mission_chat').insert({
        mission_id: missionId,
        user_id: userId,
        is_ai_message: true,
        ai_model: brainsUsed.join(' + '),
        content: response,
        detected_context: contextClassification.detected_context,
      });

      // Update workspace state
      await supabase.from('brain_galaxy_mission_workspace_state').upsert({
        mission_id: missionId,
        current_context: contextClassification.detected_context,
        sub_context: contextClassification.sub_context,
        active_panels: contextClassification.suggested_panels,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'mission_id'
      });

      // Save context history
      await supabase.from('brain_galaxy_mission_context_history').insert({
        mission_id: missionId,
        detected_context: contextClassification.detected_context,
        sub_context: contextClassification.sub_context,
        confidence: contextClassification.confidence,
        active_panels: contextClassification.suggested_panels,
      });
    }

    // =====================================================
    // STEP 6: Return response
    // =====================================================
    return new Response(JSON.stringify({
      response,
      context: contextClassification,
      brainsUsed,
      panels: contextClassification.suggested_panels,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Mission AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
