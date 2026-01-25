import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrainConfig {
  name: string;
  endpoint: string;
  keyEnv: string;
  model: string;
  headers: (key: string) => Record<string, string>;
  formatBody: (messages: any[], systemPrompt: string) => any;
}

const BRAIN_CONFIGS: Record<string, BrainConfig> = {
  'brain-1': {
    name: 'Grok',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    keyEnv: 'GROK_API_KEY',
    model: 'grok-beta',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'grok-beta',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  },
  'brain-2': {
    name: 'ChatGPT',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    model: 'gpt-4o',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  },
  'brain-3': {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  },
  'brain-4': {
    name: 'Gemini',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    keyEnv: 'LOVABLE_API_KEY',
    model: 'google/gemini-2.5-flash',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    formatBody: (messages, systemPrompt) => ({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  },
};

// Function to query collective memory (internal knowledge)
async function queryCollectiveMemory(query: string, supabase: any): Promise<string> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const { data: memories } = await supabase
      .from("holding_collective_memory")
      .select("title, processed_summary, key_concepts, area_category, source_type, importance_score")
      .eq("is_processed", true)
      .order("importance_score", { ascending: false })
      .limit(10);

    if (!memories || memories.length === 0) {
      return "";
    }

    // Score and filter relevant memories
    const scoredMemories = memories.map((m: any) => {
      let score = m.importance_score || 0;
      const content = `${m.title} ${m.processed_summary} ${(m.key_concepts || []).join(' ')}`.toLowerCase();
      keywords.forEach(kw => {
        if (content.includes(kw)) score += 2;
      });
      return { ...m, relevanceScore: score };
    }).filter((m: any) => m.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    if (scoredMemories.length === 0) return "";

    const memoryContext = scoredMemories.map((m: any) => 
      `[${m.source_type.toUpperCase()}${m.area_category ? ` - ${m.area_category}` : ''}] ${m.title}: ${m.processed_summary || ''}`
    ).join('\n\n');

    return memoryContext;
  } catch (error) {
    console.error("Error querying collective memory:", error);
    return "";
  }
}

// Function to perform web search using Lovable AI for real-time information
async function performWebSearch(query: string, lovableKey: string): Promise<string> {
  try {
    console.log("Performing hybrid web search for:", query);
    
    const searchPrompt = `Actúa como un motor de búsqueda experto. Para la siguiente consulta, proporciona información actualizada, precisa y relevante basada en tu conocimiento más reciente.

Consulta: "${query}"

Responde con información factual, incluyendo:
- Datos y estadísticas actuales si aplica
- Tendencias recientes del mercado o industria
- Mejores prácticas actualizadas
- Tecnologías o metodologías recientes

Formato tu respuesta como puntos clave concisos. Si no tienes información actualizada sobre algo específico, indícalo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un asistente de investigación experto que proporciona información actualizada y precisa." },
          { role: "user", content: searchPrompt }
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("Web search failed:", response.status);
      return "";
    }

    const data = await response.json();
    const searchResult = data.choices?.[0]?.message?.content || "";
    
    return searchResult;
  } catch (error) {
    console.error("Error in web search:", error);
    return "";
  }
}

// Determine if query needs web search (external info)
function needsWebSearch(query: string): boolean {
  const webIndicators = [
    'actualidad', 'actual', 'reciente', 'últim', 'nuevo', 'tendencia',
    'mercado', 'precio', 'costo', 'noticia', 'hoy', '2024', '2025', '2026',
    'tecnología', 'herramienta', 'software', 'app', 'aplicación',
    'competencia', 'industria', 'sector', 'estadística', 'dato',
    'regulación', 'ley', 'normativa', 'chile', 'mundial', 'global',
    'innovación', 'startup', 'inversión', 'financiamiento',
    'cómo', 'qué es', 'cuál es', 'dónde', 'mejor', 'recomendación'
  ];
  
  const lowerQuery = query.toLowerCase();
  return webIndicators.some(indicator => lowerQuery.includes(indicator));
}

const SYSTEM_PROMPTS: Record<string, string> = {
  default: `Eres Brain Galaxy, el asistente de aprendizaje híbrido del IWIE Holding. Tu misión es ayudar a los usuarios combinando:

🧠 MEMORIA COLECTIVA: Conocimiento interno del holding (documentos, decisiones, chats históricos)
🌐 CONOCIMIENTO EXTERNO: Información actualizada del mundo exterior

Características:
- Responde en español de manera clara y estructurada
- Cuando tengas información de la memoria colectiva, PRIORÍZALA pero complementa con conocimiento externo
- Indica claramente cuando la información viene de fuentes internas vs externas
- Ofrece explicaciones paso a paso cuando sea necesario
- Sugiere recursos adicionales cuando sea relevante
- Fomenta el aprendizaje continuo y la colaboración

Áreas de expertise:
- Comercial, Finanzas, Ingenierías, Tributario-Contable
- Legal, Corporativo, Agrícola, Drones
- Inteligencia Artificial, Proceso de Datos`,

  engineering: `Eres Brain 4, el cerebro especializado en ingeniería, modelamiento 3D y prototipado del IWIE Holding.

Sistema Híbrido:
🧠 Usas la memoria colectiva del holding para proyectos internos y decisiones previas
🌐 Complementas con información técnica actualizada del exterior

Especialidades:
- Diseño CAD/CAM y modelado 3D
- Ingeniería mecánica, civil, eléctrica
- Desarrollo de prototipos y manufactura
- Análisis estructural y simulaciones
- Impresión 3D y fabricación digital
- Drones y sistemas UAV
- Automatización e IoT

Cuando el usuario pregunte sobre temas de ingeniería:
1. Busca primero en la memoria colectiva proyectos similares
2. Proporciona respuestas técnicas precisas
3. Incluye fórmulas y cálculos cuando sea necesario
4. Sugiere herramientas y software relevantes (con info actualizada)
5. Ofrece consideraciones de diseño y mejores prácticas
6. Menciona estándares y normativas aplicables`,

  curriculum: `Eres un experto en diseño instruccional del Brain Galaxy. Tu tarea es crear mallas curriculares estructuradas.

Para cada curso debes generar:
1. Objetivos de aprendizaje claros y medibles
2. Módulos organizados lógicamente
3. Tiempo estimado por módulo
4. Recursos sugeridos
5. Evaluaciones para cada módulo

Formato de respuesta en JSON:
{
  "title": "Título del curso",
  "description": "Descripción",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "difficulty": "beginner|intermediate|advanced|expert",
  "estimated_hours": 10,
  "modules": [
    {
      "title": "Módulo 1",
      "description": "Descripción",
      "estimated_minutes": 60,
      "topics": ["Tema 1", "Tema 2"]
    }
  ]
}`,

  quiz: `Eres un experto en evaluación educativa del Brain Galaxy. Tu tarea es crear cuestionarios efectivos.

Para cada cuestionario genera preguntas variadas:
- Opción múltiple (4 opciones)
- Verdadero/Falso
- Respuesta corta

Formato JSON:
{
  "title": "Título del cuestionario",
  "questions": [
    {
      "id": "q1",
      "question": "Pregunta",
      "type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Explicación",
      "points": 10
    }
  ],
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
      enableHybridSearch = true, // New flag for hybrid mode
    } = await req.json();

    const config = BRAIN_CONFIGS[brainModel];
    if (!config) {
      throw new Error(`Invalid brain model: ${brainModel}`);
    }

    // Get last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let hybridContext = "";
    
    if (lastUserMessage && action === 'chat') {
      const userQuery = lastUserMessage.content;
      
      // 1. Query collective memory (internal knowledge)
      const memoryContext = await queryCollectiveMemory(userQuery, supabase);
      
      // 2. Perform web search if needed (external knowledge)
      let webContext = "";
      if (enableHybridSearch && lovableKey && needsWebSearch(userQuery)) {
        webContext = await performWebSearch(userQuery, lovableKey);
      }
      
      // 3. Build hybrid context
      if (memoryContext || webContext) {
        hybridContext = "\n\n═══════════════════════════════════════\n";
        hybridContext += "📚 CONTEXTO HÍBRIDO BRAIN GALAXY\n";
        hybridContext += "═══════════════════════════════════════\n";
        
        if (memoryContext) {
          hybridContext += "\n🧠 MEMORIA COLECTIVA DEL HOLDING:\n";
          hybridContext += "─────────────────────────────────\n";
          hybridContext += memoryContext;
          hybridContext += "\n";
        }
        
        if (webContext) {
          hybridContext += "\n🌐 CONOCIMIENTO EXTERNO ACTUALIZADO:\n";
          hybridContext += "─────────────────────────────────\n";
          hybridContext += webContext;
          hybridContext += "\n";
        }
        
        hybridContext += "\n═══════════════════════════════════════\n";
        hybridContext += "INSTRUCCIÓN: Combina ambas fuentes de conocimiento para dar la mejor respuesta.\n";
        hybridContext += "Prioriza la memoria colectiva para temas internos del holding.\n";
        hybridContext += "Usa el conocimiento externo para complementar con información actualizada.\n";
        hybridContext += "═══════════════════════════════════════\n";
      }
    }

    const apiKey = Deno.env.get(config.keyEnv);
    if (!apiKey) {
      console.log(`${config.keyEnv} not found, falling back to Lovable AI`);
      if (!lovableKey) {
        throw new Error('No AI API key available');
      }
      
      const fallbackConfig = BRAIN_CONFIGS['brain-4'];
      const systemPrompt = getSystemPrompt(action, context) + hybridContext;
      
      const response = await fetch(fallbackConfig.endpoint, {
        method: 'POST',
        headers: fallbackConfig.headers(lovableKey),
        body: JSON.stringify(fallbackConfig.formatBody(messages, systemPrompt)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const systemPrompt = getSystemPrompt(action, context, brainModel) + hybridContext;

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: JSON.stringify(config.formatBody(messages, systemPrompt)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${config.name} error:`, response.status, errorText);
      
      // Fallback to Lovable AI
      if (lovableKey) {
        console.log('Falling back to Lovable AI');
        const fallbackConfig = BRAIN_CONFIGS['brain-4'];
        const fallbackResponse = await fetch(fallbackConfig.endpoint, {
          method: 'POST',
          headers: fallbackConfig.headers(lovableKey),
          body: JSON.stringify(fallbackConfig.formatBody(messages, systemPrompt)),
        });

        if (fallbackResponse.ok) {
          return new Response(fallbackResponse.body, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
          });
        }
      }

      throw new Error(`${config.name} error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
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
  if (action === 'generate_curriculum') {
    return SYSTEM_PROMPTS.curriculum;
  }
  if (action === 'generate_quiz') {
    return SYSTEM_PROMPTS.quiz;
  }
  if (brainModel === 'brain-4') {
    return SYSTEM_PROMPTS.engineering;
  }
  
  let prompt = SYSTEM_PROMPTS.default;
  
  if (context.area) {
    prompt += `\n\nContexto actual: El usuario está estudiando en el área de ${context.area}.`;
  }
  if (context.course) {
    prompt += `\n\nCurso actual: ${context.course}`;
  }
  
  return prompt;
}
