// App roles enum - must match database enum
export type AppRole = 
  | 'superadmin'
  | 'ceo'
  | 'gerente_area'
  | 'lider_area'
  | 'jefe_area'
  | 'jefe_seccion'
  | 'colaborador'
  | 'investigador'
  | 'asesor';

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  superadmin: 'Super Admin',
  ceo: 'CEO',
  gerente_area: 'Gerente de Área',
  lider_area: 'Líder de Área',
  jefe_area: 'Jefe de Área',
  jefe_seccion: 'Jefe de Sección',
  colaborador: 'Colaborador',
  investigador: 'Investigador',
  asesor: 'Asesor',
};

export const APP_ROLE_PRIORITY: Record<AppRole, number> = {
  superadmin: 100,
  ceo: 90,
  gerente_area: 80,
  lider_area: 70,
  jefe_area: 60,
  jefe_seccion: 50,
  colaborador: 30,
  investigador: 20,
  asesor: 10,
};

// Dashboard visibility configuration
export interface DashboardVisibility {
  // Módulos principales
  ver_dashboard: boolean;
  ver_ventas: boolean;
  ver_documentos: boolean;
  ver_chat_interno: boolean;
  ver_tareas: boolean;
  ver_tickets: boolean;
  ver_reuniones: boolean;
  ver_estructura_org: boolean;
  // Chatbots
  acceso_chatbot_empresa: boolean;
  acceso_chatbot_ceo: boolean;
  // Gestión
  gestionar_usuarios: boolean;
  gestionar_conocimiento: boolean;
  ver_reportes: boolean;
  ver_logs: boolean;
}

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardVisibility = {
  ver_dashboard: true,
  ver_ventas: false,
  ver_documentos: true,
  ver_chat_interno: true,
  ver_tareas: true,
  ver_tickets: true,
  ver_reuniones: true,
  ver_estructura_org: false,
  acceso_chatbot_empresa: true,
  acceso_chatbot_ceo: false,
  gestionar_usuarios: false,
  gestionar_conocimiento: false,
  ver_reportes: false,
  ver_logs: false,
};

// Company from database
export interface DbCompany {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  created_at?: string;
}

// Department from database
export interface DbDepartment {
  id: string;
  name: string;
  company_id: string;
  description?: string;
  created_at?: string;
}

// User profile extended for superadmin
export interface SuperadminUserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  department_id: string | null;
  role: string | null;
  dashboard_visibility: DashboardVisibility | null;
  created_at: string | null;
  updated_at?: string | null;
}

// User role from database
export interface DbUserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at?: string;
}

// Combined user data for superadmin view
export interface SuperadminUser extends SuperadminUserProfile {
  roles: DbUserRole[];
  company?: DbCompany | null;
  department?: DbDepartment | null;
}

// Superadmin is now determined by user_roles table, not hardcoded UUID
// This is kept for backward compatibility but should not be used for auth checks
export const SUPERADMIN_USER_ID = 'e5251256-2f23-4613-8f07-22b149fbad72';
export const SUPERADMIN_EMAIL = 'mauricio@iwie.space';
