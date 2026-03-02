import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'desk_incharge' | 'country_rep';
  status: 'active' | 'inactive';
  assignedCountries?: string[];
  assignedDesk?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  logout: () => void;
  /** Re-fetches are automatic via Convex reactivity. */
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const clerkId = clerkUser?.id ?? '';

  // Look up Convex user by Clerk ID (reactive — auto-updates)
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkId ? { clerkId } : 'skip'
  );

  // Mutation to create/update user on sign-in
  const createOrUpdate = useMutation(api.users.createOrUpdateUser);

  // When Clerk user is available but Convex user is not found, create one
  useEffect(() => {
    if (!clerkUser || convexUser === undefined) return; // still loading
    if (convexUser === null) {
      // User signed in via Clerk but has no Convex record yet
      createOrUpdate({
        clerkId: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.firstName ?? 'User',
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      });
    }
  }, [clerkUser, convexUser, createOrUpdate]);

  // Also sync name/email on every sign-in (handled by createOrUpdateUser mutation)
  useEffect(() => {
    if (!clerkUser || !convexUser) return;
    createOrUpdate({
      clerkId: clerkUser.id,
      name: clerkUser.fullName ?? clerkUser.firstName ?? 'User',
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    });
    // Only run once when both are available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id]);

  // Build the AuthUser from Convex data
  const user: AuthUser | null = convexUser
    ? {
        id: convexUser._id,
        name: convexUser.name,
        email: convexUser.email,
        role: convexUser.role,
        status: convexUser.isActive ? 'active' : 'inactive',
        assignedCountries: convexUser.assignedCountries,
        assignedDesk: convexUser.assignedDesk,
      }
    : null;

  const logout = () => {
    signOut({ redirectUrl: '/ar-tabshir/' });
  };

  // refreshUser is a no-op — Convex queries are reactive and auto-refresh
  const refreshUser = () => {};

  return (
    <AuthContext.Provider value={{ user, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
