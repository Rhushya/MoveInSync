import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { billingModelsAPI, vendorsAPI } from '../services/api'
import { BillingModel, Vendor } from '../types'
import InlineAlert from '../components/InlineAlert'

export default function BillingModels() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    vendor_id: '',
    name: '',
    model_type: 'package',
    monthly_fixed_cost: '',
    cost_per_trip: '',
  })
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['billingModels-all'],
    queryFn: () => billingModelsAPI.getAll().then(res => res.data),
  })

  const { data: vendors } = useQuery({
    queryKey: ['vendors-for-models'],
    queryFn: () => vendorsAPI.getAll().then(res => res.data),
  })

  const mutation = useMutation({
    mutationFn: billingModelsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingModels-all'] })
      setShowForm(false)
      setForm({ vendor_id: '', name: '', model_type: 'package', monthly_fixed_cost: '', cost_per_trip: '' })
    },
  })

  const models: BillingModel[] = data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing Models</h1>
        <p className="text-gray-600 mt-2">Configure billing models for vendors</p>
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
          <button
            onClick={() => mutation.mutate({
              vendor_id: Number(form.vendor_id),
              name: form.name,
              model_type: form.model_type as BillingModel['model_type'],
              monthly_fixed_cost: form.monthly_fixed_cost ? Number(form.monthly_fixed_cost) : undefined,
              cost_per_trip: form.cost_per_trip ? Number(form.cost_per_trip) : undefined,
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {models.map((model) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
