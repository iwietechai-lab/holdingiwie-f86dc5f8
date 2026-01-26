
# Plan: Corrección Definitiva de CEOChat - Respuestas Profesionales Sin Errores

## Diagnóstico Completo de Errores

### ERROR 1: Stack Overflow en Base64 (Crítico)
**Ubicación:** `supabase/functions/ceo-internal-chat/index.ts` línea 274
```typescript
const base64Content = btoa(String.fromCharCode.apply(null, [...bytes]));
```
**Problema:** `apply()` tiene un límite de ~100,000 argumentos. PDFs grandes causan:
```
RangeError: Maximum call stack size exceeded
```

**Solución:** Procesar en chunks de 32KB:
```typescript
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
```

---

### ERROR 2: Emojis en System Prompt
**Ubicación:** `supabase/functions/ceo-internal-chat/index.ts` líneas 33-58
```typescript
🧠 ACCESO A MÚLTIPLES INTELIGENCIAS:
📝 TU ESTILO DE COMUNICACIÓN:
📊 AL ANALIZAR DOCUMENTOS:
⚠️ REGLAS INQUEBRANTABLES:
```
**Problema:** Un CEO profesional no usa emojis en análisis ejecutivos.

**Solución:** Eliminar todos los emojis del prompt.

---

### ERROR 3: Prompt Pide Markdown Complejo que No se Renderiza
**Ubicación:** `supabase/functions/ceo-internal-chat/index.ts` líneas 746-772
```typescript
### 1. SALUDO EJECUTIVO
### 2. RESUMEN EJECUTIVO
### 3. ASPECTOS DESTACADOS ✨
| Concepto | Valor | Observación |
```
**Problema:** El prompt pide:
- Headers `###` - MarkdownRenderer NO los soporta
- Emojis ✨📈🎯 - Inapropiados para CEO
- Tablas Markdown - MarkdownRenderer NO las soporta

**Solución:** Modificar prompt para usar solo formato soportado (bullets, negritas, líneas).

---

### ERROR 4: MarkdownRenderer Muy Limitado
**Ubicación:** `src/components/MarkdownRenderer.tsx` línea 11
```typescript
ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'span']
```
**Problema:** No soporta `div`, `h1-h3`, `hr`, por lo que headers `##` aparecen como texto plano.

**Solución:** 
1. Agregar `div`, `hr` a ALLOWED_TAGS
2. Convertir `###`, `##`, `#` a `<div>` con estilos apropiados
3. Convertir `---` a `<hr>`

---

### ERROR 5: max_tokens Insuficiente
**Ubicación:** `supabase/functions/ceo-internal-chat/index.ts` línea 828
```typescript
max_tokens: 4000
```
**Problema:** Análisis largos se truncan, causando JSON inválido.

**Solución:** Aumentar a `6000` (balance entre completitud y velocidad).

---

### ERROR 6: Chat Educativo Aún Pide Emojis
**Ubicación:** `supabase/functions/ceo-internal-chat/index.ts` línea 944
```typescript
Usa emojis moderadamente para hacer la conversación más amigable.
```
**Solución:** Cambiar a "NO uses emojis. Mantén un tono profesional."

---

## Archivos a Modificar

### Archivo 1: `src/components/MarkdownRenderer.tsx`

**Cambios:**
1. Agregar `div`, `hr` a ALLOWED_TAGS
2. Procesar headers `#`, `##`, `###` ANTES de otros formatos
3. Procesar separadores `---`

```typescript
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'span', 'div', 'hr'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
};

// Dentro de useMemo, ANTES de procesar bold/italic:

// Headers - convertir a divs estilizados
processed = processed.replace(/^###\s+(.*)$/gm, 
  '<div class="text-base font-semibold mt-3 mb-1 text-foreground">$1</div>');
processed = processed.replace(/^##\s+(.*)$/gm, 
  '<div class="text-lg font-bold mt-4 mb-2 text-primary">$1</div>');
processed = processed.replace(/^#\s+(.*)$/gm, 
  '<div class="text-xl font-bold mt-4 mb-2 text-foreground">$1</div>');

// Separadores
processed = processed.replace(/^---+$/gm, 
  '<hr class="my-4 border-muted-foreground/30" />');
```

---

### Archivo 2: `supabase/functions/ceo-internal-chat/index.ts`

