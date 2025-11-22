import axios from 'axios'
import { telemetry } from '../lib/telemetry'
import type { UserRole } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const tenantId = localStorage.getItem('selectedTenantId')
  if (tenantId) {
    config.headers['X-Client-ID'] = tenantId
  } else {
    delete config.headers['X-Client-ID']
  }
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
  ;(config as any).metadata = { startTime }
  return config
})

api.interceptors.response.use(
  (response) => {
    const startTime = (response.config as any)?.metadata?.startTime || performance.now()
    const latency = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime)
    telemetry.recordSuccess(latency)
    return response
  },
  (error) => {
    const startTime = (error.config as any)?.metadata?.startTime || performance.now()
    const latency = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime)
    telemetry.recordFailure(latency, error.response?.status)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (data: { email: string; password: string; full_name: string; role: UserRole }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getTripTrends: (days: number = 7) => api.get(`/dashboard/trip-trends?days=${days}`),
}

export const clientsAPI = {
  getAll: (skip = 0, limit = 100) => api.get(`/clients?skip=${skip}&limit=${limit}`),
  getOne: (id: number) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: number, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
}

export const vendorsAPI = {
  getAll: (clientId?: number) => api.get('/vendors', { params: { client_id: clientId } }),
  getOne: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
}

export const tripsAPI = {
  getAll: (params?: any) => api.get('/trips', { params }),
  getOne: (id: number) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  update: (id: number, data: any) => api.put(`/trips/${id}`, data),
  complete: (id: number, data: any) => api.patch(`/trips/${id}/complete`, null, { params: data }),
  delete: (id: number) => api.delete(`/trips/${id}`),
}

export const invoicesAPI = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getOne: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
}

export const billingModelsAPI = {
  getAll: (vendorId?: number) => api.get('/billing-models', { params: { vendor_id: vendorId } }),
  getOne: (id: number) => api.get(`/billing-models/${id}`),
  create: (data: any) => api.post('/billing-models', data),
  update: (id: number, data: any) => api.put(`/billing-models/${id}`, data),
  delete: (id: number) => api.delete(`/billing-models/${id}`),
}

export const reportsAPI = {
  getClientReport: (clientId: number, month: number, year: number) =>
    api.get(`/reports/client/${clientId}/monthly`, { params: { month, year } }),
  getVendorReport: (vendorId: number, month: number, year: number) =>
    api.get(`/reports/vendor/${vendorId}/monthly`, { params: { month, year } }),
  getEmployeeIncentives: (employeeId: number, month: number, year: number) =>
    api.get(`/reports/employee/${employeeId}/incentives`, { params: { month, year } }),
  exportTrips: (startDate: string, endDate: string, clientId?: number) =>
    api.get('/reports/export/trips', {
      params: { start_date: startDate, end_date: endDate, client_id: clientId },
      responseType: 'blob',
    }),
}

export default api
