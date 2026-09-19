import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types.ts';
import { api, getAuthToken, setAuthToken } from '../api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setAuthToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    api.logout().catch(() => {});
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUserData,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
