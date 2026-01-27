
# Plan: Habilitar Conversación Infinita en Brain Galaxy Chat y CEOChat

## Diagnóstico de Errores Identificados

Tras revisar exhaustivamente el código, he identificado los problemas REALES:

---

## Problema 1: CEOChat - El Historial se Envía ANTES de Agregar el Mensaje Actual

**Archivo:** `src/components/ceo/AnalysisChatDialog.tsx` (líneas 92-108)

**El Bug:**
```typescript
// Línea 92: Primero agrega el mensaje del usuario al estado
setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

// Líneas 100-108: Pero envía 'chatMessages' que TODAVÍA NO tiene el mensaje nuevo
const { data, error } = await supabase.functions.invoke('ceo-internal-chat', {
  body: {
    ...
    history: chatMessages,  // <-- AQUÍ ESTÁ EL BUG: chatMessages no incluye el mensaje que acabamos de agregar
  }
});
```

**Por qué falla:** React `setState` es asíncrono. Cuando llamamos `setChatMessages(prev => [...prev, userMsg])`, el estado `chatMessages` NO se actualiza inmediatamente. Por lo tanto, cuando enviamos `history: chatMessages`, estamos enviando el historial SIN el mensaje actual del usuario.

**Resultado:** La IA recibe el historial incompleto y no puede mantener contexto correctamente.

---

## Problema 2: CEOChat - El Historial se Borra Cada Vez que se Abre el Diálogo

**Archivo:** `src/components/ceo/AnalysisChatDialog.tsx` (líneas 78-83)

**El Bug:**
```typescript
useEffect(() => {
  if (open && analysisResult) {
    setChatMessages([]);  // Siempre borra todo
    setShowChat(false);
  }
}, [open, analysisResult?.submission?.id]);
```

**El problema:** El `useEffect` tiene `open` como dependencia. Cada vez que `open` cambia de `false` a `true`, se ejecuta y borra el historial. Incluso si es el mismo documento.

---

## Problema 3: Brain Galaxy Chat - Contexto de Archivos se Pierde

**Archivo:** `src/components/brain-galaxy/BrainGalaxyChat.tsx` (líneas 150-172)

**El Bug:**
```typescript
// Se crea aiContextMessage con instrucciones para la IA
const aiContextMessage = {
  role: 'user' as const,
  content: `El usuario ha subido ${files.length} archivo(s)...`
};

// Se envía al chat
await streamChat([...updatedMessages.map(m => ({ role: m.role, content: m.content })), aiContextMessage]);
```

**El problema:** `aiContextMessage` se envía a la IA pero NUNCA se guarda en el estado `messages`. En mensajes posteriores del usuario, este contexto desaparece porque solo se envían los `messages` del estado.

**Resultado:** La IA "olvida" los archivos después del primer mensaje.

---

## Problema 4: Backend CEOChat - Prompt Restrictivo

**Archivo:** `supabase/functions/ceo-internal-chat/index.ts` (línea 956)

**El Bug:**
```typescript
// Línea 956 dice explícitamente:
"IMPORTANTE: Solo responde basándote en este documento específico. 
Si el usuario pregunta sobre otros documentos, indica que cada análisis es independiente."
```

**El problema:** Este prompt limita artificialmente la capacidad de la IA para profundizar. No es malo para evitar "contaminación" entre documentos, pero la frase "cada análisis es independiente" confunde a la IA cuando el usuario quiere PROFUNDIZAR en el MISMO documento.

---

## Soluciones Propuestas

### Solución 1: Enviar Historial Completo (CEOChat)

**Archivo:** `src/components/ceo/AnalysisChatDialog.tsx`

Cambiar la función `handleSendMessage` para construir el historial ANTES de enviarlo:

```typescript
const handleSendMessage = async () => {
  if (!inputMessage.trim() || isSending || !analysisResult) return;
  
  const userMessage = inputMessage.trim();
  setInputMessage('');
  setShowChat(true);
  
  // Crear el nuevo mensaje
  const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
  
  // Actualizar UI
  setChatMessages(prev => [...prev, newUserMessage]);
  setIsSending(true);

  try {
    // CORRECCION: Construir historial completo incluyendo el mensaje actual
    const fullHistory = [...chatMessages, newUserMessage];
    
    const { data, error } = await supabase.functions.invoke('ceo-internal-chat', {
      body: {
        action: 'educational_chat',
        message: userMessage,
        document_context: {...},
        history: fullHistory,  // Ahora incluye TODOS los mensajes
        submitter_name: submitterName
      }
    });
    // ...resto del código
  }
};
```

### Solución 2: Solo Reiniciar si Cambia el Documento (CEOChat)

**Archivo:** `src/components/ceo/AnalysisChatDialog.tsx`

Agregar un estado para rastrear qué documento se analizó:

```typescript
const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null);

useEffect(() => {
  // Solo reiniciar si es un documento DIFERENTE al anterior
  const currentId = analysisResult?.submission?.id;
  if (open && currentId && currentId !== lastAnalyzedId) {
    setChatMessages([]);
    setShowChat(false);
    setLastAnalyzedId(currentId);
  }
}, [open, analysisResult?.submission?.id]);
```

### Solución 3: Persistir Contexto de Archivos (Brain Galaxy)

**Archivo:** `src/components/brain-galaxy/BrainGalaxyChat.tsx`

Guardar el contexto del archivo como un mensaje "sistema" invisible:

