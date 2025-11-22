import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { billingModelsAPI, vendorsAPI } from '../services/api'
import { BillingModel, Vendor } from '../types'
import InlineAlert from '../components/InlineAlert'
import { Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import SystemStatusBar from '../components/SystemStatusBar'

export default function BillingModels() {
  const queryClient = useQueryClient()
  const { selectedTenantId } = useAuth()
  const [form, setForm] = useState({
    vendor_id: '',
    name: '',
    model_type: 'package',
    monthly_fixed_cost: '',
    cost_per_trip: '',
    effective_from: new Date().toISOString().slice(0, 10),
  })
  const [showForm, setShowForm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | BillingModel['model_type']>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['billingModels-all', selectedTenantId],
    queryFn: () => billingModelsAPI.getAll().then(res => res.data),
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors-for-models', selectedTenantId],
    queryFn: () => vendorsAPI.getAll(selectedTenantId).then(res => res.data),
  })

  const mutation = useMutation({
    mutationFn: billingModelsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingModels-all'] })
      setShowForm(false)
      setForm({ vendor_id: '', name: '', model_type: 'package', monthly_fixed_cost: '', cost_per_trip: '', effective_from: new Date().toISOString().slice(0, 10) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: billingModelsAPI.delete,
    onMutate: () => setDeleteError(undefined),
    onError: (error: any) => setDeleteError(error?.response?.data?.detail || 'Unable to delete billing model'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingModels-all'] })
    },
  })

  const models: BillingModel[] = data || []

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesType = typeFilter === 'all' || model.model_type === typeFilter
      const text = `${model.name} ${model.vendor_id}`.toLowerCase()
      return matchesType && text.includes(searchTerm.toLowerCase())
    })
  }, [models, searchTerm, typeFilter])

  const formPreview = useMemo(() => {
    if (!form.name || !form.vendor_id) {
      return 'Select a vendor and model name to see projected billing.'
    }
    const monthly = Number(form.monthly_fixed_cost || 0)
    const perTrip = Number(form.cost_per_trip || 0)
    const projection = monthly + perTrip * 20
    return `If the vendor runs 20 trips during the period starting ${form.effective_from}, total payout will be approximately ₹${projection.toFixed(2)}.`
  }, [form])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing Models</h1>
        <p className="text-gray-600 mt-2">Configure billing models for vendors</p>
      </div>

      <SystemStatusBar watchKeys={[['billingModels-all', selectedTenantId]]} />

      <div className="flex flex-wrap gap-4 items-center">
        <input
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Search vendor or model"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All types</option>
          <option value="package">Package</option>
          <option value="trip_based">Trip based</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <button
        onClick={() => setShowForm((prev) => !prev)}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
      >
        {showForm ? 'Close form' : 'Add Billing Model'}
      </button>

      <InlineAlert
        variant="info"
        title="OOP powered configuration"
        description="Billing models feed directly into the BillingEstimator class so every edit is tracked, cached, and auditable."
      />

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
              <select
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select vendor</option>
                {(vendors || []).map((vendor: Vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={form.model_type}
                onChange={(e) => setForm({ ...form, model_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="package">Package</option>
                <option value="trip_based">Trip Based</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Fixed Cost</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.monthly_fixed_cost}
                onChange={(e) => setForm({ ...form, monthly_fixed_cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cost per Trip</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.cost_per_trip}
                onChange={(e) => setForm({ ...form, cost_per_trip: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Effective From</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.effective_from}
              onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
            />
          </div>
          <InlineAlert variant="info" title="Live projection" description={formPreview} />
          <button
            onClick={() => mutation.mutate({
              vendor_id: Number(form.vendor_id),
              name: form.name,
              model_type: form.model_type as BillingModel['model_type'],
              monthly_fixed_cost: form.monthly_fixed_cost ? Number(form.monthly_fixed_cost) : undefined,
              cost_per_trip: form.cost_per_trip ? Number(form.cost_per_trip) : undefined,
              effective_from: new Date(form.effective_from || new Date().toISOString()).toISOString(),
            })}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save Model'}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixed Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Trip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredModels.map((model) => (
                <tr key={model.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{model.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm uppercase">{model.model_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">₹{model.monthly_fixed_cost || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">₹{model.cost_per_trip || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${model.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => deleteMutation.mutate(model.id)}
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
        <InlineAlert variant="error" title="Delete failed" description={deleteError} />
      )}
    </div>
  )
}
