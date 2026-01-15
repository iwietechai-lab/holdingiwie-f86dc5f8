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
  TrendingUp,
  ArrowLeft,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies, getCompanyById } from '@/data/companies';
import { CompanyIcon } from '@/components/CompanyIcon';
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

import { Package } from 'lucide-react';
import { DashboardVisibility } from '@/types/superadmin';

// Submenu items for each company with permission mapping
const companyMenuItems = [
  { icon: TrendingUp, label: 'Dashboard', path: '/empresa', queryParam: true, permission: 'ver_dashboard' as keyof DashboardVisibility },
  { icon: DollarSign, label: 'Ventas', path: '/empresa', queryParam: true, section: 'ventas', permission: 'ver_ventas' as keyof DashboardVisibility },
  { icon: Users, label: 'Usuarios', path: '/usuarios', queryParam: true, permission: 'gestionar_usuarios' as keyof DashboardVisibility },
  { icon: FolderOpen, label: 'Documentos', path: '/gestor-documentos', queryParam: true, permission: 'ver_documentos' as keyof DashboardVisibility },
  { icon: MessageSquare, label: 'Chat Interno', path: '/mensajeria', queryParam: true, permission: 'ver_chat_interno' as keyof DashboardVisibility },
  { icon: ClipboardList, label: 'Tareas', path: '/tareas', queryParam: true, permission: 'ver_tareas' as keyof DashboardVisibility },
  { icon: Package, label: 'Presupuestos', path: '/presupuestos', queryParam: true, permission: 'ver_dashboard' as keyof DashboardVisibility },
  { icon: Ticket, label: 'Tickets', path: '/tickets', queryParam: true, permission: 'ver_tickets' as keyof DashboardVisibility },
  { icon: Bot, label: 'Chatbot Empresa', path: '/chatbot-empresa', queryParam: true, permission: 'acceso_chatbot_empresa' as keyof DashboardVisibility },
  { icon: Calendar, label: 'Reuniones', path: '/reuniones', queryParam: true, permission: 'ver_reuniones' as keyof DashboardVisibility },
];

export const Sidebar = ({ selectedCompany, onSelectCompany }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, user } = useSupabaseAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFeatureName, setDevFeatureName] = useState('Esta sección');
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  
  // Active company mode - when a company is selected, others are hidden
  const [activeCompanyMode, setActiveCompanyMode] = useState<string | null>(null);
  
  // Check if current user is superadmin by UUID
  const isSuperadmin = user?.id === SUPERADMIN_USER_ID;

  // Sync active company mode with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const empresaParam = params.get('empresa');
    if (empresaParam && !activeCompanyMode) {
      setActiveCompanyMode(empresaParam);
      setExpandedCompanies([empresaParam]);
    }
  }, [location.search]);

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
    setActiveCompanyMode(companyId);
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

  const handleEnterCompanyMode = (companyId: string) => {
    setActiveCompanyMode(companyId);
    setExpandedCompanies([companyId]);
    onSelectCompany(companyId);
    navigate(`/empresa?empresa=${companyId}`);
  };

  const handleExitCompanyMode = () => {
    setActiveCompanyMode(null);
    setExpandedCompanies([]);
    onSelectCompany(null);
    navigate('/dashboard');
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

  // Get the active company data
  const activeCompany = activeCompanyMode ? getCompanyById(activeCompanyMode) : null;

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
              {activeCompanyMode && activeCompany ? (
                <CompanyIcon companyId={activeCompany.id} icon={activeCompany.icon} size="lg" />
              ) : (
                <Rocket className="w-6 h-6 text-primary" />
              )}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <h1 className="font-bold text-lg text-sidebar-foreground neon-text truncate">
                  {activeCompanyMode && activeCompany ? activeCompany.name : 'IWIE Holding'}
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
          {/* Exit company mode button */}
          {activeCompanyMode && !isCollapsed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitCompanyMode}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Salir al Menú Principal
            </Button>
          )}

          {activeCompanyMode && isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExitCompanyMode}
                  className="w-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Salir al Menú Principal</TooltipContent>
            </Tooltip>
          )}

          {/* Show global menu only when NOT in company mode */}
          {!activeCompanyMode && (
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
          )}

          {/* Companies list or active company menu */}
          <div className="space-y-2">
            {!isCollapsed && !activeCompanyMode && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Empresas
              </p>
            )}
            
            {activeCompanyMode && activeCompany ? (
              // Active company mode - show only the menu items for this company based on permissions
              <div className="space-y-1">
                {!isCollapsed && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                    {activeCompany.name}
                  </p>
                )}
                {companyMenuItems
                  .filter((menuItem) => {
                    // Superadmins see everything
                    if (isSuperadmin) return true;
                    // Check if user has permission for this menu item
                    const visibility = profile?.dashboard_visibility;
                    if (!visibility) return false;
                    return visibility[menuItem.permission] === true;
                  })
                  .map((menuItem) => {
                    const Icon = menuItem.icon;
                    const currentParams = new URLSearchParams(location.search);
                    const isMenuActive = location.pathname === menuItem.path && 
                      currentParams.get('empresa') === activeCompanyMode &&
                      (!menuItem.section || currentParams.get('section') === menuItem.section);
                    
                    const button = (
                      <button
                        onClick={() => handleCompanyMenuClick(activeCompanyMode, menuItem)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          isMenuActive
                            ? "bg-primary/20 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="truncate">{menuItem.label}</span>}
                      </button>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={menuItem.label}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right">{menuItem.label}</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={menuItem.label}>{button}</div>;
                  })}
              </div>
            ) : (
              // Normal mode - show all companies
              companies.map((company) => {
                if (isCollapsed) {
                  // Collapsed view - just show company icon with tooltip
                  return (
                    <Tooltip key={company.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleEnterCompanyMode(company.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            selectedCompany === company.id 
                              ? "bg-primary/20 text-primary" 
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <CompanyIcon companyId={company.id} icon={company.icon} size="lg" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{company.name}</TooltipContent>
                    </Tooltip>
                  );
                }

                // Expanded view - show company name that can be clicked
                return (
                  <button
                    key={company.id}
                    onClick={() => handleEnterCompanyMode(company.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                      selectedCompany === company.id 
                        ? "bg-primary/20 text-primary" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <CompanyIcon companyId={company.id} icon={company.icon} size="lg" />
                    <span className="truncate text-sm flex-1 text-left">{company.name}</span>
                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })
            )}
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
