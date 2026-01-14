import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Settings,
  Plus,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState as useReactState } from 'react';

export default function OrganizationStructure() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { companies, isSuperadmin } = useSuperadmin();
  const {
    gerencias,
    isLoading,
    fetchByCompany,
    getSubGerenciasByGerencia,
    getAreasByGerencia,
    getPositionsByGerencia,
  } = useOrganization();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [expandedGerencias, setExpandedGerencias] = useReactState<Set<string>>(new Set());
  const [filterCompany, setFilterCompany] = useReactState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const companyId = filterCompany || profile?.company_id;
    if (companyId) {
      fetchByCompany(companyId);
    }
  }, [filterCompany, profile, fetchByCompany]);

  const toggleGerencia = (gerenciaId: string) => {
    setExpandedGerencias(prev => {
      const next = new Set(prev);
      if (next.has(gerenciaId)) {
        next.delete(gerenciaId);
      } else {
        next.add(gerenciaId);
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Building2 className="w-8 h-8 text-primary" />
                Estructura Organizacional
              </h1>
              <p className="text-muted-foreground">
                Visualiza la jerarquía completa de gerencias, áreas y posiciones
              </p>
            </div>

            {isSuperadmin && (
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <span className="flex items-center gap-2">
                        <span>{company.icon || '🏢'}</span>
                        {company.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </header>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{gerencias.length}</p>
                    <p className="text-xs text-muted-foreground">Gerencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Tree */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Estructura Jerárquica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : gerencias.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay estructura organizacional definida</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gerencias.map((gerencia) => {
                    const isExpanded = expandedGerencias.has(gerencia.id);
                    const subGerencias = getSubGerenciasByGerencia(gerencia.id);
                    const areas = getAreasByGerencia(gerencia.id);
                    const positions = getPositionsByGerencia(gerencia.id);

                    return (
                      <Collapsible
                        key={gerencia.id}
                        open={isExpanded}
                        onOpenChange={() => toggleGerencia(gerencia.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <Briefcase className="w-5 h-5 text-primary" />
                            <span className="font-semibold text-foreground flex-1">
                              {gerencia.name}
                            </span>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {subGerencias.length} Sub-gerencias
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {areas.length} Áreas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {positions.length} Posiciones
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-8 mt-2 space-y-4 border-l-2 border-border pl-4">
                            {/* Sub-gerencias */}
                            {subGerencias.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                  Sub-cargos Gerenciales
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {subGerencias.map((sg) => (
                                    <Badge
                                      key={sg.id}
                                      variant="outline"
                                      className="bg-purple-500/10 text-purple-400 border-purple-500/30"
                                    >
                                      {sg.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Areas */}
                            {areas.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                  Áreas
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {areas.map((area) => (
                                    <Badge
                                      key={area.id}
                                      variant="outline"
                                      className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                                    >
                                      {area.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Positions */}
                            {positions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                  Roles Operacionales
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {positions.map((pos) => (
                                    <Badge
                                      key={pos.id}
                                      variant="outline"
                                      className="bg-green-500/10 text-green-400 border-green-500/30"
                                    >
                                      {pos.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
