import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { vendorsAPI } from '../services/api'
import { Vendor } from '../types'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'
import { Plus, Trash2 } from 'lucide-react'

export default function Vendors() {
  const { selectedTenantId } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', contact_email: '', contact_phone: '', address: '' })
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()

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

  const createMutation = useMutation({
    mutationFn: vendorsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`vendors-${selectedTenantId || 'all'}`] })
      setShowForm(false)
      setForm({ name: '', code: '', contact_email: '', contact_phone: '', address: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: vendorsAPI.delete,
    onMutate: () => setDeleteError(undefined),
    onError: (error: any) => setDeleteError(error?.response?.data?.detail || 'Unable to delete vendor'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`vendors-${selectedTenantId || 'all'}`] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
        <p className="text-gray-600 mt-2">Manage transportation vendors</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
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
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="ml-auto bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close form' : 'Add Vendor'}
        </button>
      </div>

      <InlineAlert
        variant="success"
        title="Caching"
        description="Vendor lookup responses remain cached for 10 minutes and are tenant isolated to maintain billing SLAs."
      />

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>
          {!selectedTenantId && (
            <InlineAlert
              variant="warning"
              title="Select a tenant"
              description="Choose a tenant from the status bar before creating a vendor."
            />
          )}
          <button
            onClick={() => createMutation.mutate({
              client_id: selectedTenantId,
              ...form,
            })}
            disabled={createMutation.isPending || !selectedTenantId}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Vendor'}
          </button>
        </div>
      )}

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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => deleteMutation.mutate(vendor.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleteMutation.isPending ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteError && (
        <InlineAlert variant="error" title="Unable to delete vendor" description={deleteError} />
      )}
    </div>
  )
}
