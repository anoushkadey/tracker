import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { UserProfile } from '../types'
import { watchAuthState } from '../services/authService'
import { getById } from '../services/store'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  setUser: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Watch for auth state changes
    const unsubscribe = watchAuthState(async (uid) => {
      if (uid) {
        const profile = await getById<UserProfile>('users', uid)
        setUser(profile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
