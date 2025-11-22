import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface RoleGateProps {
  allow: Array<'admin' | 'vendor' | 'employee' | 'finance' | 'operations'>
  fallback?: ReactNode
  children: ReactNode
}

export default function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
  const { hasRole } = useAuth()
  if (!hasRole(allow)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
