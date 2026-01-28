import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, PlusCircle, X } from 'lucide-react';
import { STUDIO_TOOLS, type StudioToolType, type StudioOutput } from './types';

interface StudioToolsPanelProps {
  outputs: StudioOutput[];
  onGenerateOutput: (toolType: StudioToolType) => void;
  onViewOutput: (output: StudioOutput) => void;
  isGenerating: boolean;
  generatingTool?: StudioToolType;
  hasSourcesReady: boolean;
  onCancelGeneration?: () => void;
}

export function StudioToolsPanel({
  outputs,
  onGenerateOutput,
  onViewOutput,
  isGenerating,
  generatingTool,
  hasSourcesReady,
  onCancelGeneration,
}: StudioToolsPanelProps) {
  return (
    <div className="flex-1 flex flex-col border-l bg-muted/30 min-h-0">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Studio</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Genera contenido a partir de tus fuentes
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {STUDIO_TOOLS.map((tool) => {
            const existingOutput = outputs.find(o => o.type === tool.id && o.status === 'ready');
            const isCurrentlyGenerating = isGenerating && generatingTool === tool.id;

            return (
              <Button
                key={tool.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3 relative overflow-hidden group"
                disabled={!hasSourcesReady || isGenerating}
                onClick={() => existingOutput ? onViewOutput(existingOutput) : onGenerateOutput(tool.id)}
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                  style={{ backgroundColor: tool.color }}
                />
                <span className="text-xl">{tool.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{tool.nameEs}</p>
                </div>
                {isCurrentlyGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : existingOutput ? (
                  <Badge variant="secondary" className="text-xs">
                    Listo
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-3">
        {/* Cancel button when generating */}
        {isGenerating && onCancelGeneration && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full gap-2"
            onClick={onCancelGeneration}
          >
            <X className="h-4 w-4" />
            Cancelar generación
          </Button>
        )}
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <p>Los resultados de Studio se guardarán aquí.</p>
        </div>
        
        {outputs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Resultados generados:</p>
            {outputs.filter(o => o.status === 'ready').map((output) => {
              const tool = STUDIO_TOOLS.find(t => t.id === output.type);
              return (
                <div
                  key={output.id}
                  className="p-2 rounded-lg bg-background border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onViewOutput(output)}
                >
                  <div className="flex items-center gap-2">
                    <span>{tool?.icon}</span>
                    <p className="text-sm font-medium truncate">{output.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" className="w-full gap-2" disabled={!hasSourcesReady}>
          <PlusCircle className="h-4 w-4" />
          Añadir nota
        </Button>
      </div>
    </div>
  );
}
