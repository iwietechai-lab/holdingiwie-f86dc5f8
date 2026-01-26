import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useMissions } from '@/hooks/useMissions';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { MissionsBoard } from '@/components/mision-iwie/MissionsBoard';
import { MissionWorkspace } from '@/components/mision-iwie/MissionWorkspace';
import { Rocket, Users, Brain, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Mission } from '@/types/mision-iwie';

export default function MisionIwiePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useSupabaseAuth();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  
  const {
    missions,
    loading,
    createMission,
    updateMission,
    deleteMission,
  } = useMissions();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Loading state
  if (authLoading || loading) {
    return (
      <ResponsiveLayout selectedCompany={null} onSelectCompany={() => {}}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 animate-bounce text-primary" />
            <p className="text-muted-foreground">Preparando tu centro de misiones...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  // If a mission is selected, show the workspace
  if (selectedMission) {
    return (
      <ResponsiveLayout selectedCompany={null} onSelectCompany={() => {}}>
        <MissionWorkspace
          mission={selectedMission}
          onBack={() => setSelectedMission(null)}
        />
      </ResponsiveLayout>
    );
  }

  // Otherwise, show the missions board
  return (
    <ResponsiveLayout selectedCompany={null} onSelectCompany={() => {}}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl">
              <Rocket className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Centro de Misiones Colaborativas</h1>
              <p className="text-muted-foreground text-sm">
                Proyectos inteligentes con asistencia Multi-Brain
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2 py-1.5 px-3">
              <Users className="w-4 h-4" />
              <span>{missions.length} {missions.length === 1 ? 'misión' : 'misiones'}</span>
            </Badge>
            <Badge variant="secondary" className="gap-2 py-1.5 px-3">
              <Brain className="w-4 h-4" />
              <span>Multi-Brain IA</span>
            </Badge>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Chat con Multi-Brain IA</p>
              <p className="text-xs text-muted-foreground">Asistencia inteligente especializada</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Paneles Contextuales</p>
              <p className="text-xs text-muted-foreground">Se adaptan según la conversación</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Colaboración en Tiempo Real</p>
              <p className="text-xs text-muted-foreground">Trabaja con tu equipo</p>
            </div>
          </div>
        </div>

        {/* Missions Board */}
        <MissionsBoard
          missions={missions}
          onSelectMission={setSelectedMission}
          onCreateMission={createMission}
          loading={loading}
        />
      </div>
    </ResponsiveLayout>
  );
}
