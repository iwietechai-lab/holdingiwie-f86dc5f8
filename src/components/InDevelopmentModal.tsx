import { Construction, Rocket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InDevelopmentModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
}

export const InDevelopmentModal = ({ open, onClose, featureName = 'Esta sección' }: InDevelopmentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 animate-pulse">
            <Construction className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            En Desarrollo
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {featureName} estará disponible pronto. Estamos trabajando para brindarte
            la mejor experiencia posible.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Rocket className="w-4 h-4" />
            <span>IWIE Holding - Innovación continua</span>
          </div>
          
          <Button onClick={onClose} className="w-full">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
