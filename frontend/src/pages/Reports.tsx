import { useState } from 'react'
import { Download } from 'lucide-react'

export default function Reports() {
  const [reportType, setReportType] = useState('client')

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
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="client">Client Monthly Report</option>
              <option value="vendor">Vendor Payable Report</option>
              <option value="employee">Employee Incentives</option>
              <option value="trips">Trip Export</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <button className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center justify-center hover:bg-primary-700">
            <Download className="w-5 h-5 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        <div className="text-gray-500 text-center py-8">
          No reports generated yet
        </div>
      </div>
    </div>
  )
}
