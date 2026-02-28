import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { AuthProvider } from './contexts/AuthContext'
import { ClerkLoginPage } from './components/auth/ClerkLoginPage'
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SignedOut>
          <ClerkLoginPage />
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
