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
  ver_perfiles: boolean;
  ver_empresas: boolean;
  ver_reportes: boolean;
  ver_documentos: boolean;
  ver_chatbot: boolean;
  ver_logs: boolean;
  editar_usuarios: boolean;
  gestionar_roles: boolean;
}

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardVisibility = {
  ver_perfiles: false,
  ver_empresas: false,
  ver_reportes: false,
  ver_documentos: true,
  ver_chatbot: true,
  ver_logs: false,
  editar_usuarios: false,
  gestionar_roles: false,
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
  avatar_url: string | null;
  company_id: string | null;
  department_id: string | null;
  position: string | null;
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
