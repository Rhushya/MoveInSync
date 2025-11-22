import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { vendorsAPI } from '../services/api'
import { Vendor } from '../types'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'

export default function Vendors() {
  const { selectedTenantId } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const { data, isLoading } = useQuery({
    queryKey: [`vendors-${selectedTenantId || 'all'}`],
    queryFn: () => vendorsAPI.getAll(selectedTenantId).then(res => res.data),
    meta: { ttl: 1000 * 60 * 10 },
  })

  const vendors: Vendor[] = useMemo(() => {
    const list = data || []
    if (statusFilter === 'all') return list
    return list.filter((vendor: Vendor) =>
      statusFilter === 'active' ? vendor.is_active : !vendor.is_active
    )
  }, [data, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
        <p className="text-gray-600 mt-2">Manage transportation vendors</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <InlineAlert
        variant="success"
        title="Caching"
        description="Vendor lookup responses remain cached for 10 minutes and are tenant isolated to maintain billing SLAs."
      />

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{vendor.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{vendor.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{vendor.contact_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
