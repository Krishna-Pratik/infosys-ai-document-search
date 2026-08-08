import { motion } from 'framer-motion'
import { FileText, Layers, Boxes } from 'lucide-react'

const items = [
  { key: 'files', label: 'Files', icon: FileText },
  { key: 'pages', label: 'Pages', icon: Layers },
  { key: 'chunks', label: 'Chunks', icon: Boxes },
]

export function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ key, label, icon: Icon }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3.5 text-center"
        >
          <Icon className="mx-auto mb-1.5 h-4 w-4 text-brand-400" />
          <div className="text-2xl font-bold tabular-nums text-ink">
            {stats[key] ?? 0}
          </div>
          <div className="text-xs text-faint">{label}</div>
        </motion.div>
      ))}
    </div>
  )
}
