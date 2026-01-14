import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Rocket,
  FolderOpen,
  ShieldAlert,
  Menu,
  X,
  Building2,
  ClipboardList,
  Bot,
  Calendar,
  Ticket,
  MessageSquare,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies } from '@/data/companies';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InDevelopmentModal } from '@/components/InDevelopmentModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';
import { VerificationStatusBadge } from '@/components/FacialVerificationGuard';

interface MobileNavProps {
  selectedCompany: string | null;
  onSelectCompany: (companyId: string | null) => void;
}

export const MobileNav = ({ selectedCompany, onSelectCompany }: MobileNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout, user } = useSupabaseAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFeatureName, setDevFeatureName] = useState('Esta sección');

  const isSuperadmin = user?.id === SUPERADMIN_USER_ID;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDevClick = (featureName: string) => {
    setDevFeatureName(featureName);
    setShowDevModal(true);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard Global', action: 'navigate', path: '/dashboard' },
    { icon: Building2, label: 'Dashboard Empresa', action: 'navigate', path: '/empresa' },
    { icon: ClipboardList, label: 'Tareas', action: 'navigate', path: '/tareas' },
    { icon: Users, label: 'Usuarios', action: 'navigate', path: '/usuarios' },
    { icon: FolderOpen, label: 'Documentos', action: 'navigate', path: '/gestor-documentos' },
    { icon: Network, label: 'Organización', action: 'navigate', path: '/organizacion' },
    { icon: Bot, label: 'Chatbot CEO', action: 'navigate', path: '/ceo-chatbot' },
    { icon: Calendar, label: 'Reuniones', action: 'navigate', path: '/reuniones' },
    { icon: Ticket, label: 'Tickets', action: 'navigate', path: '/tickets' },
    { icon: MessageSquare, label: 'Mensajería', action: 'navigate', path: '/mensajeria' },
    { icon: BarChart3, label: 'Reportes', action: 'dev' },
    { icon: Settings, label: 'Configuración', action: 'dev' },
    ...(isSuperadmin
      ? [{ icon: ShieldAlert, label: 'Super Admin', action: 'navigate' as const, path: '/superadmin' }]
      : []),
  ];

  const handleNavigation = (item: typeof menuItems[0]) => {
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

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Menu items */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Menú Principal
              </p>
              {menuItems.map((item) => {
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

            {/* Companies */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                Empresas
              </p>

              <button
                onClick={() => {
                  onSelectCompany(null);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  selectedCompany === null
                    ? 'bg-primary/20 text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Building2 className="w-5 h-5 shrink-0" />
                <span className="truncate">Todas las empresas</span>
              </button>

              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    onSelectCompany(company.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    selectedCompany === company.id
                      ? 'bg-primary/20 text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <span className="text-xl shrink-0">{company.icon}</span>
                  <span className="truncate text-sm">{company.name}</span>
                </button>
              ))}
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
