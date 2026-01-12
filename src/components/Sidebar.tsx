import { useState } from 'react';
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
  Rocket,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InDevelopmentModal } from '@/components/InDevelopmentModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface SidebarProps {
  selectedCompany: string | null;
  onSelectCompany: (companyId: string | null) => void;
}

export const Sidebar = ({ selectedCompany, onSelectCompany }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout } = useSupabaseAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFeatureName, setDevFeatureName] = useState('Esta sección');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDevClick = (featureName: string) => {
    setDevFeatureName(featureName);
    setShowDevModal(true);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', action: 'navigate', path: '/dashboard' },
    { icon: Users, label: 'Usuarios', action: 'navigate', path: '/usuarios' },
    { icon: BarChart3, label: 'Reportes', action: 'dev' },
    { icon: FolderOpen, label: 'Gestor de Documentos', action: 'navigate', path: '/gestor-documentos' },
    { icon: Settings, label: 'Configuración', action: 'dev' },
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
              <div className="overflow-hidden">
                <h1 className="font-bold text-lg text-sidebar-foreground neon-text truncate">
                  IWIE Holding
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.full_name || 'Usuario'} • {profile?.role || 'Usuario'}
                </p>
              </div>
            )}
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
          {/* Menu items */}
          <div className="space-y-2">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Menú Principal
              </p>
            )}
            {menuItems.map((item) => {
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

          {/* Companies list */}
          <div className="space-y-2">
            {!isCollapsed && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Empresas
              </p>
            )}
            
            {/* All companies option */}
            <button
              onClick={() => onSelectCompany(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                selectedCompany === null
                  ? "bg-primary/20 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Building2 className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">Todas las empresas</span>}
            </button>
            
            {/* Individual companies */}
            {companies.map((company) => {
              const isSelected = selectedCompany === company.id;
              
              const handleCompanyClick = () => {
                // Show dev modal instead of selecting company
                handleDevClick(`${company.name}`);
              };
              
              const button = (
                <button
                  key={company.id}
                  onClick={handleCompanyClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                    isSelected 
                      ? "bg-primary/20 text-primary" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <span className="text-xl shrink-0">{company.icon}</span>
                  {!isCollapsed && (
                    <span className="truncate text-sm">{company.name}</span>
                  )}
                </button>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={company.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{company.name}</TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={company.id}>{button}</div>;
            })}
          </div>
        </nav>

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
