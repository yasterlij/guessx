import { useState, useMemo } from "react"
import { Calendar } from "lucide-react"

export type AdminDatePreset = "today" | "7d" | "30d" | "quarter" | "year" | "all" | "custom"

export interface DateBounds {
  start: string
  end: string
}

export const DATE_PRESETS: Array<{ id: AdminDatePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "quarter", label: "Quarter" },
  { id: "all", label: "All Time" },
]

export function computeDateBounds(preset: AdminDatePreset, customStart?: string, customEnd?: string): DateBounds {
  const end = new Date()
  if (preset === "custom" && customStart) {
    const s = new Date(customStart)
    const e = customEnd ? new Date(customEnd) : end
    return { start: s.toISOString(), end: e.toISOString() }
  }
  if (preset === "today") {
    const start = new Date(end)
    start.setHours(0, 0, 0, 0)
    return { start: start.toISOString(), end: end.toISOString() }
  }
  if (preset === "7d") {
    return { start: new Date(end.getTime() - 7 * 86400000).toISOString(), end: end.toISOString() }
  }
  if (preset === "30d") {
    return { start: new Date(end.getTime() - 30 * 86400000).toISOString(), end: end.toISOString() }
  }
  if (preset === "quarter") {
    return { start: new Date(end.getTime() - 90 * 86400000).toISOString(), end: end.toISOString() }
  }
  if (preset === "year") {
    return { start: new Date(end.getTime() - 365 * 86400000).toISOString(), end: end.toISOString() }
  }
  return { start: new Date(0).toISOString(), end: end.toISOString() }
}

export function AdminDateFilter({
  selectedPreset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomChange,
  className = "",
}: {
  selectedPreset: AdminDatePreset
  onPresetChange: (preset: AdminDatePreset) => void
  customStart?: string
  customEnd?: string
  onCustomChange?: (start: string, end: string) => void
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <div className="flex items-center rounded-xl border border-border/80 bg-white p-1 shadow-sm">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              selectedPreset === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-neutral-500 hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {selectedPreset === "custom" && onCustomChange && (
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-white px-2.5 py-1 text-xs shadow-sm">
          <Calendar className="size-3.5 text-neutral-400" />
          <input
            type="date"
            value={customStart || ""}
            onChange={(e) => onCustomChange(e.target.value, customEnd || "")}
            className="text-xs font-medium text-foreground outline-none bg-transparent"
          />
          <span className="text-neutral-400 font-bold">to</span>
          <input
            type="date"
            value={customEnd || ""}
            onChange={(e) => onCustomChange(customStart || "", e.target.value)}
            className="text-xs font-medium text-foreground outline-none bg-transparent"
          />
        </div>
      )}
    </div>
  )
}
