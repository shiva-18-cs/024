import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../services/api';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  mine_id?: string;
  mine_name?: string;
  contractor_id?: string;
  contractor_name?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<AppUser>;
  logout: () => void;
  switchRole: (roleName: string) => Promise<AppUser>;
  isLoading: boolean;
}


const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('coalguard_token');
    if (storedToken) {
      // Validate the stored token against the backend before trusting it.
      // This handles cases where the DB was re-seeded and old UUIDs are invalid.
      setToken(storedToken);
      auth.me()
        .then((meData: any) => {
          setUser(meData);
          localStorage.setItem('coalguard_user', JSON.stringify(meData));
        })
        .catch(() => {
          // Stale or invalid token — clear everything so the login page shows
          localStorage.removeItem('coalguard_token');
          localStorage.removeItem('coalguard_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<AppUser> => {
    const data: any = await auth.login({ username_or_email: usernameOrEmail, password });
    localStorage.setItem('coalguard_token', data.access_token);
    localStorage.setItem('coalguard_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('coalguard_token');
    localStorage.removeItem('coalguard_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (roleName: string): Promise<AppUser> => {
    const data: any = await auth.switchRole(roleName);
    localStorage.setItem('coalguard_token', data.access_token);
    localStorage.setItem('coalguard_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };


  return (
    <AuthContext.Provider value={{ user, token, login, logout, switchRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
