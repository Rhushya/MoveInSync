import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tripsAPI, billingModelsAPI } from '../services/api'
import { BillingModel, Trip } from '../types'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'
import { BillingEstimator } from '../lib/billingEngine'
import { Plus, Trash2 } from 'lucide-react'

type EnrichedTrip = Trip & {
  computed_total?: number
  computed_notes?: string
  vendor_margin?: number
}

export default function Trips() {
  const { selectedTenantId } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | Trip['status']>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    vendor_id: '',
    employee_id: '',
    trip_date: '',
    pickup_location: '',
    drop_location: '',
    pickup_time: '',
    drop_time: '',
    distance_km: '',
    duration_hours: '',
  })
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()

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

  const createMutation = useMutation({
    mutationFn: tripsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`trips-${selectedTenantId || 'all'}-${statusFilter}`] })
      setShowForm(false)
      setForm({ vendor_id: '', employee_id: '', trip_date: '', pickup_location: '', drop_location: '', pickup_time: '', drop_time: '', distance_km: '', duration_hours: '' })
    },
  })

  const tripFormIsValid = Boolean(
    selectedTenantId &&
    form.vendor_id &&
    form.employee_id &&
    form.trip_date &&
    form.pickup_location &&
    form.drop_location
  )

  const deleteMutation = useMutation({
    mutationFn: tripsAPI.delete,
    onMutate: () => setDeleteError(undefined),
    onError: (error: any) => setDeleteError(error?.response?.data?.detail || 'Unable to delete trip'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`trips-${selectedTenantId || 'all'}-${statusFilter}`] })
    },
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
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="ml-auto bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close form' : 'Add Trip'}
        </button>
      </div>


      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor ID</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trip Date</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.trip_date}
                onChange={(e) => setForm({ ...form, trip_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.pickup_location}
                onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drop Location</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.drop_location}
                onChange={(e) => setForm({ ...form, drop_location: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.pickup_time}
                onChange={(e) => setForm({ ...form, pickup_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drop Time</label>
              <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.drop_time}
                onChange={(e) => setForm({ ...form, drop_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Distance (km)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hrs)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.duration_hours}
                onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
              />
            </div>
          </div>
          {!selectedTenantId && (
            <InlineAlert variant="warning" title="Select a tenant" description="Choose a tenant in the status bar before creating trips." />
          )}
          <button
            onClick={() => createMutation.mutate({
              client_id: selectedTenantId,
              vendor_id: Number(form.vendor_id),
              employee_id: Number(form.employee_id),
              trip_date: form.trip_date ? new Date(form.trip_date).toISOString() : new Date().toISOString(),
              pickup_location: form.pickup_location,
              drop_location: form.drop_location,
              pickup_time: form.pickup_time ? new Date(form.pickup_time).toISOString() : undefined,
              drop_time: form.drop_time ? new Date(form.drop_time).toISOString() : undefined,
              distance_km: form.distance_km ? Number(form.distance_km) : undefined,
              duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
            })}
            disabled={createMutation.isPending || !tripFormIsValid}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </div>
      )}
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => deleteMutation.mutate(trip.id)}
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
        <InlineAlert variant="error" title="Unable to delete trip" description={deleteError} />
      )}
    </div>
  )
}
