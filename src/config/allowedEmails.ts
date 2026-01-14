// Whitelist of allowed emails for registration with their auto-assigned roles and companies
export interface AllowedEmailConfig {
  email: string;
  role: string;
  company_id: string;
  department: string;
}

export const ALLOWED_EMAILS: AllowedEmailConfig[] = [
  {
    email: 'joel@iwie.space',
    role: 'Gerente Comercial',
    company_id: 'iwie-drones',
    department: 'Comercial',
  },
  {
    email: 'hernan@iwie.space',
    role: 'Líder de Área',
    company_id: 'iwie-drones',
    department: 'Operaciones',
  },
  {
    email: 'sebastian@iwie.space',
    role: 'Gerente Legal',
    company_id: 'iwie-legal',
    department: 'Legal',
  },
  {
    email: 'bruno@iwie.space',
    role: 'Líder de Área',
    company_id: 'iwie-energy',
    department: 'Energía',
  },
  {
    email: 'christopher@iwie.space',
    role: 'Gerente I+D+I',
    company_id: 'iwie-factory',
    department: 'Investigación y Desarrollo',
  },
  // CEO is already registered
  {
    email: 'mauricio@iwie.space',
    role: 'CEO Global',
    company_id: 'iwie-holding',
    department: 'Dirección General',
  },
  {
    email: 'cesar@iwie.space',
    role: 'Gerente de Operaciones',
    company_id: 'iwie-holding',
    department: 'Operaciones',
  },
  {
    email: 'paulo@iwie.space',
    role: 'Gerente Financiero',
    company_id: 'iwie-holding',
    department: 'Finanzas',
  },
];

// Default users with full platform access (can see all features like CEO)
// This list is used as fallback. Actual access is managed in user_profiles.has_full_access
export const DEFAULT_FULL_ACCESS_EMAILS = [
  'mauricio@iwie.space',
  'joel@iwie.space',
];

// Get full access emails list (for UI display)
export const getFullAccessEmails = (): string[] => {
  return [...DEFAULT_FULL_ACCESS_EMAILS];
};

export const hasFullAccess = (email: string, dbHasFullAccess?: boolean): boolean => {
  // If database value is provided, use it
  if (typeof dbHasFullAccess === 'boolean') {
    return dbHasFullAccess;
  }
  // Otherwise fall back to default list
  return DEFAULT_FULL_ACCESS_EMAILS.some(
    (allowedEmail) => allowedEmail.toLowerCase() === email.toLowerCase()
  );
};

export const isEmailAllowed = (email: string): boolean => {
  return ALLOWED_EMAILS.some(
    (config) => config.email.toLowerCase() === email.toLowerCase()
  );
};

export const getEmailConfig = (email: string): AllowedEmailConfig | undefined => {
  return ALLOWED_EMAILS.find(
    (config) => config.email.toLowerCase() === email.toLowerCase()
  );
};
