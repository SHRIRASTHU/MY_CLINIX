import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterPayload } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getStoredUser());
  const [token, setToken] = useState<string | null>(authService.getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!authService.getStoredToken()) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
      setToken(authService.getStoredToken());
    } catch {
      authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await authService.login(credentials);
    setUser(res.user);
    setToken(res.access_token);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    setUser(res.user);
    setToken(res.access_token);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
