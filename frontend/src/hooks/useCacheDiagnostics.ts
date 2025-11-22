import { useEffect, useState } from 'react'
import { QueryKey as ReactQueryKey, useQueryClient } from '@tanstack/react-query'
import { telemetry } from '../lib/telemetry'

export interface CacheDiagnostic {
  key: string
  lastUpdated?: number
  isFetching: boolean
  isStale?: boolean
  ttlSeconds?: number
}

type CacheKey = string | ReactQueryKey

const normalizeKey = (key: CacheKey): ReactQueryKey => (typeof key === 'string' ? [key] : key)

export function useCacheDiagnostics(keys: CacheKey[]) {
  const queryClient = useQueryClient()
  const [entries, setEntries] = useState<CacheDiagnostic[]>([])

  useEffect(() => {
    const updateEntries = () => {
      const diagnostics = keys.map((key) => {
        const state = queryClient.getQueryState(normalizeKey(key))
        if (state?.fetchStatus === 'fetching') {
          telemetry.recordCacheMiss()
        } else if (state?.dataUpdatedAt) {
          telemetry.recordCacheHit()
        }
        const label: string = typeof key === 'string' ? key : JSON.stringify(key)
        return {
          key: label,
          lastUpdated: state?.dataUpdatedAt,
          isFetching: state?.fetchStatus === 'fetching',
          isStale: state?.isInvalidated,
          ttlSeconds: state?.dataUpdatedAt
            ? Math.max(0, Math.round((state.dataUpdatedAt + 1000 * 60 - Date.now()) / 1000))
            : undefined,
        }
      })
      setEntries(diagnostics)
    }

    updateEntries()
    const unsubscribe = queryClient.getQueryCache().subscribe(updateEntries)
    return () => unsubscribe()
  }, [queryClient, JSON.stringify(keys)])

  return entries
}
