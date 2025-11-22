import { useQuery } from '@tanstack/react-query'
import { tripsAPI } from '../services/api'
import { Trip } from '../types'

export default function Trips() {
  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsAPI.getAll().then(res => res.data),
  })

  const trips: Trip[] = data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trips</h1>
        <p className="text-gray-600 mt-2">View and manage all trips</p>
      </div>

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
