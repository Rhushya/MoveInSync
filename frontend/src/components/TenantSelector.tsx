import { ChevronsUpDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function TenantSelector() {
  const { tenants, selectedTenantId, setSelectedTenantId, user } = useAuth()

  if (!tenants.length || !['admin', 'finance', 'operations'].includes(user?.role || '')) {
    return null
  }

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-gray-500 uppercase">Tenant</label>
      <button
        className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => {
          const nextTenantIndex = tenants.findIndex((tenant) => tenant.id === selectedTenantId)
          const nextTenant = tenants[(nextTenantIndex + 1) % tenants.length]
          setSelectedTenantId(nextTenant?.id)
        }}
      >
        <span>{tenants.find((tenant) => tenant.id === selectedTenantId)?.name || 'Select tenant'}</span>
        <ChevronsUpDown className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}
