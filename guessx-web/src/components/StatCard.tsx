import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
  trend?: { value: string; up: boolean }
  trendPct?: number
  accent?: "gold" | "blue" | "emerald" | "amber" | "red"
  delay?: number
  sparkline?: number[]
}

const accentMap = {
  gold: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20", glow: "hover:shadow-[0_8px_32px_rgba(200,166,66,0.15)]" },
  blue: { bg: "bg-awash-blue/10", text: "text-awash-blue", ring: "ring-awash-blue/20", glow: "hover:shadow-[0_8px_32px_rgba(0,43,92,0.12)]" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20", glow: "hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", ring: "ring-amber-500/20", glow: "hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)]" },
  red: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20", glow: "hover:shadow-[0_8px_32px_rgba(239,68,68,0.15)]" },
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 24
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ")
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StatCard({ icon, label, value, hint, trend, trendPct, accent = "blue", delay = 0, sparkline }: StatCardProps) {
  const a = accentMap[accent]
  const sparkColor = accent === "gold" ? "#0071e3" : accent === "blue" ? "#1d1d1f" : accent === "emerald" ? "#10B981" : accent === "amber" ? "#F59E0B" : "#EF4444"
  const trendDir = trendPct == null ? null : trendPct > 0 ? "up" : trendPct < 0 ? "down" : "flat"
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)] transition-all duration-300 ${a.glow} hover:border-primary/20`}
    >
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className={`flex size-11 items-center justify-center rounded-xl ${a.bg} ${a.text} ring-1 ${a.ring} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-destructive"
            }`}
          >
            {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        )}
        {trendDir && !trend && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trendDir === "up" ? "bg-emerald-50 text-emerald-600" : trendDir === "down" ? "bg-red-50 text-destructive" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {trendDir === "up" ? <TrendingUp className="size-3" /> : trendDir === "down" ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
            {trendPct! > 0 ? "+" : ""}{trendPct}%
          </span>
        )}
      </div>
      <p className="relative mt-3 font-display text-2xl font-extrabold tabular-nums text-awash-blue">{value}</p>
      <div className="relative flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-400">{label}</p>
          {hint && <p className="mt-1 text-[10px] font-medium text-neutral-300">{hint}</p>}
        </div>
        {sparkline && <Sparkline data={sparkline} color={sparkColor} />}
      </div>
    </motion.div>
  )
}
