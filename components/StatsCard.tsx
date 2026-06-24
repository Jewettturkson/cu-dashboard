import { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'emerald' | 'blue' | 'amber' | 'rose'
}

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald',
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
