import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { AuthProvider } from './contexts/AuthContext'
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
        afterSignInUrl="/ar-tabshir/"
        afterSignUpUrl="/ar-tabshir/"
        afterSignOutUrl="/ar-tabshir/"
        signInForceRedirectUrl="/ar-tabshir/"
        signUpForceRedirectUrl="/ar-tabshir/"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <SignedOut>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
              <SignIn routing="hash" forceRedirectUrl="/ar-tabshir/" />
            </div>
          </SignedOut>
          <SignedIn>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SignedIn>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  )
}
