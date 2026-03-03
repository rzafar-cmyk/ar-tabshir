import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { AuthProvider } from './contexts/AuthContext'
import { ConvexDataProvider } from './contexts/ConvexDataContext'
import './index.css'
import App from './App.tsx'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

if (!clerkPubKey) {
  createRoot(document.getElementById('root')!).render(
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p>Authentication configuration error. Please contact administrator.</p>
    </div>,
  )
} else {
  const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ClerkProvider
        publishableKey={clerkPubKey}
        afterSignInUrl="/"
        afterSignUpUrl="/"
        afterSignOutUrl="/"
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <SignedOut>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eff6ff 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1rem',
            }}>
              {/* Header */}
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                  }}>AR</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Annual Reports Dashboard</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Wak&#257;lat Tabsh&#299;r</div>
                  </div>
                </div>
              </div>

              {/* Clerk sign-in (handles both sign-in and sign-up) */}
              <SignIn routing="hash" forceRedirectUrl="/" />

              {/* Info notice */}
              <div style={{
                marginTop: '1.25rem', maxWidth: 400, textAlign: 'center',
                padding: '12px 20px', background: '#f0f9ff', borderRadius: 8,
                border: '1px solid #bae6fd',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#0369a1', lineHeight: 1.5 }}>
                  Only authorized users can access this application.
                  Contact the Wak&#257;lat Tabsh&#299;r office if you need access.
                </p>
              </div>
            </div>
          </SignedOut>
          <SignedIn>
            <AuthProvider>
              <ConvexDataProvider>
                <App />
              </ConvexDataProvider>
            </AuthProvider>
          </SignedIn>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  )
}
