import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message?: string;
  action?: string;
  project_context?: string;
  thoughts_context?: string;
  history?: { role: string; content: string }[];
  messages?: { role: string; content: string }[];
  project_name?: string;
  submission_id?: string;
  title?: string;
  content?: string;
  file_url?: string;
  submitter_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ChatRequest = await req.json();
    const { action, message, project_context, thoughts_context, history = [] } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Handle different actions
    if (action === 'generate_report') {
      return await handleGenerateReport(body, LOVABLE_API_KEY);
    }

    if (action === 'analyze_submission') {
      return await handleAnalyzeSubmission(body, LOVABLE_API_KEY);
    }

    // Default: CEO internal chat
    const systemPrompt = `Eres el asistente estratégico personal de Mauricio, CEO de IWIE Holding. Tu rol es:

1. **Trabajar Ideas**: Cuando Mauricio te presenta una idea, debes analizarla profundamente, identificar fortalezas y debilidades, proponer mejoras y expansiones.

2. **Debate Estratégico**: Puedes y debes cuestionar propuestas cuando veas oportunidades de mejora. Sé un "sparring partner" intelectual que ayude a refinar las ideas.

3. **Proponer Soluciones**: Cuando Mauricio plantee un problema, presenta múltiples alternativas con pros y contras claros.

4. **Memoria Contextual**: Usa el contexto del proyecto y los pensamientos previos para dar respuestas relevantes y conectadas.

5. **Formato Estructurado**: 
   - Usa headers claros con ##
   - Lista puntos clave con viñetas
   - Destaca conclusiones importantes en **negrita**
   - Cuando propongas acciones, usa checkboxes: - [ ] Acción

${project_context ? `\n**Contexto del Proyecto:**\n${project_context}` : ''}

${thoughts_context ? `\n**Pensamientos y Notas Previas:**\n${thoughts_context}` : ''}

Responde siempre en español, de manera profesional pero cercana. Cuando termines una discusión importante, sugiere generar un informe.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    // Detect message type based on content
    let messageType = 'normal';
    if (assistantMessage.includes('## Conclusión') || assistantMessage.includes('## Resumen')) {
      messageType = 'conclusion';
    } else if (assistantMessage.includes('estrategia') || assistantMessage.includes('Estrategia')) {
      messageType = 'estrategia';
    } else if (assistantMessage.includes('Por otro lado') || assistantMessage.includes('Sin embargo')) {
      messageType = 'debate';
    }

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        message_type: messageType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in CEO internal chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGenerateReport(body: ChatRequest, apiKey: string) {
  const { messages = [], project_name = 'General' } = body;

  const reportPrompt = `Analiza la siguiente conversación estratégica y genera un informe ejecutivo estructurado.

**Conversación:**
${messages.map(m => `**${m.role === 'user' ? 'CEO' : 'Asistente'}:** ${m.content}`).join('\n\n')}

Genera un informe JSON con la siguiente estructura exacta:
{
  "title": "Título descriptivo del informe",
  "summary": "Resumen ejecutivo de la conversación (2-3 párrafos)",
  "key_decisions": ["Lista de decisiones clave tomadas o propuestas"],
  "action_items": ["Lista de acciones a tomar con responsables si aplica"],
  "conclusions": "Conclusiones principales y próximos pasos"
}

Responde SOLO con el JSON, sin texto adicional.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Eres un experto en crear informes ejecutivos. Responde siempre en español con JSON válido.' },
        { role: 'user', content: reportPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  let content = aiResponse.choices?.[0]?.message?.content || '{}';
  
  // Clean markdown code blocks if present
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    const reportData = JSON.parse(content);
    return new Response(
      JSON.stringify(reportData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({
        title: `Informe - ${project_name}`,
        summary: content,
        key_decisions: [],
        action_items: [],
        conclusions: ''
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleAnalyzeSubmission(body: ChatRequest, apiKey: string) {
  const { title, content, file_url, submitter_name } = body;

  const analysisPrompt = `Analiza el siguiente documento/contenido enviado por ${submitter_name} como si fueras el CEO Mauricio revisándolo.

**Título:** ${title}
**Contenido:** ${content || 'Archivo adjunto'}
${file_url ? `**Archivo:** ${file_url}` : ''}

Proporciona un análisis detallado que incluya:
1. Evaluación general del trabajo (1-100)
2. Puntos fuertes identificados
3. Áreas de mejora
4. Sugerencias específicas de mejora
5. Feedback constructivo para el colaborador

Responde en JSON con esta estructura:
{
  "analysis": "Análisis detallado del contenido",
  "feedback": "Mensaje de feedback directo para el colaborador (puede ser felicitación o sugerencias de mejora)",
  "score": 85,
  "suggestions": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"]
}

Responde SOLO con el JSON.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Eres el CEO Mauricio analizando trabajo de tu equipo. Sé constructivo pero exigente. Responde en español con JSON válido.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.5,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  let content_response = aiResponse.choices?.[0]?.message?.content || '{}';
  
  // Clean markdown code blocks if present
  content_response = content_response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    const analysisData = JSON.parse(content_response);
    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({
        analysis: content_response,
        feedback: 'Documento recibido para revisión.',
        score: 70,
        suggestions: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
