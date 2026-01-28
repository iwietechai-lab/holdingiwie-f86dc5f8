
# Plan: Solucionar Problemas de Brain Galaxy Studio

## Resumen de Problemas Reportados

El usuario reportó 5 problemas específicos con Brain Galaxy Studio:

1. **Cursos en borrador no se pueden editar** - Al hacer clic sobre un curso existente, no pasa nada
2. **Studio no guarda la información** - Al cambiar de ventana o salir, se pierde todo el trabajo
3. **El historial de Studio no registra nada** - No hay persistencia de sesiones
4. **Los cursos solo generan temario** - No genera contenido desarrollado, solo estructura
5. **La UI se bloquea al crear video** - Después de pedir un video, la interfaz deja de responder

---

## Diagnóstico Técnico

### Problema 1: Cursos No Clickeables

**Ubicación:** `src/components/brain-galaxy/BrainGalaxyDashboard.tsx` (líneas 181-198)

**Causa:** El `div` que renderiza cada curso NO tiene `onClick` ni ningún handler interactivo:

```typescript
<div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
  <div>
    <p className="font-medium">{course.title}</p>
    // ... badges
  </div>
  <Badge>...</Badge>
</div>
// ⚠️ NO HAY onClick, cursor-pointer, ni ninguna acción
```

**Solución:** Agregar prop `onViewCourse` y hacer los items clickeables.

---

### Problema 2 y 3: Studio No Guarda y el Historial No Funciona

**Ubicación:** `src/components/brain-galaxy/studio/StudioBuilder.tsx` (líneas 102-104)

**Causa:** El historial de Studio usa estado LOCAL en memoria (`useState`):

```typescript
const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
const [createdCourses, setCreatedCourses] = useState<CreatedCourse[]>([]);
```

Este estado se pierde completamente al:
- Cambiar de pestaña (de Studio a Dashboard)
- Refrescar la página
- Cerrar el navegador

**Contraste con Chat IA:** El Chat IA SÍ funciona porque usa `brain_galaxy_chat_sessions` en la base de datos a través de `useBrainGalaxy` hook.

**Solución:** Crear una tabla `brain_galaxy_studio_sessions` y persistir las sesiones de Studio en la base de datos.

---

### Problema 4: Cursos Solo Generan Temario

**Ubicación:** `src/components/brain-galaxy/studio/StudioBuilder.tsx` (líneas 186-261)

**Causa:** Los prompts del sistema para creación de cursos piden una estructura JSON que solo incluye:
- Título
- Descripción  
- Módulos (título, descripción, topics)
- Fuentes

Pero NO piden **contenido desarrollado** para cada módulo. El prompt dice:

```typescript
"modules": [
  {
    "title": "Módulo 1: Nombre",
    "description": "Qué aprenderá",
    "topics": ["Tema 1", "Tema 2"]
  }
]
```

Esto genera solo el temario. Para generar contenido desarrollado, se necesita un segundo paso que llame a la IA para expandir cada módulo.

**Solución:** Agregar un flujo de dos pasos:
1. Generar estructura/temario
2. Generar contenido detallado de cada módulo (bajo demanda o automático)

---

### Problema 5: UI Se Bloquea al Crear Video

**Ubicación:** `src/components/brain-galaxy/studio/StudioBuilder.tsx` (líneas 437-535)

**Causa:** La función `generateOutput` maneja todos los tipos de herramientas incluyendo `video-summary`. El problema es que:

1. El estado `isGenerating` se pone en `true`
2. Si la API falla o tarda mucho, no hay timeout
3. No hay manejo de error que libere el estado
4. Los botones quedan `disabled` indefinidamente

```typescript
setIsGenerating(true);
setGeneratingTool(toolType);
try {
  // ... llamada API sin timeout
} catch (error) {
  // Solo toast.error, pero...
} finally {
  setIsGenerating(false);  // Si nunca llega aquí, la UI queda bloqueada
}
```

**Solución:** Agregar timeout, mejor manejo de errores, y botón de cancelación.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/brain-galaxy/BrainGalaxyDashboard.tsx` | Agregar `onViewCourse` prop y hacer cursos clickeables |
| `src/pages/BrainGalaxyPage.tsx` | Agregar handler para abrir curso en modo edición |
| `src/components/brain-galaxy/studio/StudioBuilder.tsx` | 1. Persistir sesiones en DB 2. Agregar generación de contenido 3. Agregar timeout y cancelación |
| `src/hooks/useBrainGalaxy.ts` | Agregar funciones para sesiones de Studio |
| Nueva migración SQL | Crear tabla `brain_galaxy_studio_sessions` |

---

## Solución Detallada

### Cambio 1: Cursos Clickeables en Dashboard

```typescript
// BrainGalaxyDashboard.tsx - Agregar prop
interface BrainGalaxyDashboardProps {
  // ... existing props
  onViewCourse?: (course: BrainGalaxyCourse) => void;
}

