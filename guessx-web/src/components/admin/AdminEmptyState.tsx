import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: any
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/70 bg-white/70 backdrop-blur-sm p-8 shadow-sm ${className}`}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-xs text-neutral-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
