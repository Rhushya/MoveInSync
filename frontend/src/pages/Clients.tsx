import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { clientsAPI } from '../services/api'
import { Client } from '../types'
import { Plus, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'

export default function Clients() {
  const { selectedTenantId } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', contact_email: '' })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [`clients-${selectedTenantId || 'all'}`],
    queryFn: () => clientsAPI.getAll().then(res => res.data),
    meta: { ttl: 1000 * 60 * 5 },
  })

  const mutation = useMutation({
    mutationFn: clientsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`clients-${selectedTenantId || 'all'}`] })
      setForm({ name: '', code: '', contact_email: '' })
      setFormVisible(false)
    },
  })

  const clients: Client[] = (data || []).filter((client: Client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">Manage your client organizations</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input
              type="search"
              placeholder="Search client or code"
              className="px-4 py-2 border border-gray-300 rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isFetching && <RefreshCw className="animate-spin w-4 h-4 text-gray-400 absolute right-2 top-3" />}
          </div>
          <button
            onClick={() => setFormVisible((prev) => !prev)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-primary-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            {formVisible ? 'Close' : 'Add Client'}
          </button>
        </div>
      </div>

      <InlineAlert
        title="Tenant Aware Operations"
        description="Creation is scoped to the tenant selected in the status bar. Any cached client list invalidates automatically to keep reports auditable."
      />

      {formVisible && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg"
          >
            {mutation.isPending ? 'Saving...' : 'Save Client'}
          </button>
          {mutation.isError && (
            <InlineAlert
              variant="error"
              title="Client creation failed"
              description={(mutation.error as any)?.response?.data?.detail || 'Ensure the code is unique and try again.'}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.contact_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
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
