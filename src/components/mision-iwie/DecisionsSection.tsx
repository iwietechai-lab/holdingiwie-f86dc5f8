import React, { useState } from 'react';
import { MisionDecision, MisionTask } from '@/hooks/useMisionIwie';
import { DECISION_CATEGORY_CONFIG, ENERGY_EMOJIS, RESULT_TYPE_CONFIG, DecisionCategory, ResultType } from '@/types/mision-iwie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Target, 
  Link2, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DecisionsSectionProps {
  decisions: MisionDecision[];
  tasks: MisionTask[];
  onCreateDecision: (decision: Partial<MisionDecision>) => Promise<MisionDecision | null>;
  onUpdateDecision: (id: string, updates: Partial<MisionDecision>) => Promise<MisionDecision | null>;
  onCompleteDecision: (id: string, resultType?: ResultType, detail?: string) => Promise<void>;
  onLinkTask: (decisionId: string, taskId: string) => Promise<void>;
  onSetFocusMission: (type: 'decision', id: string, data: { description: string; solution: string }) => Promise<void>;
}

export function DecisionsSection({
  decisions,
  tasks,
  onCreateDecision,
  onUpdateDecision,
  onCompleteDecision,
  onLinkTask,
  onSetFocusMission,
}: DecisionsSectionProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<MisionDecision | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DecisionCategory>('important');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [risks, setRisks] = useState('');
  const [energyLevel, setEnergyLevel] = useState<number | undefined>();
  
  // Result states
  const [resultType, setResultType] = useState<ResultType | undefined>();
  const [resultDetail, setResultDetail] = useState('');
  const [resultQuantitative, setResultQuantitative] = useState('');
  
  // Focus states
  const [focusDescription, setFocusDescription] = useState('');
  const [focusSolution, setFocusSolution] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('important');
    setExpectedImpact('');
    setRisks('');
    setEnergyLevel(undefined);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    await onCreateDecision({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      expected_impact: expectedImpact.trim() || undefined,
      associated_risks: risks.trim() || undefined,
      energy_level: energyLevel,
      date_for: new Date().toISOString().split('T')[0],
    });
    
    resetForm();
    setCreateDialogOpen(false);
  };

  const handleComplete = async () => {
    if (!selectedDecision) return;
    
    await onCompleteDecision(
      selectedDecision.id, 
      resultType, 
      resultDetail.trim() || undefined
    );
    
    if (resultType && resultQuantitative) {
      await onUpdateDecision(selectedDecision.id, {
        real_result_quantitative: parseFloat(resultQuantitative)
      });
    }
    
    setResultDialogOpen(false);
    setSelectedDecision(null);
    setResultType(undefined);
    setResultDetail('');
    setResultQuantitative('');
  };

  const handleSetFocus = async () => {
    if (!selectedDecision || !focusSolution.trim()) return;
    
    await onSetFocusMission('decision', selectedDecision.id, {
      description: focusDescription,
      solution: focusSolution,
    });
    
    setFocusDialogOpen(false);
    setSelectedDecision(null);
    setFocusDescription('');
    setFocusSolution('');
  };

  const openResultDialog = (decision: MisionDecision) => {
    setSelectedDecision(decision);
    setResultDialogOpen(true);
  };

  const openFocusDialog = (decision: MisionDecision) => {
    setSelectedDecision(decision);
    setFocusDescription(decision.focus_description || '');
    setFocusSolution(decision.focus_solution || '');
    setFocusDialogOpen(true);
  };

  const openLinkDialog = (decision: MisionDecision) => {
    setSelectedDecision(decision);
    setLinkDialogOpen(true);
  };

  const pendingDecisions = decisions.filter(d => !d.completed_at);
  const completedDecisions = decisions.filter(d => d.completed_at);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Toma de Decisiones
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Documenta y rastrea tus decisiones importantes
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Decisión
        </Button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(DECISION_CATEGORY_CONFIG) as DecisionCategory[]).map(cat => {
          const config = DECISION_CATEGORY_CONFIG[cat];
          const catDecisions = pendingDecisions.filter(d => d.category === cat);
          
          return (
            <Card 
              key={cat} 
              className="border-l-4"
              style={{ borderLeftColor: config.color }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    {config.label}
                  </span>
                  <Badge variant="secondary">{catDecisions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {catDecisions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sin decisiones pendientes
                  </p>
                ) : (
                  catDecisions.slice(0, 3).map(decision => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      onComplete={() => openResultDialog(decision)}
                      onSetFocus={() => openFocusDialog(decision)}
                      onLinkTask={() => openLinkDialog(decision)}
                    />
                  ))
                )}
                {catDecisions.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{catDecisions.length - 3} más
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completed Decisions */}
      {completedDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Decisiones Ejecutadas ({completedDecisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedDecisions.slice(0, 6).map(decision => (
                <CompletedDecisionCard key={decision.id} decision={decision} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Decision Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Nueva Decisión
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título/Rol de la decisión *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="¿Qué decisión estás tomando?"
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as DecisionCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DECISION_CATEGORY_CONFIG) as DecisionCategory[]).map(cat => {
                    const config = DECISION_CATEGORY_CONFIG[cat];
                    return (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          {config.icon} {config.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto de la decisión..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Impacto esperado</Label>
              <Textarea
                value={expectedImpact}
                onChange={(e) => setExpectedImpact(e.target.value)}
                placeholder="¿Qué resultados esperas obtener?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Riesgos asociados</Label>
              <Textarea
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                placeholder="¿Qué podría salir mal?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Tu energía/estado de ánimo</Label>
              <div className="flex justify-center gap-3">
                {ENERGY_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setEnergyLevel(index + 1)}
                    className={cn(
                      "text-2xl p-2 rounded-lg transition-all hover:scale-110",
                      energyLevel === index + 1 
                        ? "bg-primary/20 ring-2 ring-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!title.trim()}>
              📍 Registrar Decisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resultado de la Decisión
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="font-medium">{selectedDecision?.title}</p>
            
            <div className="space-y-2">
              <Label>Tipo de resultado</Label>
              <div className="flex gap-2">
                {(Object.keys(RESULT_TYPE_CONFIG) as ResultType[]).map(type => {
                  const config = RESULT_TYPE_CONFIG[type];
                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={resultType === type ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setResultType(type)}
                    >
                      {config.icon} {config.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Detalle del resultado</Label>
              <Textarea
                value={resultDetail}
                onChange={(e) => setResultDetail(e.target.value)}
                placeholder="¿Qué ocurrió realmente?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Impacto cuantitativo (opcional)</Label>
              <Input
                type="number"
                value={resultQuantitative}
                onChange={(e) => setResultQuantitative(e.target.value)}
                placeholder="Ej: 5000 (ventas), -10 (pérdida)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleComplete}>
              ✅ Completar Decisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Task Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Vincular Tareas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {tasks.filter(t => t.status !== 'completed').map(task => (
              <button
                key={task.id}
                onClick={() => {
                  if (selectedDecision) {
                    onLinkTask(selectedDecision.id, task.id);
                  }
                }}
                className="w-full p-3 text-left rounded-lg border hover:bg-muted transition-colors"
              >
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.area?.name || 'Sin área'}
                </p>
              </button>
            ))}
            {tasks.filter(t => t.status !== 'completed').length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay tareas pendientes para vincular
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Focus Dialog */}
      <Dialog open={focusDialogOpen} onOpenChange={setFocusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Activar Modo Focus
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción detallada</Label>
              <Textarea
                value={focusDescription}
                onChange={(e) => setFocusDescription(e.target.value)}
                placeholder="¿Qué quieres lograr con esta decisión?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>¿Qué solución o idea estás desarrollando? *</Label>
              <Textarea
                value={focusSolution}
                onChange={(e) => setFocusSolution(e.target.value)}
                placeholder="Describe tu enfoque..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFocusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetFocus} disabled={!focusSolution.trim()}>
              🎯 Activar Focus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DecisionCard({ 
  decision, 
  onComplete, 
  onSetFocus, 
  onLinkTask 
}: { 
  decision: MisionDecision; 
  onComplete: () => void;
  onSetFocus: () => void;
  onLinkTask: () => void;
}) {
  const config = DECISION_CATEGORY_CONFIG[decision.category];

  return (
    <div className={cn(
      "p-3 rounded-lg border bg-card hover:shadow-sm transition-all",
      decision.is_focus_mission && "ring-2 ring-primary bg-primary/5"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {decision.is_focus_mission && (
            <Badge variant="default" className="mb-1 gap-1 bg-primary text-xs">
              <Target className="w-3 h-3" />
              Focus
            </Badge>
          )}
          <p className="font-medium text-sm">{decision.title}</p>
          {decision.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {decision.description}
            </p>
          )}
          {decision.energy_level && (
            <span className="text-sm mt-1 inline-block">
              {ENERGY_EMOJIS[decision.energy_level - 1]}
            </span>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLinkTask}>
              <Link2 className="w-4 h-4 mr-2" />
              Vincular Tarea
            </DropdownMenuItem>
            {!decision.is_focus_mission && (
              <DropdownMenuItem onClick={onSetFocus}>
                <Target className="w-4 h-4 mr-2" />
                Modo Focus
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CompletedDecisionCard({ decision }: { decision: MisionDecision }) {
  const config = DECISION_CATEGORY_CONFIG[decision.category];
  const resultConfig = decision.real_result_type ? RESULT_TYPE_CONFIG[decision.real_result_type] : null;

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 mb-1">
        <span>{config.icon}</span>
        {resultConfig && (
          <Badge 
            variant="outline" 
            className={cn("text-xs", resultConfig.color)}
          >
            {resultConfig.icon} {resultConfig.label}
          </Badge>
        )}
      </div>
      <p className="font-medium text-sm line-through text-muted-foreground">
        {decision.title}
      </p>
      {decision.real_result_detail && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {decision.real_result_detail}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {decision.completed_at && format(new Date(decision.completed_at), "d MMM", { locale: es })}
      </p>
    </div>
  );
}
