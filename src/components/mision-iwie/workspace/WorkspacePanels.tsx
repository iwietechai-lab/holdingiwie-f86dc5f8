import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  FileText,
  DollarSign,
  Clock,
  Wrench,
  BookOpen,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import type { 
  Mission, 
  ContextClassification,
  MissionCostEstimate, 
  MissionTimeEstimate,
  PanelType,
} from '@/types/mision-iwie';

interface WorkspacePanelsProps {
  mission: Mission;
  currentContext: ContextClassification | null;
  costEstimates: MissionCostEstimate[];
  timeEstimates: MissionTimeEstimate[];
}

export function WorkspacePanels({
  mission,
  currentContext,
  costEstimates,
  timeEstimates,
}: WorkspacePanelsProps) {
  const activePanels = currentContext?.suggested_panels || ['notes', 'documentation'];
  
  // Calculate totals
  const totalBudget = costEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const totalDays = timeEstimates.reduce((sum, e) => sum + (e.estimated_days || 0), 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Paneles de Trabajo
          </span>
          <Badge variant="outline" className="text-xs">
            {activePanels.length} activos
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <Tabs defaultValue="budget" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-4 h-auto py-1 bg-transparent">
            <TabsTrigger value="budget" className="gap-1 text-xs">
              <DollarSign className="w-3 h-3" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 text-xs">
              <Clock className="w-3 h-3" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="specs" className="gap-1 text-xs">
              <Wrench className="w-3 h-3" />
              Especificaciones
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1 text-xs">
              <FileText className="w-3 h-3" />
              Notas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            {/* Budget Panel */}
            <TabsContent value="budget" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Estimado</p>
                        <p className="text-lg font-bold text-primary">
                          ${totalBudget.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Presupuesto</p>
                        <p className="text-lg font-bold">
                          ${(mission.estimated_budget || 0).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Items */}
                  {costEstimates.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Desglose de Costos</h4>
                      {costEstimates.map((estimate) => (
                        <div
                          key={estimate.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{estimate.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {estimate.quantity} × ${estimate.unit_price}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${estimate.total_price?.toLocaleString()}</p>
                            {estimate.is_ai_generated && (
                              <Badge variant="secondary" className="text-[10px]">IA</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin estimaciones de costo aún</p>
                      <p className="text-xs">Conversa sobre costos para generar estimaciones</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Timeline Panel */}
            <TabsContent value="timeline" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Summary */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Tiempo Total Estimado</p>
                      <p className="text-lg font-bold text-primary">
                        {totalDays} días
                      </p>
                    </CardContent>
                  </Card>

                  {/* Timeline Items */}
                  {timeEstimates.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Fases del Proyecto</h4>
                      {timeEstimates.map((estimate, index) => (
                        <div
                          key={estimate.id}
                          className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{estimate.phase_name}</p>
                            {estimate.description && (
                              <p className="text-xs text-muted-foreground">{estimate.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{estimate.estimated_days} días</p>
                            {estimate.is_ai_generated && (
                              <Badge variant="secondary" className="text-[10px]">IA</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin estimaciones de tiempo aún</p>
                      <p className="text-xs">Conversa sobre plazos para generar el cronograma</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Specifications Panel */}
            <TabsContent value="specs" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Especificaciones técnicas</p>
                  <p className="text-xs">Se generarán automáticamente durante la conversación</p>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Notes Panel */}
            <TabsContent value="notes" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Información de la Misión
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo:</span>
                          <span>{mission.mission_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prioridad:</span>
                          <span>{mission.priority}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estado:</span>
                          <span>{mission.status}</span>
                        </div>
                        {mission.target_end_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha objetivo:</span>
                            <span>{new Date(mission.target_end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {mission.description && (
                    <Card>
                      <CardContent className="p-3">
                        <h4 className="text-sm font-medium mb-2">Descripción</h4>
                        <p className="text-sm text-muted-foreground">{mission.description}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
