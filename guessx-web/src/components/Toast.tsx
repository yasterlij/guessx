import { useEffect, useState } from "react"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react"
import { useToastStore } from "../store/toast.store"

const icons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <AlertCircle className="size-5 text-red-500" />,
  warning: <AlertTriangle className="size-5 text-amber-500" />,
  info: <Info className="size-5 text-sky-500" />,
}

const styles: Record<string, { border: string; bg: string; bar: string }> = {
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    bar: "bg-emerald-500",
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    bar: "bg-red-500",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    bar: "bg-amber-500",
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    bar: "bg-sky-500",
  },
}

function ToastProgress({ duration }: { duration: number }) {
  const [width, setWidth] = useState(100)
  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 16)
    return () => clearInterval(interval)
  }, [duration])
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 rounded-b-xl overflow-hidden">
      <div className="h-full transition-none rounded-b-xl" style={{ width: `${width}%`, backgroundColor: "inherit" }} />
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const s = styles[t.type]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 ${
              s.bg} ${s.border} ${t.exiting ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {icons[t.type]}
              <span className="text-sm font-medium text-gray-800">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="flex size-5 items-center justify-center rounded-full hover:bg-black/5 transition-colors shrink-0 mt-0.5"
            >
              <X className="size-3.5 text-gray-400" />
            </button>
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden ${s.bg}`}>
              <div className={`h-full rounded-b-xl ${s.bar}`} style={{ width: `${t.progress ?? 100}%`, transition: "width 16ms linear" }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
