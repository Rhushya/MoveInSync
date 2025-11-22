interface FailureScenario {
  name: string
  detection: string
  recovery: string
  fallback: string
}

interface ResiliencyPlaybookProps {
  scenarios: FailureScenario[]
}

export default function ResiliencyPlaybook({ scenarios }: ResiliencyPlaybookProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Failure Recovery Procedures</h2>
      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <div key={scenario.name} className="border border-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
            <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">Detection:</span> {scenario.detection}</p>
            <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Recovery:</span> {scenario.recovery}</p>
            <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Fallback:</span> {scenario.fallback}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
