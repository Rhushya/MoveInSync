import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { reportsAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { ReportSummary } from '../types'
import InlineAlert from '../components/InlineAlert'
import { useSystemHealth } from '../hooks/useSystemHealth'

export default function Reports() {
  const { user, selectedTenantId } = useAuth()
  const [reportType, setReportType] = useState<'client' | 'vendor' | 'employee' | 'trips'>('client')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [entityId, setEntityId] = useState('')
  const [recentReports, setRecentReports] = useState<ReportSummary[]>([])
  const { failureRate } = useSystemHealth()

  const mutation = useMutation({
    mutationFn: async () => {
      switch (reportType) {
        case 'client':
          return reportsAPI.getClientReport(Number(entityId || selectedTenantId), month, year)
        case 'vendor':
          return reportsAPI.getVendorReport(Number(entityId), month, year)
        case 'employee':
          return reportsAPI.getEmployeeIncentives(Number(entityId), month, year)
        case 'trips':
          const response = await reportsAPI.exportTrips(`${year}-${month}-01`, `${year}-${month}-28`, selectedTenantId)
          const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `trips-${year}-${month}.csv`
          a.click()
          return response
        default:
          return null
      }
    },
    onSuccess: (response) => {
      setRecentReports((prev) => [
        {
          id: crypto.randomUUID(),
          type: reportType,
          generatedAt: new Date().toISOString(),
          generatedBy: user?.full_name || 'system',
          tenantName: `${reportType === 'client' ? 'Client' : 'Entity'} ${entityId || selectedTenantId || ''}`,
          metadata: {
            month,
            year,
            latency: response?.headers?.['x-response-time'] || 'n/a',
          },
        },
        ...prev,
      ].slice(0, 5))
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-2">Generate and export billing reports</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="client">Client Monthly Report</option>
              <option value="vendor">Vendor Payable Report</option>
              <option value="employee">Employee Incentives</option>
              <option value="trips">Trip Export</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity ID (client/vendor/employee)</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={reportType === 'client' ? String(selectedTenantId || '') : 'Enter ID'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center justify-center hover:bg-primary-700 disabled:bg-gray-400"
          >
            {mutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
            {mutation.isPending ? 'Generating...' : 'Generate Report'}
          </button>
          {mutation.isError && (
            <InlineAlert
              variant="error"
              title="Report failed"
              description={(mutation.error as any)?.response?.data?.detail || 'Retry with a valid ID or check monitoring widgets.'}
            />
          )}
        </div>
      </div>

      <InlineAlert
        variant={failureRate > 10 ? 'warning' : 'info'}
        title="Monitoring"
        description={`Failure rate currently ${failureRate}%. Monitoring widgets automatically alert if exports degrade.`}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        {recentReports.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No reports generated yet
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 text-sm font-medium uppercase">{report.type}</td>
                  <td className="px-6 py-4 text-sm">{new Date(report.generatedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{report.generatedBy}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col text-xs text-gray-600">
                      {Object.entries(report.metadata).map(([key, value]) => (
                        <span key={key}>{key}: {value as string}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
