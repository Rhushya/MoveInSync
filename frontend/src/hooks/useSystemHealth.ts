import { useEffect, useState } from 'react'
import { telemetry, TelemetrySnapshot } from '../lib/telemetry'

const defaultSnapshot = telemetry.getSnapshot()

export function useSystemHealth() {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(defaultSnapshot)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const unsubscribe = telemetry.subscribe(setSnapshot)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const failureRate = snapshot.requestCount
    ? Number(((snapshot.failureCount / snapshot.requestCount) * 100).toFixed(2))
    : 0

  const cacheHitRatio = snapshot.cacheHits + snapshot.cacheMisses === 0
    ? 0
    : Number((snapshot.cacheHits / (snapshot.cacheHits + snapshot.cacheMisses) * 100).toFixed(2))

  return {
    snapshot,
    failureRate,
    cacheHitRatio,
    isOnline,
    lastUpdated: snapshot.lastRequestAt,
  }
}
