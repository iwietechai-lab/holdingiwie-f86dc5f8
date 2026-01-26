import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Rocket, Users, Calendar, Bot } from 'lucide-react';
import { Mission, MISSION_TYPE_CONFIG, MissionType } from '@/types/mision-iwie';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateMissionDialog } from './CreateMissionDialog';

interface MissionsBoardProps {
  missions: Mission[];
  onSelectMission: (mission: Mission) => void;
  onCreateMission: (data: Partial<Mission>, participantIds?: string[]) => Promise<Mission | null>;
  loading?: boolean;
}

export function MissionsBoard({
  missions,
  onSelectMission,
  onCreateMission,
  loading,
}: MissionsBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Filter missions
  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.mission_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeMissions = filteredMissions.filter(m => m.status === 'active');
  const completedMissions = filteredMissions.filter(m => m.status === 'completed');
  const draftMissions = filteredMissions.filter(m => m.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Misiones Colaborativas
          </h2>
          <p className="text-sm text-muted-foreground">
            Proyectos inteligentes con asistencia de IA multi-cerebro
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Misión
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar misiones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(MISSION_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.icon} {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Missions Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Rocket className="w-8 h-8 animate-bounce text-primary" />
        </div>
      ) : filteredMissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No hay misiones aún. ¡Crea tu primera misión colaborativa!
            </p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Crear Misión
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Missions */}
          {activeMissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Misiones Activas ({activeMissions.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onClick={() => onSelectMission(mission)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Draft Missions */}
          {draftMissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Borradores ({draftMissions.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {draftMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onClick={() => onSelectMission(mission)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Missions */}
          {completedMissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Completadas ({completedMissions.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onClick={() => onSelectMission(mission)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Mission Dialog */}
      <CreateMissionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateMission={onCreateMission}
      />
    </div>
  );
}

// Mission Card Component
function MissionCard({ mission, onClick }: { mission: Mission; onClick: () => void }) {
  const typeConfig = MISSION_TYPE_CONFIG[mission.mission_type as MissionType] || MISSION_TYPE_CONFIG.general;
  const participantCount = mission.participants?.length || 0;

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const statusColors = {
    draft: 'bg-gray-500',
    active: 'bg-green-500',
    paused: 'bg-yellow-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-red-500',
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeConfig.icon}</span>
            <Badge
              variant="secondary"
              className={cn('text-xs', priorityColors[mission.priority])}
            >
              {mission.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className={cn('w-2 h-2 rounded-full', statusColors[mission.status])}
            />
            {mission.ai_enabled && (
              <Bot className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>
        <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
          {mission.title}
        </CardTitle>
        {mission.description && (
          <CardDescription className="line-clamp-2">
            {mission.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participantCount}
            </span>
            {mission.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(mission.deadline), 'dd MMM', { locale: es })}
              </span>
            )}
          </div>
          <Badge variant="outline" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
            {typeConfig.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
