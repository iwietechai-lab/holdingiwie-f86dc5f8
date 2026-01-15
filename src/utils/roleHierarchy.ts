import { AppRole, APP_ROLE_PRIORITY } from '@/types/superadmin';
import { DashboardVisibility } from '@/types/superadmin';

// Define which roles can manage which other roles
// Each role can only assign roles with LOWER priority than their own
export const ROLE_HIERARCHY: Record<AppRole, number> = APP_ROLE_PRIORITY;

// Get the priority of a role (higher number = more permissions)
export const getRolePriority = (role: AppRole | string | null): number => {
  if (!role) return 0;
  return ROLE_HIERARCHY[role as AppRole] ?? 0;
};

// Check if a user can modify another user's permissions
export const canModifyUser = (
  currentUserRole: AppRole | string | null,
  targetUserRole: AppRole | string | null,
  isSuperadmin: boolean
): boolean => {
  // Superadmins can modify anyone
  if (isSuperadmin) return true;
  
  const currentPriority = getRolePriority(currentUserRole);
  const targetPriority = getRolePriority(targetUserRole);
  
  // Can only modify users with LOWER priority
  return currentPriority > targetPriority;
};

// Check if a user can assign a specific role
export const canAssignRole = (
  currentUserRole: AppRole | string | null,
  roleToAssign: AppRole | string,
  isSuperadmin: boolean
): boolean => {
  // Superadmins can assign any role
  if (isSuperadmin) return true;
  
  // Nobody except superadmin can assign superadmin
  if (roleToAssign === 'superadmin') return false;
  
  // CEO can assign any role except superadmin
  if (currentUserRole === 'ceo') return true;
  
  const currentPriority = getRolePriority(currentUserRole);
  const assignPriority = getRolePriority(roleToAssign);
  
  // Can only assign roles with LOWER priority than current user
  return currentPriority > assignPriority;
};

// Get roles that a user can assign based on their own role
export const getAssignableRoles = (
  currentUserRole: AppRole | string | null,
  isSuperadmin: boolean
): AppRole[] => {
  const allRoles: AppRole[] = [
    'superadmin', 'ceo', 'gerente_area', 'lider_area', 
    'jefe_area', 'jefe_seccion', 'colaborador', 'investigador', 'asesor'
  ];
  
  return allRoles.filter(role => canAssignRole(currentUserRole, role, isSuperadmin));
};

// Permissions that require CEO/superadmin to modify
const ADMIN_ONLY_PERMISSIONS: (keyof DashboardVisibility)[] = [
  'gestionar_usuarios',
  'gestionar_conocimiento',
  'ver_reportes',
  'ver_logs',
  'acceso_chatbot_ceo',
];

// Check if a user can modify a specific permission
export const canModifyPermission = (
  permission: keyof DashboardVisibility,
  currentUserRole: AppRole | string | null,
  isSuperadmin: boolean
): boolean => {
  // Superadmins and CEOs can modify all permissions
  if (isSuperadmin || currentUserRole === 'ceo') return true;
  
  // Other roles cannot modify admin-only permissions
  if (ADMIN_ONLY_PERMISSIONS.includes(permission)) return false;
  
  // Gerentes and líderes can modify basic permissions
  const managerRoles: AppRole[] = ['gerente_area', 'lider_area', 'jefe_area'];
  return managerRoles.includes(currentUserRole as AppRole);
};

// Get permissions that a user can modify based on their role
export const getModifiablePermissions = (
  currentUserRole: AppRole | string | null,
  isSuperadmin: boolean
): (keyof DashboardVisibility)[] => {
  const allPermissions: (keyof DashboardVisibility)[] = [
    'ver_dashboard', 'ver_ventas', 'ver_documentos', 'ver_chat_interno',
    'ver_tareas', 'ver_tickets', 'ver_reuniones', 'ver_estructura_org',
    'acceso_chatbot_empresa', 'acceso_chatbot_ceo',
    'gestionar_usuarios', 'gestionar_conocimiento', 'ver_reportes', 'ver_logs'
  ];
  
  return allPermissions.filter(perm => canModifyPermission(perm, currentUserRole, isSuperadmin));
};

// Filter permissions to only include those the user cannot have higher than the granting user
export const filterPermissionsForRole = (
  permissions: DashboardVisibility,
  currentUserRole: AppRole | string | null,
  isSuperadmin: boolean
): DashboardVisibility => {
  const modifiable = getModifiablePermissions(currentUserRole, isSuperadmin);
  const filtered = { ...permissions };
  
  // Ensure non-modifiable permissions are not granted
  for (const key of Object.keys(filtered) as (keyof DashboardVisibility)[]) {
    if (!modifiable.includes(key)) {
      filtered[key] = false;
    }
  }
  
  return filtered;
};

// Check if user is trying to edit themselves
export const isSelfEdit = (
  currentUserId: string | null | undefined,
  targetUserId: string | null
): boolean => {
  if (!currentUserId || !targetUserId) return false;
  return currentUserId === targetUserId;
};
