import { useQuery } from '@tanstack/react-query'
import { billingModelsAPI } from '../services/api'
import { BillingModel } from '../types'

export default function BillingModels() {
  const { data, isLoading } = useQuery({
    queryKey: ['billingModels'],
    queryFn: () => billingModelsAPI.getAll().then(res => res.data),
  })

  const models: BillingModel[] = data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing Models</h1>
        <p className="text-gray-600 mt-2">Configure billing models for vendors</p>
      </div>

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
