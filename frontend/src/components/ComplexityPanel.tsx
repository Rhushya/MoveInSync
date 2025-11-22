interface ComplexityPanelProps {
  operations: Array<{
    name: string
    time: string
    space: string
    notes?: string
  }>
}

export default function ComplexityPanel({ operations }: ComplexityPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Cost Estimation (Time & Space)</h2>
      <div className="grid gap-4">
        {operations.map((operation) => (
          <div key={operation.name} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{operation.name}</h3>
              <span className="text-xs text-gray-500 uppercase">Time: {operation.time}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">Space: {operation.space}</p>
            {operation.notes && <p className="text-xs text-gray-500 mt-1">{operation.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
