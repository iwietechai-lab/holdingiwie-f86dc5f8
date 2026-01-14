import { createContext, useContext, ReactNode } from 'react';
import { TourOverlay } from './TourOverlay';
import { TourHelpButton } from './TourHelpButton';
import { useTour } from '@/hooks/useTour';

interface TourContextType {
  startTour: (pageKey?: string) => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider = ({ children }: TourProviderProps) => {
  const { startTour, isActive } = useTour();

  return (
    <TourContext.Provider value={{ startTour, isActive }}>
      {children}
      <TourOverlay />
      <TourHelpButton />
    </TourContext.Provider>
  );
};
