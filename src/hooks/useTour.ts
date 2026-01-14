import { useState, useEffect, useCallback } from 'react';
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
  avatarMood?: 'happy' | 'explaining' | 'pointing' | 'celebrating' | 'thinking';
}

// Define tours for different pages/modules
export const tourConfigs: Record<string, TourStep[]> = {
  dashboard: [
    {
      id: 'welcome',
      title: '¡Bienvenido a IWIE Holding!',
      content: 'Soy tu asistente virtual. Te guiaré paso a paso para que conozcas todas las funcionalidades de la plataforma.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'sidebar',
      title: 'Menú Principal',
      content: 'Desde aquí puedes acceder a todas las secciones: Dashboard, empresas, reuniones, tareas y más.',
      target: '[data-tour="sidebar"]',
      position: 'right',
      soundEffect: 'step',
      avatarMood: 'pointing'
    },
    {
      id: 'companies',
      title: 'Empresas del Holding',
      content: 'Haz clic en cualquier empresa para ver su dashboard específico con métricas detalladas.',
      target: '[data-tour="companies"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining'
    },
    {
      id: 'kpis',
      title: 'Indicadores Clave (KPIs)',
      content: 'Aquí ves el resumen ejecutivo: empleados, tareas, ingresos y progreso general del holding.',
      target: '[data-tour="kpis"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'explaining'
    },
    {
      id: 'charts',
      title: 'Gráficos Interactivos',
      content: 'Visualiza tendencias de ingresos, distribución de tareas y métricas en tiempo real.',
      target: '[data-tour="charts"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining'
    },
    {
      id: 'notifications',
      title: 'Centro de Notificaciones',
      content: 'Recibe alertas de tareas, reuniones pendientes y actualizaciones importantes.',
      target: '[data-tour="notifications"]',
      position: 'left',
      soundEffect: 'tip',
      avatarMood: 'pointing'
    },
    {
      id: 'complete',
      title: '¡Tour Completado!',
      content: 'Ya conoces el dashboard principal. Puedes repetir este tour desde el botón de ayuda en cualquier momento.',
      position: 'center',
      soundEffect: 'complete',
      avatarMood: 'celebrating'
    }
  ],
  empresa: [
    {
      id: 'welcome-empresa',
      title: 'Dashboard de Empresa',
      content: 'Este es el centro de control de la empresa seleccionada. Aquí verás todas sus métricas y operaciones.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'empresa-kpis',
      title: 'Métricas de la Empresa',
      content: 'Usuarios activos, tareas completadas, ingresos mensuales y tickets abiertos.',
      target: '[data-tour="empresa-kpis"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'explaining'
    },
    {
      id: 'quick-access',
      title: 'Acceso Rápido',
      content: 'Navega directamente a documentos, tareas, presupuestos, tickets y más.',
      target: '[data-tour="quick-access"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'pointing'
    }
  ],
  tareas: [
    {
      id: 'welcome-tasks',
      title: 'Gestión de Tareas',
      content: 'Aquí puedes crear, asignar y dar seguimiento a todas las tareas del equipo.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'create-task',
      title: 'Crear Nueva Tarea',
      content: 'Haz clic en el botón "Nueva Tarea" para crear una asignación con título, descripción, fecha límite y responsables.',
      target: '[data-tour="create-task"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing'
    },
    {
      id: 'task-filters',
      title: 'Filtros y Búsqueda',
      content: 'Filtra por estado, prioridad, área o responsable para encontrar tareas rápidamente.',
      target: '[data-tour="task-filters"]',
      position: 'bottom',
      soundEffect: 'tip',
      avatarMood: 'explaining'
    },
    {
      id: 'task-cards',
      title: 'Tarjetas de Tareas',
      content: 'Cada tarjeta muestra el estado, prioridad, fechas y progreso. Haz clic para ver detalles.',
      target: '[data-tour="task-cards"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining'
    }
  ],
  'gestor-documentos': [
    {
      id: 'welcome-docs',
      title: 'Gestor de Documentos',
      content: 'Centraliza todos los documentos de la organización de forma segura y organizada.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'upload-doc',
      title: 'Subir Documentos',
      content: 'Haz clic en "Subir Documento" y selecciona el archivo. Asigna área y etiquetas para mejor organización.',
      target: '[data-tour="upload-doc"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing'
    },
    {
      id: 'doc-folders',
      title: 'Organización por Carpetas',
      content: 'Los documentos se organizan por empresa y área. Navega para encontrar lo que necesitas.',
      target: '[data-tour="doc-folders"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining'
    }
  ],
  presupuestos: [
    {
      id: 'welcome-budget',
      title: 'Módulo de Presupuestos',
      content: 'Gestiona el catálogo de productos, precios y genera cotizaciones profesionales.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'add-item',
      title: 'Agregar Productos',
      content: 'Añade productos al catálogo con nombre, descripción, precios en CLP y RMB, y categoría.',
      target: '[data-tour="add-item"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing'
    },
    {
      id: 'categories',
      title: 'Categorías',
      content: 'Organiza productos por categorías para facilitar la búsqueda y cotización.',
      target: '[data-tour="categories"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'explaining'
    }
  ],
  chatbot: [
    {
      id: 'welcome-chatbot',
      title: 'Asistente IA',
      content: 'Este chatbot utiliza inteligencia artificial para responder consultas sobre la empresa.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'chat-input',
      title: 'Hacer Preguntas',
      content: 'Escribe tu consulta aquí. El asistente tiene acceso a la base de conocimiento de la empresa.',
      target: '[data-tour="chat-input"]',
      position: 'top',
      soundEffect: 'step',
      avatarMood: 'explaining'
    },
    {
      id: 'chat-history',
      title: 'Historial de Conversaciones',
      content: 'Tus conversaciones se guardan. Puedes volver a consultar respuestas anteriores.',
      target: '[data-tour="chat-history"]',
      position: 'right',
      soundEffect: 'tip',
      avatarMood: 'pointing'
    }
  ],
  reuniones: [
    {
      id: 'welcome-meetings',
      title: 'Centro de Reuniones',
      content: 'Solicita, programa y únete a videollamadas con miembros del equipo.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'request-meeting',
      title: 'Solicitar Reunión',
      content: 'Completa el formulario con título, descripción, fecha y participantes. El superadmin aprobará la solicitud.',
      target: '[data-tour="request-meeting"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'explaining'
    },
    {
      id: 'meeting-list',
      title: 'Reuniones Programadas',
      content: 'Ve el estado de tus solicitudes y únete a reuniones aprobadas con un clic.',
      target: '[data-tour="meeting-list"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'pointing'
    }
  ],
  tickets: [
    {
      id: 'welcome-tickets',
      title: 'Sistema de Tickets',
      content: 'Gestiona solicitudes, incidencias y seguimiento de problemas del equipo.',
      position: 'center',
      soundEffect: 'welcome',
      avatarMood: 'happy'
    },
    {
      id: 'create-ticket',
      title: 'Crear Ticket',
      content: 'Abre un nuevo ticket describiendo el problema o solicitud. Asigna prioridad y etiquetas.',
      target: '[data-tour="create-ticket"]',
      position: 'bottom',
      soundEffect: 'step',
      avatarMood: 'pointing'
    },
    {
      id: 'ticket-status',
      title: 'Estados de Tickets',
      content: 'Sigue el progreso: Abierto → En Progreso → Resuelto → Cerrado.',
      target: '[data-tour="ticket-status"]',
      position: 'top',
      soundEffect: 'tip',
      avatarMood: 'explaining'
    }
  ]
};

const TOUR_STORAGE_KEY = 'iwie_tours_completed';
const TOUR_FIRST_VISIT_KEY = 'iwie_first_visit';

export const useTour = () => {
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

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

    const firstVisit = localStorage.getItem(TOUR_FIRST_VISIT_KEY);
    if (!firstVisit) {
      setIsFirstVisit(true);
      localStorage.setItem(TOUR_FIRST_VISIT_KEY, 'false');
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
    if (tourConfigs[key]) {
      setCurrentStepIndex(0);
      setIsActive(true);
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
  }, [completedTours, getCurrentPageKey]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
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

  // Auto-start tour on first visit to a page with a tour
  useEffect(() => {
    if (isFirstVisit && hasTourForCurrentPage() && !hasCompletedCurrentTour() && !isActive) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, isFirstVisit, hasTourForCurrentPage, hasCompletedCurrentTour, isActive, startTour]);

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
    isFirstVisit
  };
};
