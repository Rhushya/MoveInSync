import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { authAPI, clientsAPI } from '../services/api'
import { Client, User } from '../types'
import { formatApiError } from '../lib/errorUtils'

interface AuthContextValue {
  user: User | null
  isBootstrapping: boolean
  isAuthenticated: boolean
  tenants: Client[]
  selectedTenantId?: number
  setSelectedTenantId: (id?: number) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: User['role'][]) => boolean
  refreshUser: () => Promise<void>
  bootstrapError?: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [tenants, setTenants] = useState<Client[]>([])
  const [selectedTenantId, setSelectedTenantIdState] = useState<number | undefined>(undefined)
  const [bootstrapError, setBootstrapError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const storedTenantId = localStorage.getItem('selectedTenantId')
    if (storedTenantId) {
      setSelectedTenantIdState(Number(storedTenantId))
    }
    const token = localStorage.getItem('token')
    if (!token) {
      setIsBootstrapping(false)
      return
    }
    bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsBootstrapping(true)
    try {
      const meResponse = await authAPI.getMe()
      const currentUser = meResponse.data as User
      setUser(currentUser)
      await hydrateTenants(currentUser)
      setBootstrapError(undefined)
    } catch (error: any) {
      localStorage.removeItem('token')
      setUser(null)
      setBootstrapError(formatApiError(error, 'Authentication expired'))
    } finally {
      setIsBootstrapping(false)
    }
  }

  const hydrateTenants = async (currentUser: User) => {
    try {
      if (['admin', 'finance', 'operations'].includes(currentUser.role)) {
        const response = await clientsAPI.getAll()
        const fetchedTenants = response.data as Client[]
        setTenants(fetchedTenants)
        if (!selectedTenantId && fetchedTenants.length) {
          updateSelectedTenant(fetchedTenants[0].id)
        }
      } else if (currentUser.client_id) {
        updateSelectedTenant(currentUser.client_id)
      }
    } catch (error) {
      console.error('Failed to hydrate tenants', error)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    localStorage.setItem('token', response.data.access_token)
    await bootstrap()
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('selectedTenantId')
    setUser(null)
    setTenants([])
    setSelectedTenantId(undefined)
  }

  const updateSelectedTenant = (id?: number) => {
    setSelectedTenantIdState(id)
    if (id) {
      localStorage.setItem('selectedTenantId', String(id))
    } else {
      localStorage.removeItem('selectedTenantId')
    }
  }

  const hasRole = (roles: User['role'][]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isBootstrapping,
    isAuthenticated: Boolean(user),
    tenants,
    selectedTenantId,
    setSelectedTenantId: updateSelectedTenant,
    login,
    logout,
    hasRole,
    refreshUser: bootstrap,
    bootstrapError,
  }), [user, isBootstrapping, tenants, selectedTenantId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
