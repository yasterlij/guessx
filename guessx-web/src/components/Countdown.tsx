import { useEffect, useState } from "react"
import { formatCountdown } from "../mockDataV0"

export function useCountdown(initialSeconds: number, running = true) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  return seconds
}

function getUrgencyLevel(seconds: number): "safe" | "warning" | "urgent" | "critical" {
  if (seconds <= 0) return "critical"
  if (seconds < 600) return "critical"
  if (seconds < 3600) return "urgent"
  if (seconds < 21600) return "warning"
  return "safe"
}

const urgencyStyles = {
  safe: {
    box: "bg-navy text-navy-foreground",
    label: "text-muted-foreground",
    pulse: "",
    ring: "ring-navy/20",
  },
  warning: {
    box: "bg-amber-500 text-white",
    label: "text-amber-600",
    pulse: "",
    ring: "ring-amber-400/40",
  },
  urgent: {
    box: "bg-orange-500 text-white",
    label: "text-orange-600",
    pulse: "animate-pulse",
    ring: "ring-orange-400/50",
  },
  critical: {
    box: "bg-red-500 text-white",
    label: "text-red-600",
    pulse: "animate-pulse",
    ring: "ring-red-400/60",
  },
}

export function Countdown({
  seconds,
  size = "md",
  labels = true,
  className,
  showUrgency = true,
}: {
  seconds: number
  size?: "sm" | "md" | "lg"
  labels?: boolean
  className?: string
  showUrgency?: boolean
}) {
  const { d, h, m, s } = formatCountdown(seconds)
  const parts = [
    { v: d, l: "DAYS" },
    { v: h, l: "HRS" },
    { v: m, l: "MIN" },
    { v: s, l: "SEC" },
  ]

  const box =
    size === "lg"
      ? "min-w-14 px-2.5 py-2 text-3xl"
      : size === "sm"
        ? "min-w-8 px-1.5 py-1 text-sm"
        : "min-w-11 px-2 py-1.5 text-xl"

  const level = getUrgencyLevel(seconds)
  const styles = showUrgency ? urgencyStyles[level] : urgencyStyles.safe

  return (
    <div className={`flex items-center gap-1.5 ${className || ""}`}>
      {parts.map((p, i) => (
        <div key={p.l} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg text-center font-display font-bold tabular-nums ${box} ${styles.box} ${styles.pulse} ring-1 ${styles.ring} transition-colors duration-500`}
            >
              {p.v}
            </div>
            {labels && (
              <span className={`mt-1 text-[9px] font-semibold tracking-widest ${styles.label} transition-colors duration-500`}>
                {p.l}
              </span>
            )}
          </div>
          {i < parts.length - 1 && (
            <span className="-mt-3 font-display text-lg font-bold text-navy/40">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function UrgencyPill({ seconds, className }: { seconds: number; className?: string }) {
  const level = getUrgencyLevel(seconds)
  const labels = { safe: "Plenty of time", warning: "Ending soon", urgent: "Ending shortly", critical: "Ending now!" }
  const colors = {
    safe: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 border-amber-200/60",
    urgent: "bg-orange-50 text-orange-700 border-orange-200/60",
    critical: "bg-red-50 text-red-700 border-red-200/60 animate-pulse",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${colors[level]} ${className || ""}`}>
      {labels[level]}
    </span>
  )
}
