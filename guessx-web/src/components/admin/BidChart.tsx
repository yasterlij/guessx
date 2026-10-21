import { useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { formatCurrency } from "../../mockDataV0"

export function BidChart({ amounts, total }: { amounts: number[]; total: number }) {
  const buckets = useMemo(() => {
    if (amounts.length === 0) return []
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)
    const range = max - min || 1
    const count = Math.min(8, amounts.length)
    const bucketSize = range / count
    const result = Array.from({ length: count }, (_, i) => {
      const start = min + i * bucketSize
      return { label: formatCurrency(Math.round(start)), count: 0 }
    })
    amounts.forEach((a) => {
      const idx = Math.min(Math.floor((a - min) / bucketSize), count - 1)
      result[idx].count++
    })
    return result
  }, [amounts])

  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <BarChart3 className="size-3" /> Bid Distribution
      </div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {buckets.map((b, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <div className="mb-0.5 text-[8px] font-bold text-awash-blue opacity-0 transition-opacity group-hover:opacity-100">{b.count}</div>
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-awash-gold/60 to-awash-gold-light/40 transition-all hover:from-awash-gold/80"
              style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[7px] text-neutral-400">
        <span>{buckets[0]?.label || ""}</span>
        <span>{buckets[buckets.length - 1]?.label || ""}</span>
      </div>
    </div>
  )
}
