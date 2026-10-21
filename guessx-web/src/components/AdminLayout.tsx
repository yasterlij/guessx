import type { ReactNode } from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Gavel,
  Package,
  Users,
  Receipt,
  ScrollText,
  Radio,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  BarChart3,
  Trophy,
  FileText,
  ShieldAlert,
  Shield,
} from "lucide-react"
import { useApp, type View } from "../AppContext"

type NavItem = {
  id: View
  label: string
  icon: typeof LayoutDashboard
  group?: string
}

const NAV: NavItem[] = [
  { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "admin-monitor", label: "Monitor Live", icon: Radio, group: "Overview" },
  { id: "admin-analytics", label: "Analytics", icon: BarChart3, group: "Overview" },
  { id: "admin-auctions", label: "Auctions", icon: Gavel, group: "Manage" },
  { id: "admin-products", label: "Products", icon: Package, group: "Manage" },
  { id: "admin-winners", label: "Winners", icon: Trophy, group: "Manage" },
  { id: "admin-users", label: "Users", icon: Users, group: "Manage" },
  { id: "admin-transactions", label: "Transactions", icon: Receipt, group: "Finance" },
  { id: "admin-settlement", label: "Revenue & Settlement", icon: FileText, group: "Finance" },
  { id: "admin-disputes", label: "Disputes", icon: ShieldAlert, group: "Governance" },
  { id: "admin-rbac", label: "Roles & Access", icon: Shield, group: "Governance" },
  { id: "admin-audit", label: "Audit Log", icon: ScrollText, group: "Governance" },
]

export function AdminLayout({ children, title, subtitle, actions }: {
  children: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const { view, go, goBack, user } = useApp()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const groups = Array.from(new Set(NAV.map((n) => n.group)))

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex items-center justify-center rounded-xl bg-white px-3 py-1.5 shadow-sm">
          <img src="/guessx_logo.svg" alt="GuessX" className="h-8 w-auto object-contain" />
        </div>
        <div className="leading-none">
          <div className="font-display text-sm font-semibold text-white">Guess X</div>
          <div className="text-[10px] font-normal tracking-wide text-white/50">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">{group}</p>
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = view === item.id || (item.id === "admin-monitor" && view === "admin-auction-monitor")
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    go(item.id)
                    setMobileNavOpen(false)
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-normal transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                    />
                  )}
                  <item.icon className={`size-4.5 shrink-0 ${active ? "text-primary" : ""}`} />
                  {item.label}
                  {active && <ChevronRight className="ml-auto size-4 text-primary" />}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          onClick={() => goBack()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to App
        </button>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {(user?.name || user?.phone || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-bold text-white">{user?.name || "Admin"}</p>
              <span className="rounded bg-primary/20 px-1 py-0.2 text-[9px] font-bold text-primary font-mono uppercase">
                {user?.role || "admin"}
              </span>
            </div>
            <p className="truncate text-[10px] text-white/40">{user?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-full w-64 bg-ink lg:hidden"
            >
              <button
                onClick={() => setMobileNavOpen(false)}
                className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3.5 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-border/60 p-2 text-neutral-500 lg:hidden"
          >
            <Menu className="size-4.5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold tracking-[-0.022em] text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs font-medium text-neutral-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-6">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
