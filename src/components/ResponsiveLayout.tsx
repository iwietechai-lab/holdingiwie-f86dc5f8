import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { SpaceBackground } from '@/components/SpaceBackground';
import { getCompanyById } from '@/data/companies';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
  selectedCompany?: string | null;
  onSelectCompany?: (companyId: string | null) => void;
}

export const ResponsiveLayout = ({ 
  children, 
  showBackground = true,
  selectedCompany: externalSelectedCompany,
  onSelectCompany: externalOnSelectCompany 
}: ResponsiveLayoutProps) => {
  const [internalSelectedCompany, setInternalSelectedCompany] = useState<string | null>(null);
  
  // Use external state if provided, otherwise use internal
  const selectedCompany = externalSelectedCompany !== undefined ? externalSelectedCompany : internalSelectedCompany;
  const setSelectedCompany = externalOnSelectCompany || setInternalSelectedCompany;

  // Get company name for header
  const company = selectedCompany ? getCompanyById(selectedCompany) : null;
  const headerTitle = company ? company.name : 'IWIE Holding';

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {showBackground && <SpaceBackground />}

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />
      </div>

      {/* Mobile Header with Nav - visible only on mobile */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <MobileNav
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />
        <h1 className="text-lg font-bold text-foreground neon-text flex items-center gap-2">
          {company && <span>{company.icon}</span>}
          {headerTitle}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0">
        {children}
      </main>
    </div>
  );
};
