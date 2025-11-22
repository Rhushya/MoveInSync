import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tripsAPI, billingModelsAPI } from '../services/api'
import { BillingModel, Trip } from '../types'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'
import { BillingEstimator } from '../lib/billingEngine'

type EnrichedTrip = Trip & {
  computed_total?: number
  computed_notes?: string
  vendor_margin?: number
}

export default function Trips() {
  const { selectedTenantId } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | Trip['status']>('all')

  const { data, isLoading } = useQuery({
    queryKey: [`trips-${selectedTenantId || 'all'}-${statusFilter}`],
    queryFn: () => tripsAPI.getAll({ client_id: selectedTenantId, status: statusFilter === 'all' ? undefined : statusFilter }).then(res => res.data),
  })

  const { data: modelsData } = useQuery({
    queryKey: [`billingModels-${selectedTenantId || 'all'}`],
    queryFn: () => billingModelsAPI.getAll().then(res => res.data),
  })

  const estimatorMap = useMemo(() => {
    const map = new Map<number, BillingEstimator>()
    ;(modelsData || []).forEach((model: BillingModel) => {
      map.set(model.vendor_id, new BillingEstimator(model))
    })
    return map
  }, [modelsData])

  const trips: EnrichedTrip[] = (data || []).map((trip: Trip) => {
    const estimator = estimatorMap.get(trip.vendor_id)
    if (!estimator) return trip
    const computation = estimator.compute(trip)
    return {
      ...trip,
      computed_total: computation.total,
      computed_notes: computation.notes,
      vendor_margin: computation.vendorMargin,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trips</h1>
        <p className="text-gray-600 mt-2">View and manage all trips</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <InlineAlert
        variant="warning"
        title="Billing Engine"
        description="Trip level costs are recomputed on the fly using the OOP-based BillingEstimator to highlight incentives, vendor margins, and system trade-offs."
      />

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projected Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(trip.trip_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{trip.pickup_location}</td>
                  <td className="px-6 py-4 text-sm">{trip.drop_location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{trip.distance_km} km</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">₹{trip.total_fare}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {trip.computed_total ? `₹${trip.computed_total.toFixed(2)}` : '—'}
                    {trip.computed_notes && (
                      <p className="text-xs text-gray-500">{trip.computed_notes}</p>
                    )}
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
