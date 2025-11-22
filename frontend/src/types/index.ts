export type UserRole = 'admin' | 'vendor' | 'employee' | 'finance' | 'operations'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  client_id?: number
  vendor_id?: number
  permissions?: string[]
}

export interface Client {
  id: number
  name: string
  code: string
  contact_email: string
  contact_phone?: string
  address?: string
  is_active: boolean
}

export interface Vendor {
  id: number
  client_id: number
  name: string
  code: string
  contact_email: string
  is_active: boolean
}

export interface Employee {
  id: number
  client_id: number
  employee_code: string
  full_name: string
  email: string
  department?: string
  is_active: boolean
}

export interface Trip {
  id: number
  client_id: number
  vendor_id: number
  employee_id: number
  trip_date: string
  pickup_location: string
  drop_location: string
  distance_km?: number
  duration_hours?: number
  base_fare?: number
  total_fare?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  is_billed: boolean
}

export interface Invoice {
  id: number
  invoice_number: string
  invoice_type: 'client' | 'vendor'
  client_id: number
  vendor_id?: number
  billing_period_start: string
  billing_period_end: string
  total_trips: number
  total_amount: number
  status: 'draft' | 'generated' | 'sent' | 'paid' | 'cancelled'
}

export interface BillingModel {
  id: number
  vendor_id: number
  name: string
  model_type: 'package' | 'trip_based' | 'hybrid'
  monthly_fixed_cost?: number
  included_trips?: number
  cost_per_trip?: number
  cost_per_kilometer?: number
  extra_km_rate?: number
  extra_hour_rate?: number
  is_active: boolean
}

export interface DashboardStats {
  total_clients: number
  total_vendors: number
  total_employees: number
  total_trips_today: number
  total_trips_month: number
  total_revenue_month: number
  pending_invoices: number
}

export interface ReportSummary {
  id: string
  type: 'client' | 'vendor' | 'employee' | 'trips'
  generatedAt: string
  generatedBy: string
  tenantName: string
  metadata: Record<string, string | number>
}

export interface MonitoringInsight {
  latencyMs: number
  failureRate: number
  cacheHitRatio: number
  lastIncidentAt?: string
  notes?: string
}
