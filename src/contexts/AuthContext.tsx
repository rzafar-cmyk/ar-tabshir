import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

/** Full-screen message shown when a user is not pre-registered. */
function UnauthorizedScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  useEffect(() => {
    // Auto sign-out after 8 seconds
    const timer = setTimeout(onSignOut, 8000);
    return () => clearTimeout(timer);
  }, [onSignOut]);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', fontFamily: 'sans-serif', background: '#f8fafc',
    }}>
      <div style={{
        maxWidth: 460, padding: '2.5rem', textAlign: 'center',
        background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <h2 style={{ margin: '0 0 12px', color: '#1e293b' }}>Access Denied</h2>
        <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 8px' }}>
          The email <strong>{email}</strong> is not authorized to access this application.
        </p>
        <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
          Please contact the Wak&#257;lat Tabsh&#299;r office to request access.
        </p>
        <button
          onClick={onSignOut}
          style={{
            padding: '10px 28px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15,
            fontWeight: 500,
          }}
        >
          Sign Out
        </button>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 16 }}>
          You will be signed out automatically in a few seconds.
        </p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const clerkId = clerkUser?.id ?? '';

  // Look up Convex user by Clerk ID (reactive — auto-updates)
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkId ? { clerkId } : 'skip'
  );

  // Mutation to link Clerk sign-in to pre-created Convex user
  const createOrUpdate = useMutation(api.users.createOrUpdateUser);

  // Track whether user is unauthorized (email not in Convex)
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState('');
  const [linkAttempted, setLinkAttempted] = useState(false);

  // When Clerk user is available but Convex user is not found, try to link by email
  useEffect(() => {
    if (!clerkUser || convexUser === undefined) return; // still loading
    if (convexUser !== null) {
      // User found — reset any unauthorized state
      setIsUnauthorized(false);
      setLinkAttempted(false);
      return;
    }
    if (linkAttempted) return; // already tried once

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    setLinkAttempted(true);

    createOrUpdate({
      clerkId: clerkUser.id,
      name: clerkUser.fullName ?? clerkUser.firstName ?? 'User',
      email,
    }).then((result) => {
      if (result === null) {
        // No matching pre-created user → not authorized
        setIsUnauthorized(true);
        setUnauthorizedEmail(email);
      }
      // If result is an ID, Convex reactivity will update convexUser automatically
    });
  }, [clerkUser, convexUser, createOrUpdate, linkAttempted]);

  // Reset linkAttempted when clerkUser changes (e.g., different account)
  useEffect(() => {
    setLinkAttempted(false);
    setIsUnauthorized(false);
  }, [clerkUser?.id]);

  const handleSignOut = useCallback(() => {
    setIsUnauthorized(false);
    setLinkAttempted(false);
    signOut({ redirectUrl: '/' });
  }, [signOut]);

  // Show unauthorized screen
  if (isUnauthorized) {
    return <UnauthorizedScreen email={unauthorizedEmail} onSignOut={handleSignOut} />;
  }

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
    signOut({ redirectUrl: '/' });
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
