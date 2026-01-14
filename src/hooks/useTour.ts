import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  page?: string; // Route where this step should appear
  action?: 'click' | 'input' | 'scroll' | 'wait';
  soundEffect?: 'welcome' | 'step' | 'success' | 'tip' | 'complete';
  avatarMood?: 'happy' | 'explaining' | 'pointing' | 'celebrating' | 'thinking' | 'waving';
  avatarAction?: 'bounce' | 'spin' | 'wave' | 'fly' | 'dance';
  delay?: number;
}

// Define tours for different pages/modules
export const tourConfigs: Record<string, TourStep[]> = {
  dashboard: [
    {
      id: 'welcome',
      title: '¡Hola! Soy IWIE Bot 🤖',
      content: '¡Verificación facial exitosa! Ahora te llevaré en un recorrido por toda la plataforma. ¡Sígueme!',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave',
      delay: 500
    },
    {
      id: 'sidebar',
      title: '📍 Menú de Navegación',
      content: '¡Mira aquí! Este es tu menú principal. Desde aquí puedes ir a cualquier sección: Dashboard, empresas, reuniones, tareas...',
      target: '[data-tour="sidebar"]',
      position: 'right',
      soundEffect: 'step',
      avatarMood: 'pointing',
      avatarAction: 'bounce'
    },
    {
      id: 'companies',
      title: '🏢 Las Empresas del Holding',
      content: '¡Sígueme! Aquí están todas tus empresas. Haz clic en cualquiera para ver sus métricas específicas.',
      target: '[data-tour="companies"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining',
      avatarAction: 'fly'
    },
    {
      id: 'kpis',
      title: '📊 Tus Indicadores Clave',
      content: '¡Wooo, mira estos números! Empleados, tareas, ingresos... todo el resumen ejecutivo en un vistazo.',
      target: '[data-tour="kpis"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    },
    {
      id: 'charts',
      title: '📈 Gráficos en Tiempo Real',
      content: '¡Aquí es donde la magia sucede! Visualiza tendencias, progreso de tareas y métricas actualizadas.',
      target: '[data-tour="charts"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining',
      avatarAction: 'bounce'
    },
    {
      id: 'notifications',
      title: '🔔 Centro de Notificaciones',
      content: '¡No te pierdas nada! Aquí recibirás alertas de tareas, reuniones y actualizaciones importantes.',
      target: '[data-tour="notifications"]',
      position: 'left',
      soundEffect: 'tip',
      avatarMood: 'pointing',
      avatarAction: 'fly'
    },
    {
      id: 'complete',
      title: '🎉 ¡Tour Completado!',
      content: '¡Excelente! Ya conoces el dashboard. Estaré siempre en la esquina inferior derecha si me necesitas. ¡Éxito!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  empresa: [
    {
      id: 'welcome-empresa',
      title: '🏭 Dashboard de Empresa',
      content: '¡Bienvenido al centro de control! Aquí verás todas las métricas y operaciones de esta empresa.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'empresa-kpis',
      title: '📊 Métricas de la Empresa',
      content: 'Usuarios activos, tareas completadas, ingresos mensuales y tickets abiertos. ¡Todo bajo control!',
      target: '[data-tour="empresa-kpis"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'explaining',
      avatarAction: 'bounce'
    },
    {
      id: 'quick-access',
      title: '⚡ Acceso Rápido',
      content: '¡Atajos mágicos! Navega directamente a documentos, tareas, presupuestos y más.',
      target: '[data-tour="quick-access"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'pointing',
      avatarAction: 'fly'
    },
    {
      id: 'complete-empresa',
      title: '🎉 ¡Listo!',
      content: 'Ya conoces el dashboard de empresa. ¡Explora y gestiona con confianza!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  tareas: [
    {
      id: 'welcome-tasks',
      title: '✅ Gestión de Tareas',
      content: '¡Bienvenido al módulo de tareas! Aquí puedes crear, asignar y dar seguimiento a todo el trabajo del equipo.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'create-task',
      title: '➕ Crear Nueva Tarea',
      content: '¡Mira este botón! Haz clic aquí para crear una tarea con título, descripción, fecha límite y responsables.',
      target: '[data-tour="create-task"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing',
      avatarAction: 'bounce'
    },
    {
      id: 'task-filters',
      title: '🔍 Filtros y Búsqueda',
      content: 'Filtra por estado, prioridad, área o responsable. ¡Encuentra cualquier tarea en segundos!',
      target: '[data-tour="task-filters"]',
      position: 'bottom',
      soundEffect: 'tip',
      avatarMood: 'explaining',
      avatarAction: 'fly'
    },
    {
      id: 'task-cards',
      title: '📋 Tarjetas de Tareas',
      content: 'Cada tarjeta muestra estado, prioridad y fechas. ¡Haz clic para ver todos los detalles!',
      target: '[data-tour="task-cards"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining',
      avatarAction: 'bounce'
    },
    {
      id: 'complete-tasks',
      title: '🎉 ¡Perfecto!',
      content: 'Ya sabes cómo gestionar tareas. ¡Mantén tu equipo organizado y productivo!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  'gestor-documentos': [
    {
      id: 'welcome-docs',
      title: '📁 Gestor de Documentos',
      content: '¡Bienvenido! Aquí centralizas todos los documentos de la organización de forma segura.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'upload-doc',
      title: '📤 Subir Documentos',
      content: '¡Este es el botón mágico! Haz clic aquí para subir archivos y organizarlos por área.',
      target: '[data-tour="upload-doc"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing',
      avatarAction: 'bounce'
    },
    {
      id: 'doc-folders',
      title: '📂 Organización',
      content: 'Los documentos se organizan por empresa y área. ¡Navega fácilmente para encontrar lo que necesitas!',
      target: '[data-tour="doc-folders"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining',
      avatarAction: 'fly'
    },
    {
      id: 'complete-docs',
      title: '🎉 ¡Listo!',
      content: 'Ya puedes gestionar documentos como un profesional. ¡Mantén todo organizado!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  presupuestos: [
    {
      id: 'welcome-budget',
      title: '💰 Módulo de Presupuestos',
      content: '¡Hola! Aquí gestionas el catálogo de productos, precios y cotizaciones profesionales.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'add-item',
      title: '➕ Agregar Productos',
      content: '¡Mira! Añade productos con nombre, descripción y precios en CLP y RMB.',
      target: '[data-tour="add-item"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing',
      avatarAction: 'bounce'
    },
    {
      id: 'categories',
      title: '🏷️ Categorías',
      content: 'Organiza productos por categorías para facilitar búsqueda y cotización.',
      target: '[data-tour="categories"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining',
      avatarAction: 'fly'
    },
    {
      id: 'complete-budget',
      title: '🎉 ¡Excelente!',
      content: 'Ya dominas el módulo de presupuestos. ¡Genera cotizaciones profesionales!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  chatbot: [
    {
      id: 'welcome-chatbot',
      title: '🤖 Asistente IA',
      content: '¡Bienvenido a nuestro chatbot inteligente! Puede responder consultas sobre la empresa.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'chat-input',
      title: '💬 Hacer Preguntas',
      content: '¡Escribe aquí tu consulta! El asistente tiene acceso a toda la base de conocimiento.',
      target: '[data-tour="chat-input"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining',
      avatarAction: 'bounce'
    },
    {
      id: 'chat-history',
      title: '📜 Historial',
      content: 'Tus conversaciones se guardan. ¡Puedes consultar respuestas anteriores!',
      target: '[data-tour="chat-history"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'pointing',
      avatarAction: 'fly'
    },
    {
      id: 'complete-chatbot',
      title: '🎉 ¡Perfecto!',
      content: 'Ya sabes usar el asistente. ¡Pregunta lo que necesites!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  reuniones: [
    {
      id: 'welcome-meetings',
      title: '📅 Centro de Reuniones',
      content: '¡Hola! Aquí solicitas, programas y te unes a videollamadas con tu equipo.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'request-meeting',
      title: '📝 Solicitar Reunión',
      content: 'Completa el formulario con título, fecha y participantes. El superadmin aprobará la solicitud.',
      target: '[data-tour="request-meeting"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'explaining',
      avatarAction: 'bounce'
    },
    {
      id: 'meeting-list',
      title: '📋 Reuniones Programadas',
      content: 'Ve el estado de tus solicitudes y únete a reuniones aprobadas con un clic.',
      target: '[data-tour="meeting-list"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'pointing',
      avatarAction: 'fly'
    },
    {
      id: 'complete-meetings',
      title: '🎉 ¡Listo!',
      content: 'Ya sabes cómo gestionar reuniones. ¡Colabora efectivamente con tu equipo!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ],
  tickets: [
    {
      id: 'welcome-tickets',
      title: '🎫 Sistema de Tickets',
      content: '¡Bienvenido! Gestiona solicitudes, incidencias y seguimiento de problemas.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'waving',
      avatarAction: 'wave'
    },
    {
      id: 'create-ticket',
      title: '➕ Crear Ticket',
      content: 'Abre un nuevo ticket describiendo el problema. Asigna prioridad y etiquetas.',
      target: '[data-tour="create-ticket"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing',
      avatarAction: 'bounce'
    },
    {
      id: 'ticket-status',
      title: '🔄 Estados de Tickets',
      content: 'Sigue el progreso: Abierto → En Progreso → Resuelto → Cerrado.',
      target: '[data-tour="ticket-status"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'explaining',
      avatarAction: 'fly'
    },
    {
      id: 'complete-tickets',
      title: '🎉 ¡Excelente!',
      content: 'Ya dominas el sistema de tickets. ¡Resuelve problemas eficientemente!',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating',
      avatarAction: 'dance'
    }
  ]
};

const TOUR_STORAGE_KEY = 'iwie_tours_completed';
const TOUR_TRIGGER_KEY = 'iwie_tour_trigger';
const TOUR_SESSION_KEY = 'iwie_tour_session';

export const useTour = () => {
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [shouldTrigger, setShouldTrigger] = useState(false);
  const hasInitialized = useRef(false);

  // Get current page key from route
  const getCurrentPageKey = useCallback((): string => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    return path;
  }, [location.pathname]);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    if (saved) {
      setCompletedTours(JSON.parse(saved));
    }

    // Check if tour should be triggered (set by facial verification)
    const trigger = sessionStorage.getItem(TOUR_TRIGGER_KEY);
    if (trigger === 'true') {
      setShouldTrigger(true);
    }
  }, []);

  // Get current tour steps
  const getCurrentTour = useCallback((): TourStep[] => {
    const pageKey = getCurrentPageKey();
    return tourConfigs[pageKey] || [];
  }, [getCurrentPageKey]);

  const currentStep = getCurrentTour()[currentStepIndex];
  const totalSteps = getCurrentTour().length;

  const startTour = useCallback((pageKey?: string) => {
    const key = pageKey || getCurrentPageKey();
    console.log('Starting tour for:', key, 'Available:', !!tourConfigs[key]);
    if (tourConfigs[key]) {
      // Reset the initialization flag to allow manual restart
      hasInitialized.current = false;
      setCurrentStepIndex(0);
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        setIsActive(true);
      }, 100);
      // Clear the trigger flag
      sessionStorage.removeItem(TOUR_TRIGGER_KEY);
    }
  }, [getCurrentPageKey]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStepIndex, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const completeTour = useCallback(() => {
    const pageKey = getCurrentPageKey();
    const newCompleted = [...completedTours, pageKey];
    setCompletedTours(newCompleted);
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(newCompleted));
    setIsActive(false);
    setCurrentStepIndex(0);
    setShouldTrigger(false);
  }, [completedTours, getCurrentPageKey]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setShouldTrigger(false);
    sessionStorage.removeItem(TOUR_TRIGGER_KEY);
  }, []);

  const resetTours = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setCompletedTours([]);
  }, []);

  const hasTourForCurrentPage = useCallback(() => {
    return !!tourConfigs[getCurrentPageKey()];
  }, [getCurrentPageKey]);

  const hasCompletedCurrentTour = useCallback(() => {
    return completedTours.includes(getCurrentPageKey());
  }, [completedTours, getCurrentPageKey]);

  // Trigger tour after facial verification
  const triggerTourAfterVerification = useCallback(() => {
    sessionStorage.setItem(TOUR_TRIGGER_KEY, 'true');
    setShouldTrigger(true);
  }, []);

  // Auto-start tour when triggered by facial verification
  useEffect(() => {
    if (shouldTrigger && hasTourForCurrentPage() && !hasCompletedCurrentTour() && !isActive && !hasInitialized.current) {
      hasInitialized.current = true;
      // Delay to let the page render completely
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldTrigger, hasTourForCurrentPage, hasCompletedCurrentTour, isActive, startTour]);

  // Reset initialization flag when route changes
  useEffect(() => {
    hasInitialized.current = false;
  }, [location.pathname]);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTours,
    hasTourForCurrentPage,
    hasCompletedCurrentTour,
    triggerTourAfterVerification,
    shouldTrigger
  };
};

// Export function to trigger tour from outside React (like after facial verification)
export const triggerTourFromVerification = () => {
  sessionStorage.setItem(TOUR_TRIGGER_KEY, 'true');
};
