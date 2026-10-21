import { Loader2 } from "lucide-react"

export function AdminLoadingState({
  message = "Loading data...",
  className = "",
}: {
  message?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center text-neutral-400 ${className}`}>
      <Loader2 className="size-8 animate-spin text-primary opacity-40 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
