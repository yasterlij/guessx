import { CTAButton } from './AuctionUI'
import { Inbox, SearchX, AlertTriangle, ShoppingBag, type LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  inbox: Inbox,
  'search-x': SearchX,
  alert: AlertTriangle,
  bag: ShoppingBag,
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
  className,
}: {
  icon?: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  const Icon = ICON_MAP[icon] || Inbox

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-8 ${className || ''}`}>
      <div className="flex size-18 items-center justify-center rounded-full bg-secondary mb-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-lg font-bold text-navy text-center">{title}</h3>
      <p className="mt-2 text-sm font-medium text-muted-foreground text-center leading-relaxed max-w-[280px]">{message}</p>
      {actionLabel && onAction && (
        <div className="mt-5 w-full max-w-xs">
          <CTAButton onClick={onAction}>{actionLabel}</CTAButton>
        </div>
      )}
    </div>
  )
}