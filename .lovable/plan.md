
# Problema: Brain Galaxy sin datos en tiempo real (datos limitados a 2023)

## Diagnóstico del problema

Los modelos de IA que usa Brain Galaxy (Grok, GPT-4o, DeepSeek, Gemini) tienen una **fecha de corte de entrenamiento** ("knowledge cutoff") que varía entre modelos:

- Grok (grok-beta): conocimiento hasta ~2023
- GPT-4o: hasta ~2023
- DeepSeek Chat: hasta ~2023
- Gemini 2.5 Flash: hasta principios de 2024

Esto significa que cuando se pregunta "¿cómo está el mercado de drones en 2026?" o "¿qué pasó con el precio del cobre esta semana?", los modelos responden con datos desactualizados porque **no tienen acceso a internet en tiempo real**.

La solución correcta no es cambiar de modelo (todos tienen este límite), sino **agregar búsqueda web en tiempo real** antes de que la IA responda.

El proyecto ya tiene **Firecrawl conectado** (se detectó `FIRECRAWL_API_KEY` configurada), que incluye capacidad de búsqueda web en tiempo real.

---

## Solución: Motor de búsqueda web en tiempo real para Brain Galaxy

Se añadirá un sistema de **Web Search Augmentation** (búsqueda aumentada) que:

1. Detecta cuando el usuario hace una pregunta que requiere información actual
2. Busca en la web con Firecrawl Search en tiempo real
3. Inyecta esos resultados frescos como contexto antes de que la IA genere la respuesta
4. La IA responde usando datos de hoy, no de 2023

---

## Arquitectura del flujo

```text
Usuario pregunta sobre mercado/tendencias/precios/eventos 2026
         ↓
brain-galaxy-ai detecta que la consulta requiere info actual
         ↓
Llama a Firecrawl Search → Devuelve artículos web actuales (2026)
         ↓
Los resultados se inyectan como contexto en el system prompt
         ↓
Multi-Brain Fusion responde con datos del presente
         ↓
La respuesta indica las fuentes web consultadas
```

---

## Cambios técnicos

### 1. Modificar `supabase/functions/brain-galaxy-ai/index.ts`

- Agregar función `searchWebForContext(query)` que usa Firecrawl Search para buscar los últimos artículos y noticias relevantes
- Agregar función `needsWebSearch(message)` que detecta palabras clave como: precio, mercado, tendencia, 2025, 2026, actualidad, hoy, reciente, últimas noticias, industria actual, estadísticas, etc.
- Si la detección es positiva, ejecutar búsqueda web **antes** de llamar a los modelos
- Inyectar los resultados web como contexto adicional en el `systemPrompt`
- Incluir las fuentes encontradas en la respuesta

### 2. Agregar búsqueda web también en el Studio Builder

- En `supabase/functions/brain-galaxy-ai/index.ts`, en el modo `studio`, ejecutar búsqueda web de fuentes reales
- Las fuentes encontradas se mostrarán al usuario como recursos disponibles

### 3. Indicador visual de "búsqueda en curso"

- Mostrar al usuario cuando la IA está consultando la web antes de responder ("🔍 Buscando información actualizada...")
- Indicar en la respuesta que contiene datos en tiempo real con fuentes verificables

---

## Palabras clave que activarán búsqueda web

El sistema detectará automáticamente si la consulta necesita datos en tiempo real cuando contenga:

- Términos temporales: `hoy`, `ahora`, `actualmente`, `2025`, `2026`, `este año`, `este mes`, `reciente`, `últimas`, `nuevo`
- Términos de mercado: `precio`, `mercado`, `tendencia`, `industria`, `sector`, `estadística`, `dato`, `cifra`, `crecimiento`, `proyección`
- Tipos de consulta: `¿cuánto vale?`, `¿cómo está?`, `noticias`, `novedades`, `situación actual`

---

## Resultado esperado

Antes (actual):
> "El mercado de drones en Chile... según datos de 2022-2023..."

Después (con la mejora):
> "🌐 Fuentes web consultadas (Feb 2026): [artículo1] [artículo2]
> Según información actualizada de febrero 2026, el mercado de drones en Chile..."
