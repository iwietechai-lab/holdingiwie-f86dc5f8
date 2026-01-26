
# Plan: CEOChat como "Super YO" - Integración Completa con Misiones y Gestor de Documentos

## Resumen Ejecutivo

Este plan transforma CEOChat en el **cerebro central del CEO** - un sistema integrado que:
1. Recibe documentos finales de todo el holding
2. Se conecta con Misiones Colaborativas para desarrollo de ideas
3. Integra Multi-Brain AI para respuestas elocuentes e imparciales
4. Incluye Dashboard CEO para visualizar documentos por usuario/área/empresa
5. Permite comunicación bidireccional con usuarios (retroalimentación, sugerencias, archivos)

---

## Arquitectura del Sistema Propuesto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE INFORMACIÓN                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐     ┌─────────────────────────┐     ┌────────────────┐
│  MISIONES IWIE       │     │   GESTOR DOCUMENTOS     │     │   USUARIOS     │
│  (Desarrollo ideas)  │     │   (Cada empresa)        │     │   DIRECTOS     │
│                      │     │                         │     │                │
│  idea → plan final   │     │  Incluir CEO → Auto-    │     │  Subir doc     │
│         ↓            │     │  envío a CEOChat        │     │  a CEOChat     │
└──────────┬───────────┘     └───────────┬─────────────┘     └───────┬────────┘
           │                             │                           │
           │  "Exportar a CEOChat"       │  "Notificar CEO"          │
           │                             │                           │
           └─────────────────────────────┼───────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CEOCHAT - SUPER YO                              │
│                                                                              │
│  ┌───────────────┐  ┌───────────────────┐  ┌────────────────────────────┐  │
│  │  MULTI-BRAIN  │  │  MEMORIA HOLDING  │  │  DASHBOARD CEO             │  │
│  │  FUSION AI    │  │  (Documentos +    │  │  - Por usuario             │  │
│  │  4 IAs        │  │   Decisiones)     │  │  - Por área                │  │
│  │  combinadas   │  │                   │  │  - Por empresa             │  │
│  └───────────────┘  └───────────────────┘  └────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  RESPUESTA CEO: Análisis + Resumen + Retroalimentación               │  │
│  │  ↓                                                                    │  │
│  │  Enviar comentarios, sugerencias, documentos de vuelta al usuario    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componente 1: Integración Multi-Brain AI en CEOChat

### Objetivo
Conectar CEOChat a Brain Galaxy Multi-Brain Fusion para respuestas más completas e imparciales.

### Archivos a Modificar
- `supabase/functions/ceo-internal-chat/index.ts`

### Cambios Específicos

**Nueva función para llamar a Brain Galaxy Fusion:**
```typescript
async function callBrainGalaxyFusion(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
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
    
    if (!response.ok) return '';
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Multi-Brain Fusion error:', error);
    return '';
  }
}
```

**Prompt CEO Elocuente:**
```typescript
const CEO_SYSTEM_PROMPT = `Eres Mauricio Ortiz, CEO de IWIE Holding.

🧠 ACCESO A MÚLTIPLES INTELIGENCIAS:
Combinas perspectivas de análisis crítico, razonamiento profundo, 
análisis técnico y síntesis multimodal.

📝 TU ESTILO DE COMUNICACIÓN:
- ELOCUENTE: Escribes con elegancia, claridad y precisión
- GRATO: Tu tono es cercano, motivador y respetuoso
- CONVINCENTE: Tus argumentos son sólidos y bien fundamentados
- IMPARCIAL: Analizas objetivamente, sin favoritismos
- CLARO: Tus respuestas son estructuradas y fáciles de seguir

📊 AL ANALIZAR DOCUMENTOS:
1. RESUMEN EJECUTIVO (3-4 líneas)
2. PUNTOS CLAVE (máximo 5, los más importantes)
3. ANÁLISIS DETALLADO (perspectiva financiera, operativa, estratégica)
4. OPORTUNIDADES DE MEJORA (constructivo, no crítico)
5. RECOMENDACIONES CONCRETAS (acciones específicas)
6. MENSAJE MOTIVADOR (reconocimiento del esfuerzo)

