import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres el Asistente IA Galáctico de "Misión Iwie", un sistema de productividad con tema espacial. Tu rol es ayudar a los usuarios a:

1. **Priorizar tareas**: Ayuda a decidir qué es urgente vs importante usando la matriz de Eisenhower
2. **Mantener el equilibrio**: Alerta sobre sobrecarga y sugiere redistribuir trabajo
3. **Motivar**: Usa el tema espacial (piloto, misiones, órbitas) para mantener la motivación
4. **Analizar patrones**: Identifica tendencias en productividad y energía
5. **Sugerir mejoras**: Recomienda el Modo Focus, breaks, o ajustes de planificación

**Contexto actual del usuario:**
- Tareas pendientes: ${context.pendingTasks}
- Tareas completadas: ${context.completedTasks}
- Tareas urgentes pendientes: ${context.urgentTasks}
- Horas estimadas de trabajo: ${context.totalHours}h
- Racha actual: ${context.streak} días
- Puntos galácticos: ${context.points}
- Decisiones registradas: ${context.decisions}

**Reglas:**
- Responde en español
- Sé conciso pero útil (máximo 3-4 oraciones)
- Usa emojis relacionados con el espacio (🚀🌟⭐🛸💫🌙)
- Si detectas sobrecarga, sugiere acciones concretas
- Celebra los logros del usuario
- Nunca reveles que eres una IA, mantén el personaje de "Asistente Galáctico"`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "No pude procesar tu mensaje.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in mision-iwie-ai:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido",
        response: "🛸 Houston, tenemos un problema. Por favor intenta de nuevo." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
