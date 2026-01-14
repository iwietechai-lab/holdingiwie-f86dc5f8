import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Play, RotateCcw, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTourContext, tourConfigs } from './TourProvider';
import { TourAvatar } from './TourAvatar';

// Mapeo de tourKey a ruta de navegación
const tourRouteMap: Record<string, string> = {
  dashboard: '/dashboard',
  empresa: '/empresa',
  tareas: '/tareas',
  'gestor-documentos': '/gestor-documentos',
  presupuestos: '/presupuestos',
  chatbot: '/chatbot',
  reuniones: '/reuniones',
  tickets: '/tickets'
};

// Key para almacenar el tour pendiente en sessionStorage
const PENDING_TOUR_KEY = 'iwie_pending_tour';

export const TourHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { startTour, hasTourForCurrentPage, resetTours } = useTourContext();
  const navigate = useNavigate();
  const location = useLocation();

  const availableTours = Object.entries(tourConfigs).map(([key, steps]) => ({
    key,
    title: steps[0]?.title || key,
    stepsCount: steps.length
  }));

  const handleStartCurrentTour = () => {
    console.log('TourHelpButton - Button clicked, starting tour');
    setIsOpen(false);
    // Pequeño delay para que cierre el panel primero
    setTimeout(() => {
      startTour();
    }, 100);
  };

  const handleResetTours = () => {
    console.log('TourHelpButton - Resetting all tours');
    resetTours();
    setIsOpen(false);
  };

  const handleStartSpecificTour = (tourKey: string) => {
    console.log('TourHelpButton - Starting specific tour:', tourKey);
    setIsOpen(false);
    
    const targetRoute = tourRouteMap[tourKey];
    const currentPath = location.pathname.replace('/', '') || 'dashboard';
    
    if (!targetRoute) {
      console.warn('TourHelpButton - No route found for tour:', tourKey);
      return;
    }
    
    // Si ya estamos en la ruta correcta, iniciar tour directamente
    if (currentPath === tourKey) {
      console.log('TourHelpButton - Already on correct page, starting tour directly');
      setTimeout(() => {
        startTour(tourKey);
      }, 100);
      return;
    }
    
    // Guardar en sessionStorage que debemos iniciar el tour después de navegar
    sessionStorage.setItem(PENDING_TOUR_KEY, tourKey);
    console.log('TourHelpButton - Navigating to:', targetRoute);
    
    // Navegar a la ruta correspondiente
    navigate(targetRoute);
  };

  return (
    <>
      {/* Floating Help Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-[100]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring' }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center group"
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isOpen ? (
              <X className="w-6 h-6 text-primary-foreground" />
            ) : (
              <HelpCircle className="w-6 h-6 text-primary-foreground" />
            )}
          </motion.div>
          
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          
          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            Ayuda y Tutoriales
          </span>
        </motion.button>
      </motion.div>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[100] w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 flex items-center gap-3">
              <TourAvatar mood="happy" size="sm" />
              <div>
                <h3 className="font-bold text-foreground">Centro de Ayuda</h3>
                <p className="text-xs text-muted-foreground">Aprende a usar la plataforma</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-3">
              {hasTourForCurrentPage() && (
                <Button
                  onClick={handleStartCurrentTour}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Tour de Esta Página
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleResetTours}
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar Todos los Tours
              </Button>
            </div>

            {/* Available Tours */}
            <div className="border-t border-border">
              <div className="p-3 bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Tours Disponibles
                </h4>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availableTours.map((tour) => (
                  <button
                    key={tour.key}
                    onClick={() => handleStartSpecificTour(tour.key)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {tour.title.replace('¡Bienvenido a ', '').replace('!', '')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tour.stepsCount} pasos
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-muted/30 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                💡 Tip: El tour se inicia automáticamente en tu primera visita
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