⚠️ REGLAS INQUEBRANTABLES:
- NUNCA incluyas campos JSON (score, feedback) en el texto
- NUNCA seas condescendiente o paternalista
- SIEMPRE sé específico y concreto en las recomendaciones
- SIEMPRE reconoce el trabajo bien hecho antes de sugerir mejoras`;
```

---

## Componente 2: Conexión Gestor Documentos → CEOChat

### Objetivo
Cuando un usuario incluye al CEO en un documento desde el Gestor, automáticamente se envía a CEOChat para revisión.

### Archivos a Modificar
- `src/pages/GestorDocumentos.tsx`
- `src/hooks/useDocumentPermissions.ts`

### Nuevo Flujo
1. Usuario sube documento y selecciona al CEO en permisos
2. Sistema detecta que se incluyó al CEO
3. Automáticamente crea entrada en `ceo_team_submissions`
4. Trigger existente crea notificación en `ceo_pending_reviews`
5. Usuario recibe toast: "El CEO será notificado de tu documento"

### Cambios en `useDocumentPermissions.ts`:
```typescript
// Nueva función para detectar si se incluye al CEO
const CEO_USER_ID = 'uuid-del-ceo'; // O detectar por rol superadmin

const notifyCEOOfDocument = async (
  documentId: string, 
  documentName: string, 
  filePath: string,
  uploaderId: string
) => {
  // Obtener URL del documento
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);
  
  // Crear submission para CEOChat
  const { error } = await supabase
    .from('ceo_team_submissions')
    .insert({
      title: documentName,
      content: `Documento compartido desde Gestor de Documentos de empresa`,
      file_url: urlData.publicUrl,
      file_name: documentName,
      submission_type: 'documento',
      submitted_by: uploaderId,
      notify_ceo: true
    });
  
  if (!error) {
    // Mostrar notificación al usuario
    toast.success('El CEO será notificado de tu documento');
  }
};
```

### Modificación en `grantPermissions`:
```typescript
// Detectar si uno de los usuarios es CEO/superadmin
const ceoIncluded = userIds.some(id => isCEOorSuperadmin(id));
if (ceoIncluded) {
  await notifyCEOOfDocument(documentId, documentName, filePath, user.id);
}
```

---

## Componente 3: Exportar Misión Completada a CEOChat

### Objetivo
Permitir que una misión colaborativa finalizada se exporte como documento formal a CEOChat.

### Archivos a Modificar
- `src/components/mision-iwie/MissionWorkspace.tsx`
- `src/hooks/useMissionWorkspace.ts`

### Nueva Funcionalidad: Botón "Enviar a CEOChat"
Aparece cuando la misión está en estado `completed` o cuando el usuario decide exportar el plan.

### UI en MissionWorkspace:
```typescript
{mission.status === 'completed' && (
  <Button onClick={() => exportToCEOChat(mission)}>
    <Send className="w-4 h-4 mr-2" />
    Enviar Plan Final a CEOChat
  </Button>
)}
```

### Función en useMissionWorkspace:
```typescript
const exportToCEOChat = async (mission: Mission) => {
  // Recopilar todo el contenido de la misión
  const missionReport = generateMissionReport(mission, chatMessages, workspaceState);
  
  const { error } = await supabase
    .from('ceo_team_submissions')
    .insert({
      title: `Plan Final: ${mission.title}`,
      content: missionReport,
      submission_type: 'propuesta',
      submitted_by: mission.creator_id,
      notify_ceo: true,
      project_id: null // O crear proyecto automático
    });
  
  if (!error) {
    toast.success('Plan enviado a CEOChat para revisión del CEO');
  }
};

const generateMissionReport = (mission, messages, state) => {
  return `
# ${mission.title}
## Código: ${mission.project_code || 'N/A'}

### Descripción
${mission.description}

### Desafío Abordado
${mission.challenge_text}

### Participantes
${mission.participants.map(p => `- ${p.user_id}`).join('\n')}