```typescript
const processFilesForChat = async (files: AttachedFile[]) => {
  // ... código existente ...

  // NUEVO: Guardar el contexto de archivos en el estado para futuros mensajes
  const fileContextMessage: ChatMessage = {
    id: `msg-context-${Date.now()}`,
    role: 'system',  // O 'user' con metadata especial
    content: `[CONTEXTO DE ARCHIVOS: ${files.map(f => f.name).join(', ')}]`,
    timestamp: new Date().toISOString(),
    metadata: { type: 'file_context', files: files.map(f => f.name) }
  };

  // Guardar en estado para que persista en futuros mensajes
  setMessages(prev => [...prev, fileMessage, fileContextMessage]);
  
  // Enviar a la IA
  await streamChat([...updatedMessages, aiContextMessage].map(m => ({ role: m.role, content: m.content })));
};
```

Y en `handleSend`, verificar si hay contexto de archivos previo e incluirlo.

### Solución 4: Actualizar Prompt del Backend (CEOChat)

**Archivo:** `supabase/functions/ceo-internal-chat/index.ts`

Cambiar la línea restrictiva:

**Antes (línea 956):**
```
"IMPORTANTE: Solo responde basándote en este documento específico. Si el usuario pregunta sobre otros documentos, indica que cada análisis es independiente."
```

**Después:**
```
"IMPORTANTE: Responde basándote en este documento y en todo el historial de la conversación actual. El usuario puede hacer múltiples preguntas para profundizar en el análisis. Mantén coherencia con lo ya discutido. Si el usuario quiere hablar de OTRO documento diferente, indícale que cada análisis de documento es independiente."
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ceo/AnalysisChatDialog.tsx` | 1. Corregir envío de historial para incluir mensaje actual 2. Solo reiniciar chat si es documento diferente |
| `src/components/brain-galaxy/BrainGalaxyChat.tsx` | Persistir contexto de archivos en el estado de mensajes |
| `supabase/functions/ceo-internal-chat/index.ts` | Actualizar prompt para permitir profundización en mismo documento |

---

## Sección Técnica Detallada

### Cambio 1: AnalysisChatDialog.tsx - handleSendMessage

```typescript
// ANTES (buggy):
setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
// ...más tarde...
history: chatMessages,  // chatMessages aún no tiene el nuevo mensaje

// DESPUÉS (correcto):
const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
setChatMessages(prev => [...prev, newUserMessage]);
// ...más tarde...
history: [...chatMessages, newUserMessage],  // Incluye explícitamente el nuevo mensaje
```

### Cambio 2: AnalysisChatDialog.tsx - useEffect

```typescript
// ANTES:
useEffect(() => {
  if (open && analysisResult) {
    setChatMessages([]);
    setShowChat(false);
  }
}, [open, analysisResult?.submission?.id]);

// DESPUÉS:
const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null);

useEffect(() => {
  const currentId = analysisResult?.submission?.id;
  if (open && currentId && currentId !== lastAnalyzedId) {
    setChatMessages([]);
    setShowChat(false);
    setLastAnalyzedId(currentId);
  }
}, [open, analysisResult?.submission?.id, lastAnalyzedId]);
```

### Cambio 3: BrainGalaxyChat.tsx - processFilesForChat

En la función `processFilesForChat`, después de crear el `fileMessage`:

```typescript
// Guardar contexto para persistencia
const fileContextForState: ChatMessage = {
  id: `msg-file-context-${Date.now()}`,
  role: 'user',
  content: aiContextMessage.content,  // Mismo contenido que se envía a la IA
  timestamp: new Date().toISOString(),
  metadata: { isContextMessage: true, hidden: true }
};

// Actualizar estado con AMBOS mensajes
const messagesWithContext = [...messages, fileMessage, fileContextForState];
setMessages(messagesWithContext);

// Enviar a IA
await streamChat(messagesWithContext.map(m => ({ role: m.role, content: m.content })));
```

### Cambio 4: ceo-internal-chat/index.ts - Prompt

Línea 956, cambiar de:
```
IMPORTANTE: Solo responde basándote en este documento específico. Si el usuario pregunta sobre otros documentos, indica que cada análisis es independiente.
```

A:
```
IMPORTANTE: Responde basándote en este documento y mantén el contexto de toda la conversación. El usuario puede profundizar con múltiples preguntas sobre el mismo documento. Mantén coherencia con respuestas anteriores. Si pregunta por un documento DIFERENTE, indica que cada documento tiene su propio análisis.
```

---

## Flujo de Usuario Después de las Correcciones

### CEOChat:
1. Usuario sube documento Excel
2. AI CEO analiza y muestra resultados
3. Usuario: "Explícame más sobre el indicador de ventas"
4. AI CEO responde con explicación detallada (MANTIENE CONTEXTO)
5. Usuario: "¿Cómo puedo mejorar eso?"
6. AI CEO: Sugiere mejoras específicas basadas en la conversación anterior
7. Usuario cierra el diálogo
8. Usuario reabre el diálogo del mismo documento
9. El historial de chat PERSISTE (no se borra)

### Brain Galaxy:
1. Usuario sube PDF
2. AI Brain Galaxy: "He recibido tu documento, ¿qué quieres hacer?"
3. Usuario: "Analízalo"
4. AI: Proporciona análisis completo
5. Usuario: "Dame más detalles sobre el punto 3"
6. AI: Profundiza en punto 3 (RECUERDA EL DOCUMENTO)
7. Usuario: "Crea un quiz basado en esto"
8. AI: Crea quiz sobre el contenido (SIGUE RECORDANDO)

---

## Validación

Después de implementar:

1. CEOChat: Verificar que al hacer preguntas consecutivas, la IA mantiene coherencia
2. CEOChat: Verificar que cerrar/abrir el diálogo NO borra el historial para el mismo documento
3. Brain Galaxy: Verificar que después de analizar un archivo, las siguientes preguntas siguen teniendo contexto del archivo
