import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mission, MISSION_TYPE_CONFIG, MissionType } from '@/types/mision-iwie';
import { Rocket, Bot, Calendar, DollarSign } from 'lucide-react';

interface CreateMissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateMission: (data: Partial<Mission>) => Promise<Mission | null>;
}

export function CreateMissionDialog({
  open,
  onOpenChange,
  onCreateMission,
}: CreateMissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mission_type: 'general' as MissionType,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    ai_enabled: true,
    ai_intervention_level: 'proactive' as 'passive' | 'reactive' | 'proactive',
    estimated_budget: '',
    target_end_date: '',
    visibility: 'private' as 'private' | 'team' | 'company' | 'public',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const result = await onCreateMission({
        title: formData.title,
        description: formData.description,
        challenge_text: formData.description,
        mission_type: formData.mission_type,
        priority: formData.priority,
        ai_enabled: formData.ai_enabled,
        ai_intervention_level: formData.ai_intervention_level,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : undefined,
        target_end_date: formData.target_end_date || undefined,
        visibility: formData.visibility,
      });

      if (result) {
        onOpenChange(false);
        setFormData({
          title: '',
          description: '',
          mission_type: 'general',
          priority: 'medium',
          ai_enabled: true,
          ai_intervention_level: 'proactive',
          estimated_budget: '',
          target_end_date: '',
          visibility: 'private',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Nueva Misión Colaborativa
          </DialogTitle>
          <DialogDescription>
            Crea una misión con asistencia de IA multi-cerebro para tu proyecto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Misión *</Label>
            <Input
              id="title"
              placeholder="Ej: Diseño de sistema de propulsión para satélite"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe el objetivo y alcance de la misión..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Mission Type */}
            <div className="space-y-2">
              <Label>Tipo de Misión</Label>
              <Select
                value={formData.mission_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, mission_type: v as MissionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MISSION_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baja</SelectItem>
                  <SelectItem value="medium">🔵 Media</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="critical">🔴 Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI Settings */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <Label htmlFor="ai_enabled" className="font-medium">Asistencia de IA</Label>
              </div>
              <Switch
                id="ai_enabled"
                checked={formData.ai_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_enabled: checked }))}
              />
            </div>

            {formData.ai_enabled && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Nivel de Intervención</Label>
                <Select
                  value={formData.ai_intervention_level}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, ai_intervention_level: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passive">
                      <span className="flex flex-col">
                        <span>🔇 Pasivo</span>
                        <span className="text-xs text-muted-foreground">Solo responde cuando se le pregunta</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="reactive">
                      <span className="flex flex-col">
                        <span>💬 Reactivo</span>
                        <span className="text-xs text-muted-foreground">Sugiere cuando detecta oportunidades</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="proactive">
                      <span className="flex flex-col">
                        <span>🚀 Proactivo</span>
                        <span className="text-xs text-muted-foreground">Participa activamente en la conversación</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Presupuesto Estimado
              </Label>
              <Input
                id="budget"
                type="number"
                placeholder="USD"
                value={formData.estimated_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_budget: e.target.value }))}
              />
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="target_date" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fecha Objetivo
              </Label>
              <Input
                id="target_date"
                type="date"
                value={formData.target_end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_end_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibilidad</Label>
            <Select
              value={formData.visibility}
              onValueChange={(v) => setFormData(prev => ({ ...prev, visibility: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">🔒 Privada - Solo tú</SelectItem>
                <SelectItem value="team">👥 Equipo - Participantes invitados</SelectItem>
                <SelectItem value="company">🏢 Empresa - Toda la organización</SelectItem>
                <SelectItem value="public">🌍 Pública - Visible para todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? 'Creando...' : 'Crear Misión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
