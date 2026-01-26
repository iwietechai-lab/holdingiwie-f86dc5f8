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

// CEO System Prompt - Elocuente, Grato, Convincente, Imparcial
const CEO_SYSTEM_PROMPT = `Eres Mauricio Ortiz, CEO de IWIE Holding.

ACCESO A MÚLTIPLES INTELIGENCIAS:
Combinas perspectivas de análisis crítico, razonamiento profundo, análisis técnico y síntesis multimodal para dar respuestas completas e imparciales.

TU ESTILO DE COMUNICACIÓN:
- ELOCUENTE: Escribes con elegancia, claridad y precisión
- GRATO: Tu tono es cercano, motivador y respetuoso
- CONVINCENTE: Tus argumentos son sólidos y bien fundamentados
- IMPARCIAL: Analizas objetivamente, sin favoritismos ni sesgos
- CLARO: Tus respuestas son estructuradas y fáciles de seguir

AL ANALIZAR DOCUMENTOS:
1. RESUMEN EJECUTIVO (3-4 líneas claras)
2. PUNTOS CLAVE (máximo 5, los más importantes)
3. ANÁLISIS DETALLADO (perspectiva financiera, operativa, estratégica)
4. OPORTUNIDADES DE MEJORA (constructivo, no crítico)
5. RECOMENDACIONES CONCRETAS (acciones específicas con responsables)
6. MENSAJE MOTIVADOR (reconocimiento del esfuerzo del equipo)

REGLAS INQUEBRANTABLES:
- NUNCA uses emojis
- NUNCA incluyas campos JSON (score, feedback) en el texto de análisis
- NUNCA seas condescendiente o paternalista
- SIEMPRE sé específico y concreto en las recomendaciones
- SIEMPRE reconoce el trabajo bien hecho antes de sugerir mejoras
- ANALIZA SOLO el contenido REAL del documento, no inventes datos`;

// Function to call Brain Galaxy Multi-Brain Fusion
async function callBrainGalaxyFusion(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials for Brain Galaxy Fusion');
    return '';
  }
  
  try {
    console.log('Calling Brain Galaxy Multi-Brain Fusion...');
    const response = await fetch(
      `${supabaseUrl}/functions/v1/brain-galaxy-ai`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          mode: 'fusion',
          action: 'chat',
          brainModel: 'brain-4'
        })
      }
    );
    
    if (!response.ok) {
      console.error('Brain Galaxy Fusion error:', response.status);
      return '';
    }
    
    const data = await response.json();
    console.log('Brain Galaxy Fusion response received');
    return data.choices?.[0]?.message?.content || data.response || '';
  } catch (error) {
    console.error('Error calling Brain Galaxy Fusion:', error);
    return '';
  }
}

// Safe base64 encoding for large files (avoids stack overflow)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 32768;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
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

// Maximum content length to prevent token overflow
const MAX_CONTENT_LENGTH = 60000;

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  
  console.log(`Content too long (${content.length} chars), truncating...`);
  const truncated = content.substring(0, MAX_CONTENT_LENGTH);
  return truncated + `\n\n[... CONTENIDO TRUNCADO - El documento original tiene ${content.length.toLocaleString()} caracteres. Se analizan los primeros ${MAX_CONTENT_LENGTH.toLocaleString()} caracteres ...]`;
}

// Helper function to decode PDF string escapes
function decodePDFString(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ') // Remove control characters
    .trim();
}

