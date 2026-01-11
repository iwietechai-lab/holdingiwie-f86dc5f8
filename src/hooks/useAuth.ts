import { useState, useEffect, useCallback } from 'react';
import { User, AuthState, AccessLog } from '@/types/auth';

const STORAGE_KEYS = {
  USER: 'iwie_user',
  ACCESS_LOGS: 'iwie_access_logs',
};

// Default superadmin user
const SUPERADMIN: User = {
  id: 'mauricio-ceo',
  email: 'mauricio@iwie.com',
  name: 'Mauricio',
  role: 'superadmin',
  createdAt: new Date().toISOString(),
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logAccess = useCallback(async (userId: string, success: boolean) => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      }).catch(() => null);

      const log: AccessLog = {
        id: crypto.randomUUID(),
        userId,
        timestamp: new Date().toISOString(),
        location: position ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        } : undefined,
        userAgent: navigator.userAgent,
        success,
      };

      const existingLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCESS_LOGS) || '[]');
      existingLogs.unshift(log);
      localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(existingLogs.slice(0, 100)));

      return log;
    } catch (error) {
      console.error('Error logging access:', error);
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate authentication
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for superadmin
    if (email === 'mauricio@iwie.com' && password === 'admin123') {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(SUPERADMIN));
      await logAccess(SUPERADMIN.id, true);
      setAuthState({
        user: SUPERADMIN,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    // Check for demo users
    const demoUsers: Record<string, User> = {
      'manager@iwie.com': {
        id: 'demo-manager',
        email: 'manager@iwie.com',
        name: 'Demo Manager',
        role: 'manager',
        companyId: 'iwie-drones',
        createdAt: new Date().toISOString(),
      },
      'employee@iwie.com': {
        id: 'demo-employee',
        email: 'employee@iwie.com',
        name: 'Demo Employee',
        role: 'employee',
        companyId: 'iwie-drones',
        departmentId: 'operations',
        createdAt: new Date().toISOString(),
      },
    };

    const demoUser = demoUsers[email];
    if (demoUser && password === 'demo123') {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
      await logAccess(demoUser.id, true);
      setAuthState({
        user: demoUser,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    return { success: false, error: 'Credenciales inválidas' };
  }, [logAccess]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const getAccessLogs = useCallback((): AccessLog[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCESS_LOGS) || '[]');
    } catch {
      return [];
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    getAccessLogs,
  };
};
