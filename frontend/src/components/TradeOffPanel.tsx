interface TradeOff {
  title: string
  decision: string
  impact: string
  rationale: string
}

interface TradeOffPanelProps {
  tradeOffs: TradeOff[]
}

export default function TradeOffPanel({ tradeOffs }: TradeOffPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Documented Trade-offs</h2>
      <div className="space-y-4">
        {tradeOffs.map((tradeOff) => (
          <div key={tradeOff.title} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{tradeOff.title}</h3>
              <span className="text-xs uppercase tracking-wide text-gray-500">{tradeOff.impact}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">Decision: {tradeOff.decision}</p>
            <p className="text-sm text-gray-500 mt-1">Why: {tradeOff.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
