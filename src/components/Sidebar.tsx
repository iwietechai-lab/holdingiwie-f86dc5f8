import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Rocket,
  FolderOpen,
  ShieldAlert,
  Bot,
  Calendar,
  Ticket,
  Network,
  Bell,
  MessageSquare,
  ClipboardList,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InDevelopmentModal } from '@/components/InDevelopmentModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';
import { VerificationStatusBadge } from '@/components/FacialVerificationGuard';
import { NotificationsPopover } from '@/components/NotificationsPopover';

interface SidebarProps {
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

export const Sidebar = ({ selectedCompany, onSelectCompany }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, user } = useSupabaseAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFeatureName, setDevFeatureName] = useState('Esta sección');
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  
  // Check if current user is superadmin by UUID
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
  };

  const globalMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Global', action: 'navigate', path: '/dashboard' },
    { icon: Network, label: 'Organización', action: 'navigate', path: '/organizacion' },
    { icon: BarChart3, label: 'Reportes', action: 'dev' },
    { icon: Settings, label: 'Configuración', action: 'dev' },
    // Only show superadmin panel to the superadmin user
    ...(isSuperadmin ? [{ 
      icon: ShieldAlert, 
      label: 'Panel Super Admin', 
      action: 'navigate' as const, 
      path: '/superadmin' 
    }] : []),
  ];

  return (
    <>
      <aside 
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 relative",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center neon-glow shrink-0">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <h1 className="font-bold text-lg text-sidebar-foreground neon-text truncate">
                  IWIE Holding
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.full_name || 'Usuario'} • {profile?.role || 'Usuario'}
                </p>
              </div>
            )}
            {/* Notifications button */}
            <NotificationsPopover />
          </div>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-foreground hover:bg-primary/20 transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Global menu items */}
          <div className="space-y-2">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Menú Principal
              </p>
            )}
            {globalMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path ? location.pathname === item.path : false;
              
              const handleClick = () => {
                if (item.action === 'dev') {
                  handleDevClick(item.label);
                } else if (item.action === 'navigate' && item.path) {
                  navigate(item.path);
                }
              };
              
              const button = (
                <button
                  key={item.label}
                  onClick={handleClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary/20 text-primary neon-glow-purple" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.label}>{button}</div>;
            })}
          </div>

          {/* Companies list with expandable menus */}
          <div className="space-y-2">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Empresas
              </p>
            )}
            
            {/* Individual companies with submenus */}
            {companies.map((company) => {
              const isExpanded = expandedCompanies.includes(company.id);
              const isSelected = selectedCompany === company.id;
              
              if (isCollapsed) {
                // Collapsed view - just show company icon with tooltip
                return (
                  <Tooltip key={company.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          onSelectCompany(company.id);
                          navigate(`/empresa?empresa=${company.id}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          isSelected 
                            ? "bg-primary/20 text-primary" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <span className="text-xl shrink-0">{company.icon}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{company.name}</TooltipContent>
                  </Tooltip>
                );
              }

              // Expanded view with collapsible submenu
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
                      <span className="text-xl shrink-0">{company.icon}</span>
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
        {!isCollapsed && (
          <div className="px-4 pb-2">
            <VerificationStatusBadge userId={user?.id} />
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
              isCollapsed ? "px-0 justify-center" : "justify-start"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3">Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      <InDevelopmentModal
        open={showDevModal}
        onClose={() => setShowDevModal(false)}
        featureName={devFeatureName}
      />
    </>
  );
};
