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
  file_type?: string;
  submitter_name?: string;
  document_context?: {
    title?: string;
    content?: string;
    analysis?: string;
    feedback?: string;
    suggestions?: string[];
    score?: number;
  };
}

// Function to parse CSV content
function parseCSV(text: string): string {
  const lines = text.split('\n');
  let result = '';
  
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(/[,;|\t]/);
    if (cells.length > 0 && cells.some(c => c.trim())) {
      if (i === 0) {
        result += `| ${cells.map(c => c.trim()).join(' | ')} |\n`;
        result += `|${cells.map(() => '---').join('|')}|\n`;
      } else {
        result += `| ${cells.map(c => c.trim()).join(' | ')} |\n`;
      }
    }
  }
  
  return result;
}

// Function to download and parse file content
async function extractFileContent(fileUrl: string, fileType?: string): Promise<string> {
  try {
    console.log(`Downloading file from: ${fileUrl}`);
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      console.error(`Failed to download file: ${response.status}`);
      return `[Error al descargar archivo: ${response.status}]`;
    }

    const contentType = fileType || response.headers.get('content-type') || '';
    console.log(`File content type: ${contentType}`);

    // Handle Excel files (.xlsx, .xls) - Use AI to process binary
    if (contentType.includes('spreadsheet') || 
        contentType.includes('excel') || 
        fileUrl.endsWith('.xlsx') || 
        fileUrl.endsWith('.xls') ||
        contentType.includes('vnd.openxmlformats-officedocument') ||
        contentType.includes('vnd.ms-excel')) {
      
      console.log('Excel file detected - extracting raw data...');
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Try to extract text content from Excel (simplified approach)
      // Excel files contain XML internally, try to extract readable parts
      let textContent = '';
      
      // Convert bytes to string where possible (looking for readable content)
      try {
        // Create a decoder for the content
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(bytes);
        
        // Extract strings that look like data (between tags or readable sequences)
        const matches = rawText.match(/[A-Za-z0-9áéíóúñÁÉÍÓÚÑ$.,\-\s]{3,}/g);
        if (matches) {
          // Filter out garbage and keep meaningful content
          const meaningfulContent = matches
            .filter(m => m.trim().length > 2)
            .filter(m => !/^[x0-9a-f]+$/i.test(m)) // Remove hex-like strings
            .filter(m => !/Content|Type|xml|xmlns|rels|workbook|sheet/i.test(m)) // Remove XML metadata
            .slice(0, 500); // Limit to prevent huge outputs
          
          textContent = meaningfulContent.join('\n');
        }
      } catch (e) {
        console.error('Error decoding Excel:', e);
      }
      
      if (textContent.length > 50) {
        return `=== CONTENIDO EXTRAÍDO DEL ARCHIVO EXCEL ===\n\nNota: Este es contenido extraído de un archivo Excel. Los datos pueden necesitar interpretación.\n\n${textContent}\n\n=== FIN DEL CONTENIDO ===`;
      } else {
        return `[Archivo Excel detectado: ${fileUrl}. El archivo está en formato binario. Por favor, proporcione los datos principales en texto o CSV para un análisis más preciso. Si el archivo tiene datos importantes, expórtelo a CSV.]`;
      }
    }

    // Handle CSV files - FULL SUPPORT
    if (contentType.includes('csv') || fileUrl.endsWith('.csv')) {
      console.log('Parsing CSV file...');
      const text = await response.text();
      const parsed = parseCSV(text);
      return `=== CONTENIDO DEL ARCHIVO CSV ===\n\n${parsed}\n\n=== DATOS RAW ===\n${text}`;
    }

    // Handle text files - FULL SUPPORT
    if (contentType.includes('text') || 
        fileUrl.endsWith('.txt') || 
        fileUrl.endsWith('.md')) {
      const text = await response.text();
      return `=== CONTENIDO DEL ARCHIVO ===\n\n${text}`;
    }

    // Handle JSON files - FULL SUPPORT
    if (contentType.includes('json') || fileUrl.endsWith('.json')) {
      const json = await response.json();
      return `=== CONTENIDO JSON ===\n\n${JSON.stringify(json, null, 2)}`;
    }

    // Handle PDF - limited support
    if (contentType.includes('pdf') || fileUrl.endsWith('.pdf')) {
      return `[Archivo PDF detectado. Para análisis de PDFs, por favor copie el contenido relevante en texto o exporte a un formato legible.]`;
    }

    // For other files, try to read as text
    try {
      const text = await response.text();
      if (text && text.length > 0 && text.length < 100000) {
        // Check if it looks like readable text
        const readableChars = text.match(/[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s.,;:!?$\-]/g)?.length || 0;
        if (readableChars / text.length > 0.7) {
          return `=== CONTENIDO DEL ARCHIVO ===\n\n${text}`;
        }
      }
    } catch (e) {
      console.error('Could not read file as text:', e);
    }

    return `[Archivo detectado pero no se pudo extraer contenido legible. Tipo: ${contentType}. Por favor exporte a CSV o TXT para análisis.]`;
  } catch (error) {
    console.error('Error extracting file content:', error);
    return `[Error al procesar archivo: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
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

    if (action === 'educational_chat') {
      return await handleEducationalChat(body, LOVABLE_API_KEY);
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
  const { title, content, file_url, file_type, submitter_name } = body;

  // IMPORTANTE: Usar el contenido PARSEADO desde el frontend
  // El frontend ya parsea Excel/CSV correctamente con XLSX library
  let extractedContent = '';
  
  // PRIORIZAR el contenido parseado del frontend
  if (content && content.length > 100 && !content.includes('[Error')) {
    console.log('Using pre-parsed content from frontend, length:', content.length);
    extractedContent = content;
  } else if (file_url) {
    // Solo como fallback si no hay contenido parseado
    console.log('No pre-parsed content, attempting backend extraction...');
    const fileContent = await extractFileContent(file_url, file_type);
    extractedContent = fileContent;
    console.log(`Backend extracted content length: ${extractedContent.length}`);
  }
  
  // Si no hay contenido útil, dar error claro
  if (!extractedContent || extractedContent.length < 50 || extractedContent.includes('[Error') || extractedContent.includes('[Archivo Excel')) {
    console.error('No valid content extracted from document');
    return new Response(
      JSON.stringify({
        analysis: `## ⚠️ Error al Leer Documento\n\nNo fue posible extraer el contenido del archivo "${title}".\n\n**Posibles causas:**\n- El archivo está corrupto o protegido\n- Formato no soportado\n- El archivo está vacío\n\n**Solución:**\n1. Intenta exportar el archivo a formato CSV\n2. O copia el contenido a un archivo de texto (.txt)\n3. Vuelve a subir el archivo`,
        feedback: 'No se pudo leer el contenido del archivo. Por favor, intenta con otro formato.',
        score: 0,
        suggestions: ['Exporta el archivo a CSV', 'Verifica que el archivo no esté corrupto', 'Prueba con un archivo de texto']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log('Final content to analyze (first 500 chars):', extractedContent.substring(0, 500));

  const analysisPrompt = `Analiza el siguiente documento/contenido enviado por ${submitter_name} como si fueras el CEO Mauricio revisándolo.

**Título del documento:** ${title}

**CONTENIDO REAL DEL DOCUMENTO (extraído del archivo):**
${extractedContent}

## INSTRUCCIONES DE ANÁLISIS:

IMPORTANTE: Debes analizar el CONTENIDO REAL proporcionado arriba. NO inventes datos. Extrae la información exacta del documento.

Si el documento contiene información financiera, rendiciones de gastos, flujos de caja o movimientos bancarios:

1. **EXTRAER y categorizar TODOS los gastos reales** encontrados en el documento:
   - 🏢 **GASTOS EMPRESARIALES/OPERACIONALES**: Pagos a proveedores, servicios, software, arriendos comerciales, abogados, fletes, aduanas, impuestos de importación, etc.
   - 👤 **GASTOS PERSONALES**: Comida personal, cumpleaños, supermercado, entretenimiento personal, etc.
   - 🚗 **TRANSPORTE/COMBUSTIBLE**: Gasolina, estacionamiento, peajes
   - 📱 **TECNOLOGÍA/SERVICIOS**: Planes de internet, Starlink, software, IA, etc.
   - 🏠 **VIVIENDA/ARRIENDOS**: Dividendos, arriendos de casas
   - 💳 **FINANCIEROS**: Intereses, préstamos, pagos bancarios
   - ❓ **OTROS/SIN CLASIFICAR**: Gastos que no encajan claramente

2. **Listar CADA ítem con su monto exacto** tal como aparece en el documento

3. **Calcular totales REALES por categoría** y mostrar porcentajes del total

4. **ALERTAR sobre mezcla de gastos personales con empresariales** si los hay

5. **Mostrar balance real**: Ingresos totales vs Egresos totales vs Saldo final (solo si hay datos)

## FORMATO DE RESPUESTA:

Responde en JSON con esta estructura:
{
  "analysis": "## 📊 Resumen Ejecutivo\\n\\n[Resumen basado en datos REALES del documento]\\n\\n## 📋 Datos Extraídos del Documento\\n\\n[Lista detallada de cada ítem encontrado con montos]\\n\\n## 📁 Categorización de Gastos\\n\\n### 🏢 Gastos Empresariales ($X.XXX - XX%)\\n- Ítem 1: $XXX\\n- Ítem 2: $XXX\\n\\n### 👤 Gastos Personales ($X.XXX - XX%)\\n[Si hay]\\n\\n## ⚠️ Alertas\\n\\n[Alertas basadas en el análisis real]\\n\\n## 📈 Balance Final\\n\\n- Total Ingresos: $X.XXX\\n- Total Egresos: $X.XXX\\n- Saldo: $X.XXX",
  "feedback": "Mensaje de feedback directo basado en el análisis REAL del documento",
  "score": 75,
  "suggestions": ["Sugerencia 1 específica", "Sugerencia 2 específica", "Sugerencia 3 específica"]
}

CRÍTICO: Usa los datos REALES del documento. NO inventes cifras ni ítems. Si no hay datos suficientes, indica qué falta.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: `Eres el CEO Mauricio analizando documentos de tu equipo. 

REGLAS CRÍTICAS:
1. ANALIZA ÚNICAMENTE el contenido REAL proporcionado
2. EXTRAE datos exactos del documento (montos, ítems, fechas)
3. NO inventes información que no esté en el documento
4. Si el documento está vacío o no tiene datos claros, INDÍCALO
5. Sé específico con los números y detalles encontrados

Responde en español con JSON válido.` },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
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

async function handleEducationalChat(body: ChatRequest, apiKey: string) {
  const { message, document_context, history = [], submitter_name = 'Usuario' } = body;

  // IMPORTANTE: El chat educativo es IMPARCIAL y SOLO considera el documento actual
  // No se mezcla información de documentos anteriores para mantener objetividad
  const systemPrompt = `Eres el CEO Mauricio de IWIE Holding en modo EDUCATIVO y MENTORING. Tu rol es:

1. **ANÁLISIS IMPARCIAL**: Debes analizar ÚNICAMENTE el documento actual de manera objetiva e imparcial. 
   - NO uses información de documentos o análisis anteriores
   - Cada documento se evalúa de forma independiente y con los mismos criterios
   - Mantén objetividad sin sesgos de evaluaciones previas

2. **EDUCAR Y GUIAR**: Ayudar al colaborador a entender qué puede mejorar y CÓMO hacerlo paso a paso.

3. **SER CONSTRUCTIVO**: Aunque señales errores, siempre ofrece soluciones claras y ejemplos prácticos.

4. **USAR SOLO EL CONTEXTO ACTUAL**: Tienes acceso ÚNICAMENTE al documento que el usuario envió ahora y su análisis. NO references otros documentos.

5. **ENSEÑAR MEJORES PRÁCTICAS**: Cuando el usuario pregunte cómo mejorar, explica:
   - Por qué es importante esa práctica
   - Ejemplos concretos de cómo aplicarla
   - Errores comunes a evitar

6. **COMUNICACIÓN Y DOCUMENTACIÓN**: Enseña buenas prácticas de:
   - Cómo estructurar documentos ejecutivos
   - Cómo presentar información financiera
   - Cómo comunicar de forma clara y concisa
   - Cómo organizar y categorizar información

7. **MOTIVAR**: Reconoce el esfuerzo y motiva a seguir mejorando.

**CONTEXTO DEL DOCUMENTO ACTUAL (único documento a considerar):**
- Título: ${document_context?.title || 'Sin título'}
- Contenido: ${document_context?.content || 'Sin contenido'}
- Análisis: ${document_context?.analysis || 'Sin análisis'}
- Feedback: ${document_context?.feedback || 'Sin feedback'}
- Sugerencias: ${document_context?.suggestions?.join(', ') || 'Sin sugerencias'}
- Puntuación: ${document_context?.score || 'N/A'}/100

IMPORTANTE: Solo responde basándote en este documento específico. Si el usuario pregunta sobre otros documentos, indica que cada análisis es independiente.

Responde de manera cercana pero profesional, siempre en español. Usa emojis moderadamente para hacer la conversación más amigable.`;

  // Solo usar el historial de ESTA conversación sobre ESTE documento
  // El historial ya viene filtrado desde el frontend para este documento específico
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
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
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const assistantMessage = aiResponse.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

  return new Response(
    JSON.stringify({
      response: assistantMessage
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
