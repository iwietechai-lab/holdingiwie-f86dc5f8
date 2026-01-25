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

// Function to query collective memory
async function queryCollectiveMemory(query: string, supabase: any): Promise<string> {
  try {
    // Simple text search on processed memory
    const { data: memories } = await supabase
      .from("holding_collective_memory")
      .select("title, processed_summary, key_concepts, area_category, source_type")
      .eq("is_processed", true)
      .order("importance_score", { ascending: false })
      .limit(5);

    if (!memories || memories.length === 0) {
      return "";
    }

    // Format memory context
    const memoryContext = memories.map((m: any) => 
      `[${m.source_type.toUpperCase()}${m.area_category ? ` - ${m.area_category}` : ''}] ${m.title}: ${m.processed_summary || ''} (Conceptos: ${(m.key_concepts || []).join(', ')})`
    ).join('\n\n');

    return `\n\n--- MEMORIA COLECTIVA DEL HOLDING ---\nEl siguiente conocimiento ha sido recopilado de documentos, chats y decisiones del holding:\n\n${memoryContext}\n\n--- FIN MEMORIA COLECTIVA ---\n`;
  } catch (error) {
    console.error("Error querying collective memory:", error);
    return "";
  }
}

const SYSTEM_PROMPTS: Record<string, string> = {
  default: `Eres Brain Galaxy, el asistente de aprendizaje del IWIE Holding. Tu misión es ayudar a los usuarios a aprender, crear cursos, resolver dudas y desarrollar conocimiento en diversas áreas.

Características:
- Responde en español de manera clara y estructurada
- Ofrece explicaciones paso a paso cuando sea necesario
- Sugiere recursos adicionales cuando sea relevante
- Puedes ayudar a crear mallas curriculares y cuestionarios
- Fomenta el aprendizaje continuo y la colaboración

Áreas de expertise:
- Comercial, Finanzas, Ingenierías, Tributario-Contable
- Legal, Corporativo, Agrícola, Drones
- Inteligencia Artificial, Proceso de Datos`,

  engineering: `Eres Brain 4, el cerebro especializado en ingeniería, modelamiento 3D y prototipado del IWIE Holding.

Especialidades:
- Diseño CAD/CAM y modelado 3D
- Ingeniería mecánica, civil, eléctrica
- Desarrollo de prototipos y manufactura
- Análisis estructural y simulaciones
- Impresión 3D y fabricación digital
- Drones y sistemas UAV
- Automatización e IoT

Cuando el usuario pregunte sobre temas de ingeniería:
1. Proporciona respuestas técnicas precisas
2. Incluye fórmulas y cálculos cuando sea necesario
3. Sugiere herramientas y software relevantes
4. Ofrece consideraciones de diseño y mejores prácticas
5. Menciona estándares y normativas aplicables`,

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

    const { 
      messages, 
      brainModel = 'brain-4',
      action = 'chat',
      context = {},
    } = await req.json();

    const config = BRAIN_CONFIGS[brainModel];
    if (!config) {
      throw new Error(`Invalid brain model: ${brainModel}`);
    }

    // Get last user message to query collective memory
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    let collectiveMemoryContext = "";
    
    if (lastUserMessage && action === 'chat') {
      collectiveMemoryContext = await queryCollectiveMemory(lastUserMessage.content, supabase);
    }

    const apiKey = Deno.env.get(config.keyEnv);
    if (!apiKey) {
      // Fallback to Brain 4 (Lovable AI) if specific key not available
      console.log(`${config.keyEnv} not found, falling back to Lovable AI`);
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableKey) {
        throw new Error('No AI API key available');
      }
      
      const fallbackConfig = BRAIN_CONFIGS['brain-4'];
      const systemPrompt = getSystemPrompt(action, context) + collectiveMemoryContext;
      
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

    const systemPrompt = getSystemPrompt(action, context, brainModel) + collectiveMemoryContext;

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: config.headers(apiKey),
      body: JSON.stringify(config.formatBody(messages, systemPrompt)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${config.name} error:`, response.status, errorText);
      
      // Fallback to Lovable AI
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
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
