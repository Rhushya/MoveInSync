interface InlineAlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title: string
  description?: string
}

const variants = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-rose-50 text-rose-800 border-rose-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
}

export default function InlineAlert({ variant = 'info', title, description }: InlineAlertProps) {
  return (
    <div className={`border rounded-lg px-4 py-3 ${variants[variant]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-sm opacity-80 mt-1">{description}</p>}
    </div>
  )
}
