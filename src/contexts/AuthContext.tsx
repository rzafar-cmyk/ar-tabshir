import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getUserByEmail, getUserById, type StoredUser } from '@/services/dataService';
import { verifyPassword } from '@/lib/crypto';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'desk_incharge' | 'country_rep';
  status: 'active' | 'inactive';
  assignedCountries?: string[];
  assignedDesk?: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** Refresh the current session from localStorage (call after editing a user). */
  refreshUser: () => void;
}

const SESSION_KEY = 'ar-tabshir-session';

/** Strip the password field so it never leaks into React state / localStorage. */
function toAuthUser(stored: StoredUser): AuthUser {
  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    role: stored.role,
    status: stored.status,
    assignedCountries: stored.assignedCountries,
    assignedDesk: stored.assignedDesk,
    phone: stored.phone,
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate session from localStorage on first render
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        // Re-read from the users store so edits are reflected
        const fresh = getUserById(parsed.id);
        return fresh ? toAuthUser(fresh) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Persist session whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  // Login reads from localStorage via dataService, hashes input to compare
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const found = getUserByEmail(email);
    if (!found) return { success: false, error: 'No account found with that email.' };
    const match = await verifyPassword(password, found.password);
    if (!match) return { success: false, error: 'Incorrect password.' };
    if (found.status === 'inactive') return { success: false, error: 'This account is inactive. Contact an administrator.' };
    setUser(toAuthUser(found));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Re-read the current user from localStorage (e.g. after admin edits their profile)
  const refreshUser = useCallback(() => {
    if (!user) return;
    const fresh = getUserById(user.id);
    if (fresh) {
      setUser(toAuthUser(fresh));
    } else {
      // User was deleted — force logout
      setUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
