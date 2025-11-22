import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { invoicesAPI } from '../services/api'
import { Invoice } from '../types'
import { useAuth } from '../hooks/useAuth'
import InlineAlert from '../components/InlineAlert'
import { Plus, Trash2 } from 'lucide-react'

export default function Invoices() {
  const { selectedTenantId } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Invoice['invoice_type']>('all')
  const [showForm, setShowForm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    invoice_type: 'client',
    vendor_id: '',
    billing_period_start: '',
    billing_period_end: '',
    base_amount: '',
    extra_charges: '',
    incentives: '',
    tax_amount: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: [`invoices-${selectedTenantId || 'all'}-${statusFilter}-${typeFilter}`],
    queryFn: () =>
      invoicesAPI.getAll({
        client_id: selectedTenantId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        invoice_type: typeFilter === 'all' ? undefined : typeFilter,
      }).then(res => res.data),
  })

  const invoices: Invoice[] = data || []

  const createMutation = useMutation({
    mutationFn: invoicesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`invoices-${selectedTenantId || 'all'}-${statusFilter}-${typeFilter}`] })
      setShowForm(false)
      setForm({ invoice_type: 'client', vendor_id: '', billing_period_start: '', billing_period_end: '', base_amount: '', extra_charges: '', incentives: '', tax_amount: '' })
    },
  })

  const invoiceFormIsValid = Boolean(
    selectedTenantId &&
    form.billing_period_start &&
    form.billing_period_end &&
    form.base_amount
  )

  const deleteMutation = useMutation({
    mutationFn: invoicesAPI.delete,
    onMutate: () => setDeleteError(undefined),
    onError: (error: any) => setDeleteError(error?.response?.data?.detail || 'Unable to delete invoice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`invoices-${selectedTenantId || 'all'}-${statusFilter}-${typeFilter}`] })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600 mt-2">Manage billing invoices</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All</option>
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="ml-auto bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Close form' : 'Create Invoice'}
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
              <select
                value={form.invoice_type}
                onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="client">Client</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor ID (optional)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.vendor_id}
                onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period Start</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.billing_period_start}
                onChange={(e) => setForm({ ...form, billing_period_start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period End</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.billing_period_end}
                onChange={(e) => setForm({ ...form, billing_period_end: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Base Amount</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.base_amount}
                onChange={(e) => setForm({ ...form, base_amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Extra Charges</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.extra_charges}
                onChange={(e) => setForm({ ...form, extra_charges: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Incentives</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.incentives}
                onChange={(e) => setForm({ ...form, incentives: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Amount</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.tax_amount}
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
              />
            </div>
          </div>
          {!selectedTenantId && (
            <InlineAlert variant="warning" title="Select a tenant" description="Choose a tenant in the status bar before generating invoices." />
          )}
          <button
            onClick={() => createMutation.mutate({
              invoice_type: form.invoice_type as Invoice['invoice_type'],
              client_id: selectedTenantId,
              vendor_id: form.vendor_id ? Number(form.vendor_id) : undefined,
              billing_period_start: form.billing_period_start ? new Date(form.billing_period_start).toISOString() : new Date().toISOString(),
              billing_period_end: form.billing_period_end ? new Date(form.billing_period_end).toISOString() : new Date().toISOString(),
              base_amount: Number(form.base_amount || 0),
              extra_charges: Number(form.extra_charges || 0),
              incentives: Number(form.incentives || 0),
              tax_amount: Number(form.tax_amount || 0),
            })}
            disabled={createMutation.isPending || !invoiceFormIsValid}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      )}

      <InlineAlert
        variant="success"
        title="Fault tolerant billing"
        description="Invoices can be filtered without reloading the page thanks to cached datasets and optimistic UI updates."
      />

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trips</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{invoice.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm uppercase">{invoice.invoice_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(invoice.billing_period_start).toLocaleDateString()} - {new Date(invoice.billing_period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{invoice.total_trips}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">₹{invoice.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => deleteMutation.mutate(invoice.id)}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleteMutation.isPending ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteError && (
        <InlineAlert variant="error" title="Unable to delete invoice" description={deleteError} />
      )}
    </div>
  )
}