// Hacer curso clickeable
<div 
  key={course.id} 
  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
  onClick={() => onViewCourse?.(course)}
>
```

### Cambio 2: Crear Tabla para Sesiones de Studio

```sql
CREATE TABLE brain_galaxy_studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT 'Nueva sesión',
  mode TEXT NOT NULL DEFAULT 'studio', -- 'studio' | 'ai' | 'manual'
  messages JSONB DEFAULT '[]',
  sources JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  course_proposal JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brain_galaxy_studio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own studio sessions"
  ON brain_galaxy_studio_sessions
  FOR ALL USING (auth.uid() = user_id);
```

### Cambio 3: Persistir Sesiones en StudioBuilder

```typescript
// Agregar auto-guardado cada vez que cambia el estado
useEffect(() => {
  if (sessionId && chatMessages.length > 0) {
    saveStudioSession(sessionId, {
      messages: chatMessages,
      sources,
      outputs,
      courseProposal,
      mode: creationMode,
    });
  }
}, [chatMessages, sources, outputs, courseProposal]);
```

### Cambio 4: Generar Contenido Desarrollado

Agregar un segundo paso después de generar la propuesta:

```typescript
const generateModuleContent = async (module: Module, index: number) => {
  const response = await fetch(BRAIN_GALAXY_AI_URL, {
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `Desarrolla el contenido completo del módulo "${module.title}". Incluye:
          - Introducción (2-3 párrafos)
          - Conceptos clave con explicaciones detalladas
          - Ejemplos prácticos
          - Actividades de aprendizaje
          - Recursos complementarios
          - Evaluación del módulo` 
        },
        { role: 'user', content: `Módulo: ${module.title}\nDescripción: ${module.description}\nTemas: ${module.topics.join(', ')}` }
      ],
    }),
  });
  // ... procesar respuesta
};
```

### Cambio 5: Timeout y Cancelación para Generación

```typescript
const [abortController, setAbortController] = useState<AbortController | null>(null);

const generateOutput = async (toolType: StudioToolType) => {
  const controller = new AbortController();
  setAbortController(controller);
  
  // Timeout de 60 segundos
  const timeoutId = setTimeout(() => {
    controller.abort();
    toast.error('La generación tardó demasiado. Intenta de nuevo.');
  }, 60000);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // ...
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      toast.info('Generación cancelada');
    }
  } finally {
    clearTimeout(timeoutId);
    setAbortController(null);
    setIsGenerating(false);
  }
};

// Botón de cancelar
{isGenerating && (
  <Button variant="destructive" onClick={() => abortController?.abort()}>
    Cancelar
  </Button>
)}
```

---

## Flujo de Usuario Después de los Cambios

### Cursos Editables:
1. Usuario va a Dashboard
2. Ve su curso "De Cero a Dronero" en estado Borrador
3. Hace clic en el curso
4. Se abre Studio con el curso cargado para edición
5. Puede modificar módulos, agregar contenido, publicar

### Studio con Persistencia:
1. Usuario abre Studio y comienza a crear curso
2. Cada cambio se guarda automáticamente en la base de datos
3. Usuario sale de la plataforma
4. Al volver, abre "Historial" y ve sus sesiones guardadas
5. Puede continuar donde lo dejó

### Contenido Desarrollado:
1. Usuario crea propuesta de curso
2. Sistema genera estructura con módulos
3. Usuario hace clic en "Desarrollar contenido" (nuevo botón)
4. Sistema genera contenido completo para cada módulo
5. Usuario puede editar y personalizar

### Generación Sin Bloqueo:
1. Usuario hace clic en "Video"
2. Aparece loader con botón "Cancelar"
3. Si tarda más de 60 segundos, se cancela automáticamente
4. Usuario puede cancelar manualmente en cualquier momento
5. La UI nunca queda bloqueada

---

## Orden de Implementación

1. **Migración SQL** - Crear tabla `brain_galaxy_studio_sessions`
2. **useBrainGalaxy.ts** - Agregar funciones CRUD para sesiones de Studio
3. **StudioBuilder.tsx** - Integrar persistencia y auto-guardado
4. **BrainGalaxyDashboard.tsx** - Hacer cursos clickeables
5. **BrainGalaxyPage.tsx** - Agregar handler para editar cursos
6. **StudioBuilder.tsx** - Agregar generación de contenido detallado
7. **StudioBuilder.tsx** - Agregar timeout y cancelación

---

## Validación

Después de implementar:

1. Crear un curso en Studio, cambiar de pestaña, volver - el trabajo debe persistir
2. Salir de la plataforma, volver, abrir historial - las sesiones deben estar guardadas
3. Hacer clic en un curso borrador en Dashboard - debe abrir el editor
4. Generar contenido - debe incluir desarrollo detallado, no solo temario
5. Intentar generar video y cancelar - la UI no debe bloquearse
