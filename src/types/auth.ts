export type UserRole = 'superadmin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  departmentId?: string;
  avatar?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  managerId?: string;
}

export interface AccessLog {
  id: string;
  userId: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  };
  userAgent: string;
  success: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