// Check if extracted content appears corrupted (too many non-printable or garbage characters)
function checkIfContentCorrupted(content: string): boolean {
  if (!content || content.length < 100) return false;
  
  // Sample the first 2000 characters
  const sample = content.substring(0, 2000);
  
  // Count readable characters (letters, numbers, common punctuation, spaces)
  const readablePattern = /[A-Za-z0-9áéíóúñÁÉÍÓÚÑüÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜ\s.,;:!?¿¡$%\-@#&*+=\/'"()\[\]{}|<>\n\r\t]/g;
  const readableChars = (sample.match(readablePattern) || []).length;
  const readableRatio = readableChars / sample.length;
  
  // If less than 60% readable, consider it corrupted
  if (readableRatio < 0.6) {
    console.log(`Content corruption check: ${(readableRatio * 100).toFixed(1)}% readable (threshold: 60%)`);
    return true;
  }
  
  // Also check for common garbage patterns (sequences of escape characters, null bytes, etc.)
  const garbagePatterns = /[\x00-\x08\x0B\x0C\x0E-\x1F]{5,}|\\[0-9]{2,}|[�]{3,}/g;
  const garbageMatches = sample.match(garbagePatterns) || [];
  if (garbageMatches.length > 5) {
    console.log(`Content has ${garbageMatches.length} garbage patterns`);
    return true;
  }
  
  return false;
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
        return truncateContent(`=== CONTENIDO EXTRAÍDO DEL ARCHIVO EXCEL ===\n\nNota: Este es contenido extraído de un archivo Excel. Los datos pueden necesitar interpretación.\n\n${textContent}\n\n=== FIN DEL CONTENIDO ===`);
      } else {
        return `[Archivo Excel detectado: ${fileUrl}. El archivo está en formato binario. Por favor, proporcione los datos principales en texto o CSV para un análisis más preciso. Si el archivo tiene datos importantes, expórtelo a CSV.]`;
      }
    }

    // Handle CSV files - FULL SUPPORT
    if (contentType.includes('csv') || fileUrl.endsWith('.csv')) {
      console.log('Parsing CSV file...');
      const text = await response.text();
      const parsed = parseCSV(text);
      return truncateContent(`=== CONTENIDO DEL ARCHIVO CSV ===\n\n${parsed}\n\n=== DATOS RAW ===\n${text}`);
    }

    // Handle text files - FULL SUPPORT
    if (contentType.includes('text') || 
        fileUrl.endsWith('.txt') || 
        fileUrl.endsWith('.md')) {
      const text = await response.text();
      return truncateContent(`=== CONTENIDO DEL ARCHIVO ===\n\n${text}`);
    }

    // Handle JSON files - FULL SUPPORT
    if (contentType.includes('json') || fileUrl.endsWith('.json')) {
      const json = await response.json();
      return truncateContent(`=== CONTENIDO JSON ===\n\n${JSON.stringify(json, null, 2)}`);
    }

    // Handle PDF - use OCR for reliable extraction
    if (contentType.includes('pdf') || fileUrl.endsWith('.pdf')) {
      console.log('PDF file detected - attempting OCR extraction via Google Vision...');
      
      const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
      
      if (GOOGLE_AI_API_KEY) {
        try {
          // Download PDF as base64
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const base64Content = uint8ArrayToBase64(bytes);
          
          console.log('Calling Google Vision API for PDF OCR...');
          
          // Use Google Vision API for document text detection
          const visionResponse = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_AI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{
                  image: { content: base64Content },
                  features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }]
                }]
              })
            }
          );
          
          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text;
            
            if (fullText && fullText.length > 50) {
              console.log(`Google Vision OCR extracted ${fullText.length} characters`);
              return truncateContent(`=== CONTENIDO EXTRAÍDO DEL PDF (OCR) ===\n\n${fullText}\n\n=== FIN DEL CONTENIDO ===`);
            }
          } else {
            console.error('Google Vision API error:', visionResponse.status);
          }
        } catch (ocrError) {
          console.error('OCR extraction failed:', ocrError);
        }
      }
      
      // Fallback to basic text extraction
      console.log('OCR not available or failed, trying basic extraction...');
      try {
        // Re-fetch since we consumed the response
        const reFetch = await fetch(fileUrl);
        const arrayBuffer = await reFetch.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        const decoder = new TextDecoder('latin1');
        const rawContent = decoder.decode(bytes);
        
        // Extract text from PDF streams
        const extractedTexts: string[] = [];
        
        // Extract text from text showing operators
        const tjMatches = rawContent.matchAll(/\(([^)]+)\)\s*Tj/g);
        for (const tj of tjMatches) {
          const text = decodePDFString(tj[1]);
          if (text && text.length > 1) extractedTexts.push(text);
        }
        
        // TJ operator (show text array)
        const tjArrayMatches = rawContent.matchAll(/\[(.*?)\]\s*TJ/gi);
        for (const tja of tjArrayMatches) {
          const parts = tja[1].matchAll(/\(([^)]*)\)/g);
          for (const part of parts) {
            const text = decodePDFString(part[1]);
            if (text && text.length > 0) extractedTexts.push(text);
          }
        }
        
        // Extract readable text sequences
        const readableMatches = rawContent.matchAll(/\(([A-Za-z0-9áéíóúñÁÉÍÓÚÑüÜ\s.,;:!?¿¡$%\-@#&*+=\/'"]+)\)/g);
        for (const m of readableMatches) {
          const text = decodePDFString(m[1]);
          if (text && text.length > 3 && /[a-záéíóúñ]{2,}/i.test(text)) {
            extractedTexts.push(text);
          }
        }
        
        // Clean and join
        const cleanedTexts = extractedTexts
          .map(t => t.trim())
          .filter(t => t.length > 1)
          .filter(t => !/^[0-9\s.,]+$/.test(t))
          .filter(t => !t.includes('\u0000'));
        
        let finalText = cleanedTexts.join(' ').replace(/\s+/g, ' ');
        
        if (finalText.length > 100) {
          console.log(`Basic PDF extraction: ${finalText.length} chars`);
          return truncateContent(`=== CONTENIDO DEL PDF (extracción básica) ===\n\n${finalText}\n\n=== FIN ===`);
        }
      } catch (e) {
        console.error('Basic PDF extraction failed:', e);
      }
      
      return `[PDF detectado pero no se pudo extraer texto. Por favor, copie el contenido del PDF y péguelo como texto en el chat.]`;
    }

    // Handle Word documents (.docx is a ZIP containing XML)
    if (contentType.includes('word') || 
        contentType.includes('msword') ||
        contentType.includes('vnd.openxmlformats-officedocument.wordprocessingml') ||
        fileUrl.endsWith('.docx') || 
        fileUrl.endsWith('.doc')) {
      console.log('Word document detected - attempting improved extraction...');
      try {
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        // Use latin1 for better binary compatibility
        const decoder = new TextDecoder('latin1');
        const rawContent = decoder.decode(bytes);
        
        const textMatches: string[] = [];
        
        // DOCX: Look for text in w:t tags (Word text elements)
        const wtMatches = rawContent.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        for (const match of wtMatches) {
          const text = match[1].trim();
          if (text.length > 0) {
            textMatches.push(text);
          }
        }
        
        // Also try generic XML text extraction
        if (textMatches.length === 0) {
          const xmlTextMatches = rawContent.matchAll(/>([A-Za-z0-9áéíóúñÁÉÍÓÚÑüÜ\s.,;:!?¿¡$%\-@#&*+=\/'"]{3,})</g);
          for (const match of xmlTextMatches) {
            const text = match[1].trim();
            // Filter out XML metadata
            if (text.length > 2 && 
                !/^(xml|xmlns|http|www|urn:|schema|content|type|version|encoding)/i.test(text) &&
                /[a-záéíóúñ]/i.test(text)) {
              textMatches.push(text);
            }
          }
        }
        
        // Join texts intelligently
        let finalText = '';
        for (const text of textMatches) {
          if (finalText && !finalText.endsWith(' ') && !finalText.endsWith('\n')) {
            // Add space or newline based on context
            if (/[.!?]$/.test(finalText)) {
              finalText += '\n';
            } else {
              finalText += ' ';
            }
          }
          finalText += text;
        }
        
        console.log(`Word extraction: ${textMatches.length} fragments, ${finalText.length} chars`);
        
        if (finalText.length > 50) {
          return truncateContent(`=== CONTENIDO EXTRAÍDO DEL DOCUMENTO WORD ===\n\nNota: Texto extraído automáticamente del documento Word.\n\n${finalText}\n\n=== FIN DEL CONTENIDO ===`);
        }
      } catch (e) {
        console.error('Error extracting Word text:', e);
      }
      
      return `[Documento Word detectado pero no se pudo extraer texto. El archivo puede estar protegido o en formato antiguo (.doc). Por favor, abra el documento, copie el contenido y péguelo como texto en el chat, o guarde como archivo .txt]`;
    }

    // For other files, try to read as text
    try {
      const text = await response.text();
      if (text && text.length > 0 && text.length < 100000) {
        // Check if it looks like readable text
        const readableChars = text.match(/[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s.,;:!?$\-]/g)?.length || 0;
        if (readableChars / text.length > 0.7) {
          return truncateContent(`=== CONTENIDO DEL ARCHIVO ===\n\n${text}`);
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
  
  // Check if frontend indicates parsing is required (PDF, Word, PPT)
  const requiresParsing = content && (
    content.includes('[PDF_REQUIRES_PARSING:') ||
    content.includes('[WORD_REQUIRES_PARSING:') ||
    content.includes('[PPT_REQUIRES_PARSING:')
  );
  
  // PRIORIZAR el contenido parseado del frontend si es válido
  if (content && content.length > 100 && !content.includes('[Error') && !requiresParsing) {
    console.log('Using pre-parsed content from frontend, length:', content.length);
    extractedContent = truncateContent(content);
  } else if (file_url || requiresParsing) {
    // Fallback: intentar extraer desde el archivo directamente
    console.log('Attempting backend extraction...', requiresParsing ? '(requires parsing)' : '');
    if (file_url) {
      const fileContent = await extractFileContent(file_url, file_type);
      extractedContent = fileContent;
      console.log(`Backend extracted content length: ${extractedContent.length}`);
    }
  }
  
  // Check for corrupted content (too many non-printable characters)
  const isCorrupted = extractedContent && checkIfContentCorrupted(extractedContent);
  
  if (isCorrupted) {
    console.log('Content appears corrupted (too many non-printable characters), treating as error');
    extractedContent = '';
  }
  
  // Check for various error conditions
  const hasError = !extractedContent || 
    extractedContent.length < 50 || 
    extractedContent.includes('[Error') ||
    (extractedContent.includes('[') && extractedContent.includes('detectado') && extractedContent.includes('no se pudo'));
  
  // Si no hay contenido útil, dar error claro con instrucciones específicas
  if (hasError) {
    console.error('No valid content extracted from document');
    
    let errorMessage = `## ⚠️ Error al Leer Documento\n\nNo fue posible extraer el contenido del archivo "${title}".`;
    let errorFeedback = 'No se pudo leer el contenido del archivo.';
    let errorSuggestions = ['Verifica que el archivo no esté corrupto'];
    
    // Customize error based on file type
    const fileName = (title || '').toLowerCase();
    if (fileName.endsWith('.pdf')) {
      errorMessage += `\n\n**El archivo es un PDF.**\n\n**Opciones:**\n1. Abre el PDF y copia el texto relevante\n2. Pega el texto copiado en el chat\n3. O guarda el PDF como archivo de texto (.txt)\n\n*Tip: Si el PDF tiene muchas imágenes o es escaneado, puede que no tenga texto extraíble.*`;
      errorFeedback = 'PDF detectado pero no se pudo extraer texto. Copia el contenido manualmente.';
      errorSuggestions = ['Copia el texto del PDF y pégalo en el chat', 'Guarda como archivo .txt', 'Verifica que el PDF no sea una imagen escaneada'];
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      errorMessage += `\n\n**El archivo es un documento Word.**\n\n**Opciones:**\n1. Abre el documento y copia el texto\n2. Guarda como archivo de texto (.txt)\n3. Exporta a PDF y luego copia el texto`;
      errorFeedback = 'Documento Word detectado pero no se pudo leer. Guarda como .txt o copia el texto.';
      errorSuggestions = ['Guarda el documento como .txt', 'Copia el texto y pégalo directamente', 'Exporta a CSV si tiene tablas'];
    } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
      errorMessage += `\n\n**El archivo es una presentación PowerPoint.**\n\n**Para analizar presentaciones:**\n1. Copia el texto de las diapositivas\n2. O exporta las notas del presentador\n3. O guarda como PDF y luego extrae el texto`;
      errorFeedback = 'PowerPoint detectado. Copia el contenido de las diapositivas para análisis.';
      errorSuggestions = ['Copia el texto de las diapositivas', 'Exporta las notas del presentador', 'Guarda como PDF primero'];
    }
    
    return new Response(
      JSON.stringify({
        analysis: errorMessage,
        feedback: errorFeedback,
        score: 0,
        suggestions: errorSuggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  console.log('Final content to analyze (first 500 chars):', extractedContent.substring(0, 500));

  const analysisPrompt = `Eres Mauricio Ortiz, CEO de IWIE Holding, analizando un documento enviado por ${submitter_name}. 

Tu estilo de comunicación es:
- **ELOCUENTE Y GRATO**: Escribes con elegancia, claridad y calidez
- **CONVINCENTE**: Tus argumentos son sólidos y bien estructurados
- **IMPARCIAL**: Analizas objetivamente, sin sesgos ni favoritismos
- **CLARO**: Cada idea se entiende perfectamente
- **MOTIVADOR**: Inspiras a tu equipo a mejorar

**Título del documento:** ${title}

**CONTENIDO DEL DOCUMENTO:**
${extractedContent}

## ESTRUCTURA DE TU ANÁLISIS:

**SALUDO EJECUTIVO**
Comienza con un saludo profesional y cercano dirigido al equipo.

**RESUMEN EJECUTIVO**
Qué contiene el documento y cuál es su propósito. Visión general en 2-3 párrafos.

**ASPECTOS DESTACADOS**
Lista con bullets (-) de los puntos fuertes. Reconoce el buen trabajo.

**OPORTUNIDADES DE MEJORA**
Análisis constructivo de qué puede mejorarse. Siempre con tono positivo.

**DATOS CLAVE** (si aplica)
Presenta información numérica en listas claras, NO en tablas Markdown.

**PLAN DE ACCIÓN**
Acciones específicas numeradas (1. 2. 3.) con responsables y plazos.

**MENSAJE DE CIERRE**
Palabras de motivación y próximos pasos. Firma: "Mauricio Ortiz, CEO IWIE Holding"

---

RESPONDE ÚNICAMENTE EN FORMATO JSON VÁLIDO:

{
  "analysis": "[Tu análisis completo. Usa **negritas** para títulos de sección, bullets (-) para listas, y numeración (1. 2. 3.) para pasos. NO uses ### ni emojis. Mínimo 400 palabras.]",
  "feedback": "[Resumen ejecutivo de 2-3 oraciones - claro, directo y motivador]",
  "score": [número 0-100 basado en calidad objetiva],
  "suggestions": ["Acción específica 1", "Acción específica 2", "Acción específica 3"]
}

REGLAS CRÍTICAS:
- SOLO analiza el contenido REAL proporcionado
- NO inventes datos que no existan en el documento
- NO uses emojis
- NO uses headers Markdown (###)
- NO uses tablas Markdown
- USA bullets (-) y numeración para estructurar
- El análisis debe ser IMPARCIAL y OBJETIVO`;

  console.log('Calling AI API for analysis...');
  
  let response;
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
    
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Use flash for faster response
        messages: [
          { role: 'system', content: `Eres Mauricio Ortiz, CEO de IWIE Holding.

CARACTERÍSTICAS DE TU COMUNICACIÓN:
- Elegante y profesional, pero cercano y humano
- Claro y directo, sin rodeos innecesarios  
- Constructivo: señalas áreas de mejora de forma motivadora
- Imparcial: analizas objetivamente cada documento
- Inspirador: terminas con mensajes que motivan al equipo

REGLAS ABSOLUTAS:
1. ANALIZA SOLO el contenido REAL del documento
2. NO inventes información que no esté presente
3. NO uses emojis
4. NO uses headers Markdown (###)
5. Usa bullets (-) y numeración para listas
6. Responde SIEMPRE con JSON válido
7. NUNCA incluyas "feedback": o "score": como texto en el análisis

Responde en español con JSON válido.` },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.4,
        max_tokens: 6000
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (fetchError) {
    console.error('Fetch error (possible timeout):', fetchError);
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      return new Response(
        JSON.stringify({ 
          error: 'El análisis tardó demasiado tiempo. Por favor, intente con un documento más corto o inténtelo de nuevo.',
          analysis: '## ⏳ Tiempo Excedido\n\nEl análisis del documento tardó más de lo esperado. Esto puede ocurrir con documentos muy extensos.\n\n**Sugerencias:**\n- Intente nuevamente\n- Si el documento es muy largo, divídalo en secciones\n- Copie las partes más importantes y envíelas por separado',
          feedback: 'El procesamiento tardó demasiado. Intente con un documento más corto.',
          score: 0,
          suggestions: ['Reintentar el análisis', 'Dividir el documento en partes más pequeñas', 'Copiar solo las secciones clave']
        }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw fetchError;
  }

  console.log('AI API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error response:', errorText);
    
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
    throw new Error(`AI API error: ${response.status} - ${errorText}`);
  }

  const aiResponse = await response.json();
  console.log('AI response received, parsing...');
  
  let content_response = aiResponse.choices?.[0]?.message?.content || '{}';
  
  // Clean markdown code blocks if present
  content_response = content_response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  console.log('Parsed content length:', content_response.length);
  
  try {
    const analysisData = JSON.parse(content_response);
    console.log('Successfully parsed JSON response');
    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseError) {
    console.error('JSON parse error, returning raw content:', parseError);
    return new Response(
      JSON.stringify({
        analysis: content_response,
        feedback: 'Documento recibido para revisión.',
        score: 70,
        suggestions: ['Revisar formato del documento']
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

Responde de manera cercana pero profesional, siempre en español. NO uses emojis. Mantén un tono profesional y constructivo.`;

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