### Conversación y Desarrollo
${messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n')}

### Estado del Workspace
${JSON.stringify(state.panel_data, null, 2)}

### Presupuesto
- Estimado: $${mission.estimated_budget}
- Real: $${mission.actual_budget || 'Por definir'}

### Fecha de Entrega
${mission.target_end_date || 'Por definir'}
  `;
};
```

---

## Componente 4: Dashboard CEO - Vista de Documentos

### Objetivo
Crear un dashboard para el CEO que muestre todos los documentos recibidos, filtrados por usuario, área y empresa.

### Archivos a Crear/Modificar
- `src/pages/CEOChatPage.tsx` (agregar pestaña Dashboard)
- `src/components/ceo/CEODocumentDashboard.tsx` (nuevo componente)

### Estructura del Dashboard:

```typescript
interface CEODashboardProps {
  submissions: CEOTeamSubmission[];
}

export function CEODocumentDashboard({ submissions }: CEODashboardProps) {
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Estadísticas
  const stats = useMemo(() => ({
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pendiente').length,
    reviewed: submissions.filter(s => s.status === 'revisado').length,
    byCompany: groupBy(submissions, 'company_name'),
    byUser: groupBy(submissions, 'submitter_name'),
  }), [submissions]);

  return (
    <div className="space-y-6">
      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Documentos" value={stats.total} />
        <StatCard title="Pendientes" value={stats.pending} color="amber" />
        <StatCard title="Revisados" value={stats.reviewed} color="green" />
        <StatCard title="Esta Semana" value={thisWeekCount} color="blue" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>Por Empresa</CardHeader>
          <PieChart data={stats.byCompany} />
        </Card>
        <Card>
          <CardHeader>Por Usuario</CardHeader>
          <BarChart data={stats.byUser} />
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filterUser} onValueChange={setFilterUser}>...</Select>
        <Select value={filterArea} onValueChange={setFilterArea}>...</Select>
        <Select value={filterCompany} onValueChange={setFilterCompany}>...</Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>...</Select>
      </div>

      {/* Lista de Documentos */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Documento</TableCell>
            <TableCell>Usuario</TableCell>
            <TableCell>Empresa</TableCell>
            <TableCell>Área</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSubmissions.map(sub => (
            <DocumentRow key={sub.id} submission={sub} onAnalyze={...} onRespond={...} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Componente 5: Sistema de Retroalimentación CEO → Usuario

### Objetivo
Permitir que el CEO envíe comentarios, sugerencias y archivos de vuelta al usuario que subió el documento.

### Archivos a Crear/Modificar
- Nueva tabla: `ceo_feedback` (migración SQL)
- `src/components/ceo/CEOFeedbackDialog.tsx` (nuevo)
- `src/hooks/useCEOChat.ts` (agregar funciones)

### Nueva Tabla (Migración SQL):
```sql
CREATE TABLE public.ceo_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ceo_team_submissions(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL, -- CEO
    to_user_id UUID NOT NULL,   -- Usuario original
    feedback_type TEXT DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'suggestion', 'request_changes', 'approved')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para notificar al usuario
CREATE OR REPLACE FUNCTION notify_user_of_ceo_feedback()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        reference_type
    ) VALUES (
        NEW.to_user_id,
        'ceo_feedback',
        'Retroalimentación del CEO',
        NEW.message,
        NEW.id,
        'ceo_feedback'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ceo_feedback_notification
AFTER INSERT ON public.ceo_feedback
FOR EACH ROW
EXECUTE FUNCTION notify_user_of_ceo_feedback();
```

### UI del Dialog de Retroalimentación:
```typescript
export function CEOFeedbackDialog({ submission, open, onOpenChange }: Props) {
  const [feedbackType, setFeedbackType] = useState<'comment' | 'suggestion' | 'request_changes' | 'approved'>('comment');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = async () => {
    // Subir archivos adjuntos
    const uploadedAttachments = await uploadAttachments(attachments);
    
    // Crear feedback
    await supabase.from('ceo_feedback').insert({
      submission_id: submission.id,
      from_user_id: currentUserId,
      to_user_id: submission.submitted_by,
      feedback_type: feedbackType,
      message: message,
      attachments: uploadedAttachments
    });
    
    // Actualizar estado del documento si es aprobado
    if (feedbackType === 'approved') {
      await supabase.from('ceo_team_submissions')
        .update({ status: 'revisado', ceo_reviewed_at: new Date().toISOString() })
        .eq('id', submission.id);
    }
    
    toast.success('Retroalimentación enviada al usuario');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Responder a: {submission.title}</DialogTitle>
          <DialogDescription>
            Enviado por: {submission.submitter_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={feedbackType} onValueChange={setFeedbackType}>
            <SelectItem value="comment">Comentario</SelectItem>
            <SelectItem value="suggestion">Sugerencia</SelectItem>
            <SelectItem value="request_changes">Solicitar Cambios</SelectItem>
            <SelectItem value="approved">Aprobar Documento</SelectItem>
          </Select>

          <Textarea 
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Escribe tu retroalimentación..."
          />

          <div>
            <Label>Adjuntar archivos (documentos, links, referencias)</Label>
            <Input type="file" multiple onChange={handleFileSelect} />
            {attachments.map(f => <Badge key={f.name}>{f.name}</Badge>)}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSend}>
            <Send className="w-4 h-4 mr-2" />
            Enviar Retroalimentación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Componente 6: Vista de Retroalimentación para Usuarios

### Objetivo
Los usuarios pueden ver los comentarios del CEO en sus documentos enviados.

### Modificación en CEOChatPage (sección Mis Documentos):
```typescript
// Agregar indicador de retroalimentación en cada documento
{sub.has_feedback && (
  <Badge variant="outline" className="bg-green-500/20 text-green-400">
    <MessageSquare className="w-3 h-3 mr-1" />
    Respuesta del CEO
  </Badge>
)}

<Button size="sm" variant="ghost" onClick={() => viewFeedback(sub)}>
  Ver Comentarios
</Button>
```

### Nuevo Dialog para ver feedback:
```typescript
export function ViewFeedbackDialog({ submissionId, open, onOpenChange }) {
  const { data: feedback } = useQuery(['feedback', submissionId], () =>
    supabase.from('ceo_feedback').select('*').eq('submission_id', submissionId)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comentarios del CEO</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          {feedback?.map(fb => (
            <div key={fb.id} className="p-4 rounded-lg bg-muted mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Avatar><AvatarImage src={ceoAvatar} /></Avatar>
                <div>
                  <p className="font-medium">Mauricio Ortiz</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(fb.created_at))}
                  </p>
                </div>
                <Badge>{fb.feedback_type}</Badge>
              </div>
              <MarkdownRenderer content={fb.message} />
              
              {fb.attachments?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {fb.attachments.map(att => (
                    <Button key={att.url} variant="outline" size="sm" asChild>
                      <a href={att.url} target="_blank">
                        <FileText className="w-3 h-3 mr-1" />
                        {att.name}
                      </a>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Resumen de Archivos a Crear/Modificar

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `supabase/functions/ceo-internal-chat/index.ts` | Modificar | Integrar Multi-Brain Fusion, mejorar prompts CEO |
| `src/pages/GestorDocumentos.tsx` | Modificar | Detectar inclusión CEO y enviar a CEOChat |
| `src/hooks/useDocumentPermissions.ts` | Modificar | Agregar función `notifyCEOOfDocument` |
| `src/components/mision-iwie/MissionWorkspace.tsx` | Modificar | Botón "Exportar a CEOChat" |
| `src/hooks/useMissionWorkspace.ts` | Modificar | Función `exportToCEOChat` |
| `src/pages/CEOChatPage.tsx` | Modificar | Agregar pestaña Dashboard, mejorar UI |
| `src/components/ceo/CEODocumentDashboard.tsx` | Crear | Dashboard con filtros y gráficos |
| `src/components/ceo/CEOFeedbackDialog.tsx` | Crear | Dialog para enviar retroalimentación |
| `src/components/ceo/ViewFeedbackDialog.tsx` | Crear | Dialog para ver comentarios del CEO |
| `supabase/migrations/xxx_ceo_feedback.sql` | Crear | Tabla ceo_feedback y triggers |

---

## Beneficios del Sistema Completo

1. **Centralización**: Todo llega a CEOChat - misiones completadas, documentos de gestores, submissions directos
2. **Multi-Brain AI**: Respuestas más completas, imparciales y elocuentes
3. **Bidireccionalidad**: CEO puede responder con comentarios, sugerencias y archivos
4. **Trazabilidad**: Dashboard con filtros por usuario/área/empresa
5. **Notificaciones**: Usuarios reciben avisos cuando el CEO responde
6. **Memoria**: Todo se almacena en historial y memoria colectiva del holding
