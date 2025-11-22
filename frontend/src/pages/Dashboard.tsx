import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../services/api'
import Card from '../components/Card'
import { Users, Truck, Route, FileText, DollarSign, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
  })

  const { data: trends } = useQuery({
    queryKey: ['tripTrends'],
    queryFn: () => dashboardAPI.getTripTrends(7).then(res => res.data),
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your billing system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Clients"
          value={stats?.total_clients || 0}
          icon={<Users className="w-8 h-8" />}
        />
        <Card
          title="Total Vendors"
          value={stats?.total_vendors || 0}
          icon={<Truck className="w-8 h-8" />}
        />
        <Card
          title="Trips Today"
          value={stats?.total_trips_today || 0}
          icon={<Route className="w-8 h-8" />}
        />
        <Card
          title="Trips This Month"
          value={stats?.total_trips_month || 0}
          icon={<Clock className="w-8 h-8" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Revenue This Month"
          value={`₹${(stats?.total_revenue_month || 0).toLocaleString()}`}
          icon={<DollarSign className="w-8 h-8" />}
        />
        <Card
          title="Pending Invoices"
          value={stats?.pending_invoices || 0}
          icon={<FileText className="w-8 h-8" />}
        />
      </div>

      {/* Trip Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Trip Trends (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0284c7" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
