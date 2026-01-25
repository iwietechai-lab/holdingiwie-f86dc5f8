import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  'brain-1': {
    name: 'Grok',
    emoji: '🚀',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    keyEnv: 'GROK_API_KEY',
    model: 'grok-beta',
    specialty: 'Análisis crítico, humor inteligente, perspectivas únicas',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'grok-beta',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  'brain-2': {
    name: 'ChatGPT',
    emoji: '💬',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    specialty: 'Razonamiento general, creatividad, explicaciones claras',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  'brain-3': {
    name: 'DeepSeek',
    emoji: '🔬',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    specialty: 'Análisis técnico profundo, código, matemáticas',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  },
  'brain-4': {
    name: 'Gemini',
    emoji: '✨',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    keyEnv: 'LOVABLE_API_KEY',
    model: 'google/gemini-2.5-flash',
    specialty: 'Multimodal, razonamiento, síntesis de información',
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

// Query collective memory
async function queryCollectiveMemory(query: string, supabase: any): Promise<string> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const { data: memories } = await supabase
      .from("holding_collective_memory")
      .select("title, processed_summary, key_concepts, area_category, source_type, importance_score")
      .eq("is_processed", true)
      .order("importance_score", { ascending: false })
      .limit(10);

    if (!memories || memories.length === 0) return "";

    const scoredMemories = memories.map((m: any) => {
      let score = m.importance_score || 0;
      const content = `${m.title} ${m.processed_summary} ${(m.key_concepts || []).join(' ')}`.toLowerCase();
      keywords.forEach(kw => { if (content.includes(kw)) score += 2; });
      return { ...m, relevanceScore: score };
    }).filter((m: any) => m.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    if (scoredMemories.length === 0) return "";

    return scoredMemories.map((m: any) => 
      `[${m.source_type.toUpperCase()}] ${m.title}: ${m.processed_summary || ''}`
    ).join('\n');
  } catch (error) {
    console.error("Error querying collective memory:", error);
    return "";
  }
}

// Call a single brain and get response
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

// Multi-Brain Fusion: Query all available brains and synthesize
async function multiBrainFusion(
  messages: any[],
  systemPrompt: string,
  lovableKey: string
): Promise<string> {
  const availableBrains: { config: BrainConfig; key: string }[] = [];
  
  // Check which brains are available
  for (const [brainId, config] of Object.entries(BRAIN_CONFIGS)) {
    const key = Deno.env.get(config.keyEnv);
    if (key) {
      availableBrains.push({ config, key });
    }
  }

  if (availableBrains.length === 0) {
    throw new Error('No AI brains available');
  }

  console.log(`Multi-Brain Fusion: ${availableBrains.length} brains available`);

  // If only one brain, use it directly
  if (availableBrains.length === 1) {
    const result = await callBrain(
      availableBrains[0].config,
      availableBrains[0].key,
      messages,
      systemPrompt
    );
    return result.response;
  }

  // Query all brains in parallel
  const brainPromises = availableBrains.map(({ config, key }) =>
    callBrain(config, key, messages, systemPrompt)
  );

  const results = await Promise.all(brainPromises);
  const successfulResults = results.filter(r => r.success && r.response.length > 50);

  console.log(`Multi-Brain Fusion: ${successfulResults.length} successful responses`);

  if (successfulResults.length === 0) {
    throw new Error('All brains failed to respond');
  }

  if (successfulResults.length === 1) {
    return successfulResults[0].response;
  }

  // Synthesize responses using Gemini
  const synthesisPrompt = `Eres el SINTETIZADOR MAESTRO de Brain Galaxy. Tu trabajo es analizar las respuestas de múltiples IAs expertas y crear LA MEJOR RESPUESTA POSIBLE combinando lo mejor de cada una.

RESPUESTAS DE LOS CEREBROS:

${successfulResults.map((r, i) => `
═══════════════════════════════════════
🧠 CEREBRO ${i + 1}: ${r.brain}
═══════════════════════════════════════
${r.response}
`).join('\n')}

═══════════════════════════════════════
📋 TU TAREA:
═══════════════════════════════════════

1. ANALIZA cada respuesta identificando:
   - Puntos únicos y valiosos de cada cerebro
   - Información complementaria que se puede combinar
   - La mejor estructura y claridad de explicación
   - Datos técnicos o ejemplos específicos útiles

2. SINTETIZA creando UNA respuesta que:
   - Combine los mejores elementos de todas las respuestas
   - Sea más completa que cualquier respuesta individual
   - Mantenga coherencia y flujo natural
   - Elimine redundancias
   - Priorice precisión y utilidad

3. FORMATO de tu respuesta:
   - NO menciones que estás combinando respuestas
   - Responde directamente como si fueras un único experto
   - Usa el mejor formato/estructura de las respuestas originales
   - Incluye ejemplos concretos si los hay

Genera la RESPUESTA SINTETIZADA ÓPTIMA:`;

  const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Eres un sintetizador experto que combina múltiples perspectivas en una respuesta óptima." },
        { role: "user", content: synthesisPrompt }
      ],
    }),
  });

  if (!synthesisResponse.ok) {
    // If synthesis fails, return the best individual response
    return successfulResults[0].response;
  }

  const synthesisData = await synthesisResponse.json();
  return synthesisData.choices?.[0]?.message?.content || successfulResults[0].response;
}