**Cambio 1 - Función uint8ArrayToBase64 (agregar antes de línea 106):**
```typescript
// Safe base64 encoding for large files
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
```

**Cambio 2 - Usar nueva función (línea 274):**
```typescript
// ANTES: const base64Content = btoa(String.fromCharCode.apply(null, [...bytes]));
const base64Content = uint8ArrayToBase64(bytes);
```

**Cambio 3 - CEO_SYSTEM_PROMPT sin emojis (líneas 33-58):**
```typescript
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
```

**Cambio 4 - analysisPrompt sin emojis ni tablas (líneas 732-789):**
```typescript
const analysisPrompt = `Eres Mauricio Ortiz, CEO de IWIE Holding, analizando un documento enviado por ${submitter_name}. 

Tu estilo de comunicación es:
- ELOCUENTE Y GRATO: Escribes con elegancia, claridad y calidez
- CONVINCENTE: Tus argumentos son sólidos y bien estructurados
- IMPARCIAL: Analizas objetivamente, sin sesgos ni favoritismos
- CLARO: Cada idea se entiende perfectamente
- MOTIVADOR: Inspiras a tu equipo a mejorar

**Título del documento:** ${title}

**CONTENIDO DEL DOCUMENTO:**
${extractedContent}

ESTRUCTURA DE TU ANÁLISIS:

**SALUDO EJECUTIVO**
Comienza con un saludo profesional y cercano dirigido al equipo.

**RESUMEN EJECUTIVO**
Qué contiene el documento y cuál es su propósito. Visión general en 2-3 párrafos.

**ASPECTOS DESTACADOS**
Lista con bullets (-) de los puntos fuertes. Reconoce el buen trabajo.

**OPORTUNIDADES DE MEJORA**
Análisis constructivo de qué puede mejorarse. Siempre con tono positivo.

**DATOS CLAVE** (si aplica)
Presenta información numérica en listas claras, NO en tablas.

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
```

**Cambio 5 - System message del análisis sin emojis (líneas 808-824):**
```typescript
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

Responde en español con JSON válido.` }
```

**Cambio 6 - max_tokens (línea 828):**
```typescript
// ANTES: max_tokens: 4000
max_tokens: 6000
```

**Cambio 7 - Chat educativo sin emojis (línea 944):**
```typescript
// ANTES: Usa emojis moderadamente para hacer la conversación más amigable.
Responde de manera cercana pero profesional, siempre en español. NO uses emojis. Mantén un tono profesional y constructivo.
```

---

## Resumen de Correcciones

| Error | Línea | Corrección |
|-------|-------|------------|
| Stack overflow en base64 | 274 | Nueva función `uint8ArrayToBase64` con chunks |
| Emojis en CEO_SYSTEM_PROMPT | 33-58 | Eliminar todos los emojis |
| Headers/tablas en analysisPrompt | 732-789 | Usar solo bullets y negritas |
| Emojis en analysisPrompt | 756-767 | Eliminar ✨📈🎯 |
| MarkdownRenderer limitado | 10-11 | Agregar soporte para headers y hr |
| max_tokens bajo | 828 | Aumentar a 6000 |
| Emojis en chat educativo | 944 | Cambiar instrucción |

---

## Resultado Esperado

**ANTES (Con errores):**
```
## Saludo Ejecutivo ✨
Estimado equipo...

## Resumen Ejecutivo
El documento...

### Aspectos Destacados ✨
| Concepto | Valor |
```

**DESPUÉS (Profesional):**
```
**Saludo Ejecutivo**

Estimado equipo, es un gusto revisar este documento.

**Resumen Ejecutivo**

El documento presenta información detallada sobre los certificados 
de escritura con enlaces relevantes al Registro de Empresas de Chile.
La estructura es clara y la información está bien organizada.

**Aspectos Destacados**

- Documentación bien estructurada con referencias verificables
- Inclusión de enlaces oficiales para validación
- Formato profesional y presentación limpia

**Oportunidades de Mejora**

- Agregar una introducción que explique el contexto
- Incluir un resumen ejecutivo al inicio del documento

**Plan de Acción**

1. Revisar la estructura general del documento
2. Agregar numeración de páginas
3. Incluir fecha de elaboración

**Mensaje de Cierre**

Confío en la capacidad del equipo para implementar estas mejoras.
Estamos construyendo algo grande juntos.

Mauricio Ortiz
CEO, IWIE Holding
```
