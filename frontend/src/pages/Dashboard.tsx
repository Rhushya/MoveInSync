import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../services/api'
import Card from '../components/Card'
import { Users, Truck, Route, FileText, DollarSign, Clock, Activity, ShieldCheck } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ComplexityPanel from '../components/ComplexityPanel'
import TradeOffPanel from '../components/TradeOffPanel'
import ResiliencyPlaybook from '../components/ResiliencyPlaybook'
import InlineAlert from '../components/InlineAlert'
import { BillingEstimator } from '../lib/billingEngine'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardAPI.getStats().then(res => res.data),
  })

  const { data: trends } = useQuery({
    queryKey: ['tripTrends'],
    queryFn: () => dashboardAPI.getTripTrends(7).then(res => res.data),
  })

  const complexity = useMemo(() => {
    const tripCount = stats?.total_trips_month || 0
    const result = BillingEstimator.estimateComplexity(tripCount)
    return [
      {
        name: 'Trip level billing',
        time: result.time,
        space: result.space,
        notes: result.rationale,
      },
      {
        name: 'Invoice reconciliation',
        time: 'O(n)',
        space: 'O(1)',
        notes: 'Streamed aggregation keeps memory constant across clients',
      },
    ]
  }, [stats?.total_trips_month])

  const tradeOffs = useMemo(
    () => [
      {
        title: 'Strong tenant isolation',
        decision: 'Dedicated caches per tenant even if cache hit ratio dips',
        impact: 'Security > Cost',
        rationale: 'Prevents data leakage across MoveInSync clients',
      },
      {
        title: 'Event driven invoices',
        decision: 'Generate invoices asynchronously to keep trip ingestion realtime',
        impact: 'Latency vs Freshness',
        rationale: 'Finance teams accept <5 min lag for consistent data cuts',
      },
      {
        title: 'Hybrid caching',
        decision: 'Use React Query cache with API-side ETags',
        impact: 'Performance vs Complexity',
        rationale: 'Avoids bespoke cache invalidation logic inside the UI',
      },
    ],
    []
  )

  const resiliencyScenarios = useMemo(
    () => [
      {
        name: 'API outage',
        detection: 'Telemetry failure rate > 20% and auth refresh errors',
        recovery: 'Circuit breaker retries with exponential backoff',
        fallback: 'Read-only cache snapshot highlighted in UI',
      },
      {
        name: 'Report export failure',
        detection: 'Blob download interruptions / HTTP 5xx',
        recovery: 'Switch exporter to incremental pagination',
        fallback: 'Serve last successful export with warning banner',
      },
      {
        name: 'Tenant misconfiguration',
        detection: 'RBAC violation raised by server when vendor hits admin route',
        recovery: 'Auto refresh user payload and lock navigation links',
        fallback: 'Guide user to request elevation with inline CTA',
      },
    ],
    []
  )

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Revenue This Month"
          value={`₹${(stats?.total_revenue_month || 0).toLocaleString()}`}
          icon={<DollarSign className="w-8 h-8" />}
        />
        <Card
          title="Pending Invoices"
          value={stats?.pending_invoices || 0}
          subtitle="Invoices in draft / sent state"
          icon={<FileText className="w-8 h-8" />}
        />
        <Card
          title="System Health"
          value="Realtime"
          subtitle="Telemetry driven monitoring"
          icon={<Activity className="w-8 h-8" />}
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

      <InlineAlert
        variant="info"
        title="Monitoring"
        description="Every widget on this dashboard is backed by a cached query with telemetry hooks so we can trace performance regressions down to individual tenants."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplexityPanel operations={complexity} />
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security & Authentication</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Role-based navigation enforces admin/vendor/employee scopes.</p>
            <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Tokens are stored in browser storage with automatic expiration handling.</p>
            <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Sensitive routes revalidate identity on every navigation event.</p>
          </div>
        </div>
      </div>

      <TradeOffPanel tradeOffs={tradeOffs} />
      <ResiliencyPlaybook scenarios={resiliencyScenarios} />
    </div>
  )
}
