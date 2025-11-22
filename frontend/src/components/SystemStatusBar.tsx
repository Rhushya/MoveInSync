import { Activity, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react'
import { useSystemHealth } from '../hooks/useSystemHealth'
import { useCacheDiagnostics } from '../hooks/useCacheDiagnostics'

interface SystemStatusBarProps {
  watchKeys?: Array<string | readonly unknown[]>
}

export default function SystemStatusBar({ watchKeys = [] }: SystemStatusBarProps) {
  const { snapshot, failureRate, cacheHitRatio, isOnline } = useSystemHealth()
  const diagnostics = useCacheDiagnostics(watchKeys)

  return (
    <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 flex flex-wrap gap-4 items-center shadow-sm">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary-600" />
        <span className="text-sm text-gray-700">Latency: {snapshot.avgLatencyMs.toFixed(1)} ms</span>
      </div>
      <div className="flex items-center gap-2">
        {failureRate > 5 ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        )}
        <span className="text-sm text-gray-700">Failures: {failureRate}%</span>
      </div>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-rose-500" />
        )}
        <span className="text-sm text-gray-700">{isOnline ? 'Online' : 'Offline fallback'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500">Cache Hit Ratio</span>
        <span className="text-sm text-gray-900">{cacheHitRatio}%</span>
      </div>
      {diagnostics.map((entry) => (
        <div key={entry.key} className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1">
          {entry.key}: {entry.isFetching ? 'refreshing' : 'cached'}
        </div>
      ))}
    </div>
  )
}
