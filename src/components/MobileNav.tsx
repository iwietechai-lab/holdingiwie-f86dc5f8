import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  Rocket,
  FolderOpen,
  ShieldAlert,
  Menu,
  ChevronDown,
  Building2,
  ClipboardList,
  Bot,
  Calendar,
  Ticket,
  MessageSquare,
  Network,
  DollarSign,
  TrendingUp,
  Target,
  Bell,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies } from '@/data/companies';
import { CompanyIcon } from '@/components/CompanyIcon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InDevelopmentModal } from '@/components/InDevelopmentModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';
import { VerificationStatusBadge } from '@/components/FacialVerificationGuard';

interface MobileNavProps {
  selectedCompany: string | null;
  onSelectCompany: (companyId: string | null) => void;
}

// Submenu items for each company
const companyMenuItems = [
  { icon: TrendingUp, label: 'Dashboard', path: '/empresa', queryParam: true },
  { icon: DollarSign, label: 'Ventas', path: '/empresa', queryParam: true, section: 'ventas' },
  { icon: Users, label: 'Usuarios', path: '/usuarios', queryParam: true },
  { icon: FolderOpen, label: 'Documentos', path: '/gestor-documentos', queryParam: true },
  { icon: MessageSquare, label: 'Chat Interno', path: '/mensajeria', queryParam: true },
  { icon: ClipboardList, label: 'Tareas', path: '/tareas', queryParam: true },
  { icon: Ticket, label: 'Tickets', path: '/tickets', queryParam: true },
  { icon: Bot, label: 'Chatbot', path: '/ceo-chatbot', queryParam: true },
  { icon: Calendar, label: 'Reuniones', path: '/reuniones', queryParam: true },
];

export const MobileNav = ({ selectedCompany, onSelectCompany }: MobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, user } = useSupabaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFeatureName, setDevFeatureName] = useState('Esta sección');
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);

  const isSuperadmin = user?.id === SUPERADMIN_USER_ID;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDevClick = (featureName: string) => {
    setDevFeatureName(featureName);
    setShowDevModal(true);
  };

  const toggleCompanyExpanded = (companyId: string) => {
    setExpandedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleCompanyMenuClick = (companyId: string, menuItem: typeof companyMenuItems[0]) => {
    onSelectCompany(companyId);
    if (menuItem.queryParam) {
      const params = new URLSearchParams();
      params.set('empresa', companyId);
      if (menuItem.section) {
        params.set('section', menuItem.section);
      }
      navigate(`${menuItem.path}?${params.toString()}`);
    } else {
      navigate(menuItem.path);
    }
    setIsOpen(false);
  };

  const globalMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Global', action: 'navigate', path: '/dashboard' },
    { icon: Bot, label: 'CEOChat', action: 'navigate', path: '/ceo-chat' },
    { icon: Target, label: 'Misión Iwie', action: 'navigate', path: '/mision-iwie' },
    { icon: ClipboardList, label: 'AI Tareas', action: 'navigate', path: '/ai-tareas' },
    { icon: Bell, label: 'Gestor Notificaciones', action: 'navigate', path: '/configuracion' },
    { icon: Brain, label: 'Brain Galaxy', action: 'navigate', path: '/brain-galaxy' },
    { icon: Network, label: 'Organización', action: 'navigate', path: '/organizacion' },
    { icon: BarChart3, label: 'Reportes', action: 'dev' },
    ...(isSuperadmin
      ? [{ icon: ShieldAlert, label: 'Super Admin', action: 'navigate' as const, path: '/superadmin' }]
      : []),
  ];

  const handleNavigation = (item: typeof globalMenuItems[0]) => {
    if (item.action === 'dev') {
      handleDevClick(item.label);
    } else if (item.action === 'navigate' && item.path) {
      navigate(item.path);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-sidebar border-sidebar-border p-0">
          <SheetHeader className="p-4 border-b border-sidebar-border">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center neon-glow shrink-0">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="overflow-hidden text-left">
                <h1 className="font-bold text-lg text-sidebar-foreground neon-text truncate">
                  IWIE Holding
                </h1>
                <p className="text-xs text-muted-foreground truncate font-normal">
                  {profile?.full_name || 'Usuario'} • {profile?.role || 'Usuario'}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[calc(100vh-200px)]">
            {/* Global menu items */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Menú Principal
              </p>
              {globalMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? location.pathname === item.path : false;

                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavigation(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-primary/20 text-primary neon-glow-purple'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Companies with expandable submenus */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Empresas
              </p>

              {companies.map((company) => {
                const isExpanded = expandedCompanies.includes(company.id);
                const isSelected = selectedCompany === company.id;

                return (
                  <Collapsible 
                    key={company.id} 
                    open={isExpanded}
                    onOpenChange={() => toggleCompanyExpanded(company.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                          isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <CompanyIcon companyId={company.id} icon={company.icon} size="lg" />
                        <span className="truncate text-sm flex-1 text-left">{company.name}</span>
                        <ChevronDown 
                          className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} 
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      {companyMenuItems.map((menuItem) => {
                        const Icon = menuItem.icon;
                        const currentParams = new URLSearchParams(location.search);
                        const isMenuActive = location.pathname === menuItem.path && 
                          currentParams.get('empresa') === company.id &&
                          (!menuItem.section || currentParams.get('section') === menuItem.section);
                        
                        return (
                          <button
                            key={menuItem.label}
                            onClick={() => handleCompanyMenuClick(company.id, menuItem)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                              isMenuActive
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{menuItem.label}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </nav>

          {/* Verification status */}
          <div className="px-4 pb-2">
            <VerificationStatusBadge userId={user?.id} />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 justify-start"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Cerrar Sesión</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <InDevelopmentModal
        open={showDevModal}
        onClose={() => setShowDevModal(false)}
        featureName={devFeatureName}
      />
    </>
  );
};
