import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { api, type ApiNotification } from "../api"
import { Badge } from "./AuctionUI"

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Just now"
  const delta = Date.now() - date.getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

const PEEK_COUNT = 6

export function NotificationBell() {
  const { go, refreshUnreadNotifications, unreadNotificationCount } = useApp()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadInList = items.filter((n) => !n.read).length

  const loadPeek = async () => {
    setLoading(true)
    try {
      const data = await api.getInbox(false)
      setItems(data.slice(0, PEEK_COUNT))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    loadPeek()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      await api.markNotificationRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      await refreshUnreadNotifications()
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      await refreshUnreadNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm text-neutral-500 transition-all duration-300 hover:bg-white hover:text-awash-blue"
      >
        <Bell className="size-4" />
        {unreadNotificationCount > 0 && (
          <motion.span
            key={unreadNotificationCount}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-border/60 bg-white/95 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-awash-blue">Notifications</p>
                <p className="text-[11px] font-medium text-neutral-400">Latest updates</p>
              </div>
              <button
                onClick={markAllRead}
                disabled={markingAll || unreadInList === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-awash-blue transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto size-8 text-neutral-300" />
                  <p className="mt-2 text-sm font-medium text-neutral-500">No notifications yet</p>
                  <p className="mt-0.5 text-xs text-neutral-400">We'll alert you on auction updates.</p>
                </div>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => !n.read && markRead(n.id)}
                        disabled={busyId === n.id}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${!n.read ? "bg-awash-gold/5 hover:bg-awash-gold/10" : "hover:bg-neutral-50"}`}
                      >
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            n.read ? "bg-neutral-100 text-neutral-400" : "bg-awash-gold/20 text-awash-gold-dark"
                          }`}
                        >
                          <Bell className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-bold text-awash-blue">{n.title}</span>
                            {!n.read && <Badge tone="orange">New</Badge>}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs font-medium leading-5 text-neutral-600">
                            {n.body}
                          </span>
                          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                            {formatTime(n.sent_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={() => {
                close()
                go("notifications")
              }}
              className="flex w-full items-center justify-center gap-1.5 border-t border-border/50 px-4 py-3 text-xs font-bold text-awash-blue transition-colors hover:bg-neutral-50"
            >
              View all notifications
              <ExternalLink className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}