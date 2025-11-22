export interface TelemetrySnapshot {
  avgLatencyMs: number
  requestCount: number
  failureCount: number
  cacheHits: number
  cacheMisses: number
  lastErrorCode?: number
  lastErrorAt?: number
  lastSuccessAt?: number
  lastRequestAt?: number
}

export type TelemetryListener = (snapshot: TelemetrySnapshot) => void

const defaultSnapshot: TelemetrySnapshot = {
  avgLatencyMs: 0,
  requestCount: 0,
  failureCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
}

class TelemetryBus {
  private snapshot: TelemetrySnapshot = { ...defaultSnapshot }
  private listeners = new Set<TelemetryListener>()
  private latencySamples: number[] = []

  subscribe(listener: TelemetryListener) {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => this.listeners.delete(listener)
  }

  recordSuccess(latencyMs: number) {
    this.recordLatency(latencyMs)
    this.snapshot = {
      ...this.snapshot,
      requestCount: this.snapshot.requestCount + 1,
      lastSuccessAt: Date.now(),
      lastRequestAt: Date.now(),
    }
    this.broadcast()
  }

  recordFailure(latencyMs: number, statusCode?: number) {
    this.recordLatency(latencyMs)
    this.snapshot = {
      ...this.snapshot,
      requestCount: this.snapshot.requestCount + 1,
      failureCount: this.snapshot.failureCount + 1,
      lastErrorCode: statusCode,
      lastErrorAt: Date.now(),
      lastRequestAt: Date.now(),
    }
    this.broadcast()
  }

  recordCacheHit() {
    this.snapshot = {
      ...this.snapshot,
      cacheHits: this.snapshot.cacheHits + 1,
    }
    this.broadcast()
  }

  recordCacheMiss() {
    this.snapshot = {
      ...this.snapshot,
      cacheMisses: this.snapshot.cacheMisses + 1,
    }
    this.broadcast()
  }

  getSnapshot() {
    return this.snapshot
  }

  private recordLatency(latencyMs: number) {
    this.latencySamples = [...this.latencySamples.slice(-19), latencyMs]
    const avgLatencyMs = this.latencySamples.reduce((acc, cur) => acc + cur, 0) / this.latencySamples.length || 0
    this.snapshot = {
      ...this.snapshot,
      avgLatencyMs: Number(avgLatencyMs.toFixed(2)),
    }
  }

  private broadcast() {
    this.listeners.forEach((listener) => listener(this.snapshot))
  }
}

export const telemetry = new TelemetryBus()