// Stream a single brain response
async function streamBrainResponse(
  config: BrainConfig,
  apiKey: string,
  messages: any[],
  systemPrompt: string
): Promise<Response> {
  const body = config.formatBody(messages, systemPrompt);
  body.stream = true;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(body),
  });

  return response;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  default: `Eres Brain Galaxy, el sistema de inteligencia híbrida del IWIE Holding.

🧠 CAPACIDADES MULTI-CEREBRO:
Combinas el poder de múltiples IAs (Grok, ChatGPT, DeepSeek, Gemini) para dar la mejor respuesta posible.

📚 FUENTES DE CONOCIMIENTO:
- Memoria Colectiva: Documentos, decisiones y chats del holding
- Conocimiento Externo: Información actualizada de múltiples modelos de IA

Características:
- Responde en español de manera clara y estructurada
- Proporciona respuestas completas y bien fundamentadas
- Ofrece múltiples perspectivas cuando sea relevante
- Incluye ejemplos prácticos y aplicables

Áreas de expertise:
- Comercial, Finanzas, Ingenierías, Tributario-Contable
- Legal, Corporativo, Agrícola, Drones
- Inteligencia Artificial, Proceso de Datos`,

  engineering: `Eres Brain 4, el cerebro de ingeniería del IWIE Holding con acceso a múltiples IAs especializadas.

🔧 MODO INGENIERÍA MULTI-CEREBRO:
Combinas análisis técnico de DeepSeek, creatividad de ChatGPT, perspectivas de Grok y síntesis de Gemini.

Especialidades:
- Diseño CAD/CAM y modelado 3D
- Ingeniería mecánica, civil, eléctrica
- Desarrollo de prototipos y manufactura
- Drones y sistemas UAV
- Automatización e IoT

Proporciona:
1. Respuestas técnicas precisas con fórmulas cuando aplique
2. Múltiples enfoques de solución
3. Herramientas y software recomendados
4. Mejores prácticas y estándares`,

  curriculum: `Eres un experto en diseño instruccional del Brain Galaxy con capacidad multi-cerebro.

Formato JSON para cursos:
{
  "title": "Título",
  "description": "Descripción",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "difficulty": "beginner|intermediate|advanced|expert",
  "estimated_hours": 10,
  "modules": [{"title": "Módulo 1", "description": "Desc", "estimated_minutes": 60, "topics": ["Tema 1"]}]
}`,

  quiz: `Eres un experto en evaluación educativa del Brain Galaxy.

Formato JSON para cuestionarios:
{
  "title": "Título",
  "questions": [{"id": "q1", "question": "Pregunta", "type": "multiple_choice", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "Explicación", "points": 10}],
  "passing_score": 70,
  "time_limit_minutes": 15
}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const { 
      messages, 
      brainModel = 'brain-4',
      action = 'chat',
      context = {},
      mode = 'fusion', // 'fusion' (multi-brain) or 'single' or 'stream'
    } = await req.json();

    // Get last user message for context
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let hybridContext = "";
    
    if (lastUserMessage && action === 'chat') {
      const memoryContext = await queryCollectiveMemory(lastUserMessage.content, supabase);
      
      if (memoryContext) {
        hybridContext = `\n\n🧠 MEMORIA COLECTIVA DEL HOLDING:\n${memoryContext}\n\nUsa esta información interna como contexto prioritario.\n`;
      }
    }

    const systemPrompt = getSystemPrompt(action, context, brainModel) + hybridContext;

    // FUSION MODE: Query all brains and synthesize
    if (mode === 'fusion' && action === 'chat') {
      console.log("Using Multi-Brain Fusion mode");
      
      if (!lovableKey) {
        throw new Error('LOVABLE_API_KEY required for fusion mode');
      }

      const fusionResponse = await multiBrainFusion(messages, systemPrompt, lovableKey);
      
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: fusionResponse
          }
        }],
        mode: 'fusion'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STREAM MODE: Stream from a single brain
    if (mode === 'stream') {
      const config = BRAIN_CONFIGS[brainModel];
      const apiKey = Deno.env.get(config?.keyEnv || 'LOVABLE_API_KEY');
      
      if (!apiKey) {
        if (!lovableKey) throw new Error('No API key available');
        const fallbackConfig = BRAIN_CONFIGS['brain-4'];
        const response = await streamBrainResponse(fallbackConfig, lovableKey, messages, systemPrompt);
        
        if (!response.ok) {
          throw new Error(`Stream error: ${response.status}`);
        }
        
        return new Response(response.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }

      const response = await streamBrainResponse(config, apiKey, messages, systemPrompt);
      
      if (!response.ok) {
        // Fallback to Lovable AI
        if (lovableKey) {
          const fallbackConfig = BRAIN_CONFIGS['brain-4'];
          const fallbackResponse = await streamBrainResponse(fallbackConfig, lovableKey, messages, systemPrompt);
          if (fallbackResponse.ok) {
            return new Response(fallbackResponse.body, {
              headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
            });
          }
        }
        throw new Error(`${config.name} stream error: ${response.status}`);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // SINGLE MODE: Use specific brain without fusion
    const config = BRAIN_CONFIGS[brainModel];
    const apiKey = Deno.env.get(config?.keyEnv || 'LOVABLE_API_KEY');
    
    if (!apiKey && !lovableKey) {
      throw new Error('No API key available');
    }

    const result = await callBrain(
      config || BRAIN_CONFIGS['brain-4'],
      apiKey || lovableKey!,
      messages,
      systemPrompt
    );

    if (!result.success) {
      // Fallback
      if (lovableKey && config.keyEnv !== 'LOVABLE_API_KEY') {
        const fallbackResult = await callBrain(BRAIN_CONFIGS['brain-4'], lovableKey, messages, systemPrompt);
        if (fallbackResult.success) {
          return new Response(JSON.stringify({
            choices: [{ message: { role: 'assistant', content: fallbackResult.response } }],
            mode: 'single',
            brain: 'Gemini (fallback)'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      throw new Error(`${config.name} failed`);
    }

    return new Response(JSON.stringify({
      choices: [{ message: { role: 'assistant', content: result.response } }],
      mode: 'single',
      brain: config.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Brain Galaxy AI error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getSystemPrompt(action: string, context: any, brainModel?: string): string {
  if (action === 'generate_curriculum') return SYSTEM_PROMPTS.curriculum;
  if (action === 'generate_quiz') return SYSTEM_PROMPTS.quiz;
  if (brainModel === 'brain-4') return SYSTEM_PROMPTS.engineering;
  
  let prompt = SYSTEM_PROMPTS.default;
  if (context.area) prompt += `\n\nÁrea actual: ${context.area}`;
  if (context.course) prompt += `\nCurso: ${context.course}`;
  
  return prompt;
}
