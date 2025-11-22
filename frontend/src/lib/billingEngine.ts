import { BillingModel, Trip } from '../types'

export interface BillingComputation {
  tripId: number
  baseFare: number
  distanceCharge: number
  extraKmCharge: number
  extraHourCharge: number
  incentiveAdjustment: number
  total: number
  driverPayout: number
  vendorMargin: number
  costModel: 'package' | 'trip_based' | 'hybrid'
  notes: string
}

export class BillingEstimator {
  private readonly baseIncentiveRate = 0.1

  constructor(private readonly model: BillingModel) {}

  compute(trip: Trip): BillingComputation {
    const distance = trip.distance_km || 0
    const duration = trip.duration_hours || 0
    const baseFare = this.resolveBaseFare(trip)
    const distanceCharge = this.resolveDistanceCharge(distance)
    const extraKmCharge = this.computeExtraKm(distance)
    const extraHourCharge = this.computeExtraHours(duration)
    const incentiveAdjustment = this.computeIncentives(distance, duration)
    const total = baseFare + distanceCharge + extraKmCharge + extraHourCharge + incentiveAdjustment
    const driverPayout = total * 0.75
    const vendorMargin = total - driverPayout

    return {
      tripId: trip.id,
      baseFare,
      distanceCharge,
      extraKmCharge,
      extraHourCharge,
      incentiveAdjustment,
      total,
      driverPayout,
      vendorMargin,
      costModel: this.model.model_type,
      notes: this.describeTradeOff(trip, total),
    }
  }

  static estimateComplexity(tripCount: number) {
    return {
      time: `O(${tripCount} log n)`,
      space: 'O(n)',
      rationale: 'Trips are bucketed per tenant before billing calculations, requiring a sort step before iterating',
    }
  }

  private resolveBaseFare(trip: Trip) {
    if (this.model.model_type === 'package') {
      return this.model.monthly_fixed_cost ? this.model.monthly_fixed_cost / (this.model.included_trips || 30) : 0
    }
    if (typeof trip.base_fare === 'number') {
      return trip.base_fare
    }
    return this.model.cost_per_trip || 0
  }

  private resolveDistanceCharge(distance: number) {
    if (this.model.model_type === 'package') {
      if (!this.model.included_trips) return 0
      const amortized = (this.model.monthly_fixed_cost || 0) / this.model.included_trips
      return distance > 25 ? amortized * 0.2 : 0
    }
    return distance * (this.model.cost_per_kilometer || 0)
  }

  private computeExtraKm(distance: number) {
    if (!this.model.extra_km_rate) return 0
    const threshold = 30
    return distance > threshold ? (distance - threshold) * this.model.extra_km_rate : 0
  }

  private computeExtraHours(duration: number) {
    if (!this.model.extra_hour_rate) return 0
    const threshold = 2
    return duration > threshold ? (duration - threshold) * this.model.extra_hour_rate : 0
  }

  private computeIncentives(distance: number, duration: number) {
    const stressFactor = distance > 35 || duration > 2.5 ? 1.5 : 1
    return stressFactor * this.baseIncentiveRate * (distance + duration)
  }

  private describeTradeOff(trip: Trip, total: number) {
    if (trip.status !== 'completed') {
      return 'Deferred billing until trip completion reduces reconciliation errors'
    }
    if (total > (trip.total_fare || 0)) {
      return 'Hybrid adjustment applied to protect vendor margins while keeping employee incentives predictable'
    }
    return 'Package amortization covered entire fare; efficiency gain booked as vendor margin'
  }
}
