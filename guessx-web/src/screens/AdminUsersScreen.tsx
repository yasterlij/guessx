import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  User,
  Search,
  X,
  Users as UsersIcon,
  TrendingUp,
  Loader2,
  AlertCircle,
  ChevronRight,
  Phone,
  Wallet,
  Edit3,
  Check,
  KeyRound,
  Crown,
  Briefcase,
  Wrench,
  Microscope,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Save,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { Card } from "../components/AuctionUI"
import {
  api,
  type ApiUser,
  ENTERPRISE_ROLES,
  type EnterpriseRole,
  isStaffRole,
} from "../api"
import { formatCurrency } from "../mockDataV0"
import { usePagination, PaginationBar } from "../components/Pagination"
import { toast } from "../store/toast.store"

const PERMISSION_GROUPS = [
  {
    title: "User Administration",
    permissions: [
      { key: "users:read", label: "View Users", desc: "List all users and view account details" },
      { key: "users:write", label: "Edit Users", desc: "Update user profiles and contact info" },
      { key: "users:role", label: "Change Roles", desc: "Assign or modify organizational staff roles" },
      { key: "users:ban", label: "Ban / Unban", desc: "Suspend or restore platform user access" },
      { key: "users:permissions", label: "Assign Permissions", desc: "Grant or revoke granular system permissions" },
    ],
  },
  {
    title: "Auction & Bidding",
    permissions: [
      { key: "auctions:read", label: "View Auctions", desc: "Inspect live and historical auction specs" },
      { key: "auctions:write", label: "Manage Auctions", desc: "Create, schedule, or update auctions" },
      { key: "auctions:close", label: "Close Auctions", desc: "Manually close or terminate active auctions" },
      { key: "bids:read", label: "Inspect Bids", desc: "View full user bidding telemetry and stream" },
    ],
  },
  {
    title: "Finance, Audit & Compliance",
    permissions: [
      { key: "transactions:read", label: "Transactions", desc: "View transaction history and wallet records" },
      { key: "audit:read", label: "Audit Logs", desc: "Access immutable security and system audit logs" },
      { key: "export", label: "Export Data", desc: "Download CSV reporting for finance and compliance" },
    ],
  },
]

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key))

const PRESETS: Record<string, { label: string; icon: string; permissions: string[] }> = {
  full: {
    label: "Full Admin",
    icon: "👑",
    permissions: ALL_PERMISSION_KEYS,
  },
  auction: {
    label: "Auction Operator",
    icon: "🔨",
    permissions: ["auctions:read", "auctions:write", "auctions:close", "bids:read"],
  },
  audit: {
    label: "Compliance & Audit",
    icon: "📊",
    permissions: ["audit:read", "export", "users:read", "transactions:read"],
  },
  support: {
    label: "Customer Support",
    icon: "🤝",
    permissions: ["users:read", "bids:read", "transactions:read"],
  },
  clear: {
    label: "Clear All",
    icon: "🔄",
    permissions: [],
  },
}

function RoleBadge({ role }: { role: string }) {
  const meta = ENTERPRISE_ROLES.find((r) => r.role === role) || {
    label: role,
    level: 7,
    tone: "neutral",
  }

  const colorStyles: Record<string, string> = {
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    gold: "bg-amber-100 text-amber-900 border-amber-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-orange-100 text-orange-800 border-orange-200",
    cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    green: "bg-neutral-100 text-neutral-600 border-neutral-200",
  }

  const style = colorStyles[meta.tone] || colorStyles.neutral

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style}`}
    >
      <span className="text-[10px] opacity-75">L{meta.level}</span>
      {meta.label}
    </span>
  )
}

function UserDetailModal({
  user,
  onClose,
  onRoleChange,
  onNameChange,
}: {
  user: ApiUser
  onClose: () => void
  onRoleChange: (id: string, role: string) => void
  onNameChange: (id: string, name: string) => void
}) {
  const { allBids } = useApp()
  const userBids = allBids.filter((b) => b.userId === user.id)
  const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size

  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "overview">("roles")
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user.full_name || "")

  // Role management state
  const [selectedRole, setSelectedRole] = useState<string>(user.role)
  const [savingRole, setSavingRole] = useState(false)

  // Permissions management state
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set())
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set())
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [savingPerms, setSavingPerms] = useState(false)

  // Load existing user permissions
  useEffect(() => {
    let mounted = true
    setLoadingPerms(true)
    api
      .adminGetUserPermissions(user.id)
      .then((res) => {
        if (!mounted) return
        const set = new Set((res.permissions || []).map((p) => p.permission))
        setUserPermissions(set)
        setOriginalPermissions(new Set(set))
      })
      .catch(() => {
        // If no permissions table entry or failure, start empty
      })
      .finally(() => {
        if (mounted) setLoadingPerms(false)
      })
    return () => {
      mounted = false
    }
  }, [user.id])

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === user.full_name) {
      setEditingName(false)
      return
    }
    try {
      await api.updateUser(user.id, { full_name: nameValue.trim() })
      onNameChange(user.id, nameValue.trim())
      setEditingName(false)
      toast("Name updated successfully", "success")
    } catch (e: unknown) {
      toast(
        `Failed to save name: ${e instanceof Error ? e.message : String(e)}`,
        "error",
      )
    }
  }

  const handleApplyRole = async (newRole: string) => {
    if (newRole === user.role) return
    setSavingRole(true)
    try {
      await api.updateUserRole(user.id, newRole)
      setSelectedRole(newRole)
      onRoleChange(user.id, newRole)
      toast(`User role changed to ${newRole}`, "success")
    } catch (e: unknown) {
      toast(`Failed to update role: ${e instanceof Error ? e.message : String(e)}`, "error")
    } finally {
      setSavingRole(false)
    }
  }

  const togglePermission = (key: string) => {
    setUserPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const applyPreset = (keys: string[]) => {
    setUserPermissions(new Set(keys))
  }

  const handleSavePermissions = async () => {
    setSavingPerms(true)
    try {
      const current = Array.from(userPermissions)
      const original = Array.from(originalPermissions)

      const toGrant = current.filter((p) => !original.includes(p))
      const toRevoke = original.filter((p) => !current.includes(p))

      const promises = []
      if (toGrant.length > 0) {
        promises.push(api.adminGrantUserPermissions(user.id, toGrant))
      }
      if (toRevoke.length > 0) {
        promises.push(api.adminRevokeUserPermissions(user.id, toRevoke))
      }

      await Promise.all(promises)
      setOriginalPermissions(new Set(userPermissions))
      toast("Permissions updated successfully", "success")
    } catch (e: unknown) {
      toast(`Failed to save permissions: ${e instanceof Error ? e.message : String(e)}`, "error")
    } finally {
      setSavingPerms(false)
    }
  }

  const isStaff = isStaffRole(user.role)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl rounded-2xl border border-border/80 bg-white shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-neutral-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isStaff ? <Shield className="size-5" /> : <User className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">
                  {user.full_name || user.phone_number}
                </h2>
                <RoleBadge role={user.role} />
              </div>
              <p className="text-xs text-neutral-400">ID: {user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/60 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60 bg-white px-5 pt-2">
          {[
            { id: "roles", label: "Role Hierarchy", icon: Crown },
            { id: "permissions", label: "Fine-Grained Permissions", icon: KeyRound },
            { id: "overview", label: "Account Info", icon: User },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-foreground"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
              {t.id === "permissions" && userPermissions.size > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {userPermissions.size}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="max-h-[68vh] overflow-y-auto p-5">
          {/* TAB 1: ROLE ASSIGNMENT */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-neutral-50/60 p-3.5">
                <p className="text-xs font-semibold text-neutral-600">
                  Select an enterprise role to govern this user&apos;s baseline CASL capabilities. Level 1 roles (CEO, Admin) possess full system access.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {ENTERPRISE_ROLES.map((r) => {
                  const isCurrent = user.role === r.role
                  return (
                    <button
                      key={r.role}
                      type="button"
                      disabled={savingRole || isCurrent}
                      onClick={() => handleApplyRole(r.role)}
                      className={`relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-border/70 bg-white hover:border-primary/40 hover:bg-neutral-50/50"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={r.role} />
                          <span className="text-[11px] font-bold text-neutral-400">
                            Level {r.level}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                            <Check className="size-3.5" /> Current
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-medium text-neutral-600 leading-snug">
                        {r.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FINE-GRAINED PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-5">
              {/* Presets header */}
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Quick Capability Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(p.permissions)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300 transition-all active:scale-95"
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {loadingPerms ? (
                <div className="py-12 text-center text-neutral-400">
                  <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                  Loading permissions...
                </div>
              ) : (
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((grp) => (
                    <div
                      key={grp.title}
                      className="rounded-xl border border-border/70 bg-neutral-50/40 p-3.5"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2.5">
                        {grp.title}
                      </h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {grp.permissions.map((p) => {
                          const checked = userPermissions.has(p.key)
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => togglePermission(p.key)}
                              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                                checked
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0 text-primary">
                                {checked ? (
                                  <CheckSquare className="size-4" />
                                ) : (
                                  <Square className="size-4 text-neutral-300" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold leading-none">{p.label}</p>
                                <p className="mt-1 text-[11px] text-neutral-500 leading-tight">
                                  {p.desc}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save permissions button */}
              <div className="flex items-center justify-between border-t border-border/80 pt-4">
                <p className="text-xs font-medium text-neutral-500">
                  {userPermissions.size} permissions selected
                </p>
                <button
                  type="button"
                  disabled={savingPerms || loadingPerms}
                  onClick={handleSavePermissions}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPerms ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Permissions
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {isStaff ? <Shield className="size-6" /> : <User className="size-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName()
                          if (e.key === "Escape") {
                            setEditingName(false)
                            setNameValue(user.full_name || "")
                          }
                        }}
                        className="flex-1 rounded-lg border border-primary px-2.5 py-1 text-sm font-bold text-foreground outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveName}
                        className="rounded-lg bg-primary p-1.5 text-primary-foreground"
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false)
                          setNameValue(user.full_name || "")
                        }}
                        className="rounded-lg border border-border p-1.5 text-neutral-400"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-display text-base font-bold text-foreground truncate">
                        {user.full_name || "Unknown"}
                      </p>
                      <button
                        onClick={() => {
                          setNameValue(user.full_name || "")
                          setEditingName(true)
                        }}
                        className="text-neutral-400 hover:text-primary transition-colors"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-neutral-400">ID: {user.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <Phone className="size-3.5 text-neutral-400 mb-1" />
                  <p className="text-xs font-medium text-neutral-400">Phone</p>
                  <p className="text-sm font-bold text-foreground">{user.phone_number}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <Wallet className="size-3.5 text-neutral-400 mb-1" />
                  <p className="text-xs font-medium text-neutral-400">Wallet</p>
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(user.wallet_balance)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-neutral-50 p-3 text-center">
                  <p className="font-display text-lg font-extrabold text-foreground">
                    {userBids.length}
                  </p>
                  <p className="text-[10px] font-medium text-neutral-400">Bids Placed</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3 text-center">
                  <p className="font-display text-lg font-extrabold text-foreground">
                    {uniqueAuctions}
                  </p>
                  <p className="text-[10px] font-medium text-neutral-400">Auctions</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3 text-center">
                  <p className="font-display text-lg font-extrabold text-foreground">
                    {user.role}
                  </p>
                  <p className="text-[10px] font-medium text-neutral-400">Role</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AdminUsersScreen() {
  const { allBids } = useApp()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    setError(null)
    api
      .adminListUsers(1, 200)
      .then((res) => {
        setUsers(res.data)
        setLoading(false)
      })
      .catch((e) => {
        setError(
          (e instanceof Error ? e.message : String(e)) || "Failed to load users",
        )
        setLoading(false)
      })
  }

  useEffect(fetchUsers, [])

  const filtered = useMemo(() => {
    let list = users
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.phone_number?.includes(q) ||
          u.id?.toLowerCase().includes(q),
      )
    }
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter)
    }
    return list
  }, [users, search, roleFilter])

  const { page, setPage, perPage, setPerPage, totalPages, paginated } = usePagination(
    filtered,
    20,
  )

  const staffCount = users.filter((u) => isStaffRole(u.role)).length
  const totalBids = allBids.length

  const handleRoleChange = (id: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)),
    )
    if (selectedUser?.id === id) {
      setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null))
    }
  }

  const handleNameChange = (id: string, newName: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, full_name: newName } : u)),
    )
    if (selectedUser?.id === id) {
      setSelectedUser((prev) => (prev ? { ...prev, full_name: newName } : null))
    }
  }

  return (
    <AdminLayout
      title="User & Access Directory"
      subtitle="Manage registered participants, enterprise hierarchy roles, and fine-grained permissions"
      actions={
        <button
          onClick={fetchUsers}
          className="rounded-xl border border-border/80 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50 shadow-sm"
        >
          Refresh
        </button>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full rounded-xl border border-border/80 bg-white/90 pl-9 pr-8 py-2 text-xs font-medium text-foreground outline-none focus:border-primary shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-foreground outline-none shadow-sm"
          >
            <option value="all">All Roles</option>
            {ENTERPRISE_ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label} (L{r.level})
              </option>
            ))}
          </select>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="items-center p-3 text-center">
            <UsersIcon className="size-5 text-primary" />
            <p className="mt-1 font-display text-2xl font-extrabold text-foreground tabular-nums">
              {loading ? "..." : users.length}
            </p>
            <p className="text-[10px] font-medium text-neutral-400">Total Users</p>
          </Card>
          <Card className="items-center p-3 text-center">
            <Shield className="size-5 text-amber-600" />
            <p className="mt-1 font-display text-2xl font-extrabold text-amber-700 tabular-nums">
              {staffCount}
            </p>
            <p className="text-[10px] font-medium text-neutral-400">Staff & Officers</p>
          </Card>
          <Card className="items-center p-3 text-center">
            <TrendingUp className="size-5 text-emerald-600" />
            <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">
              {totalBids}
            </p>
            <p className="text-[10px] font-medium text-neutral-400">Total Bids</p>
          </Card>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <Loader2 className="size-8 animate-spin opacity-40 text-primary" />
            <p className="text-sm font-medium">Loading user directory...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <AlertCircle className="size-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button
              onClick={fetchUsers}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-neutral-400">
            <Search className="size-8 opacity-30" />
            <p className="text-sm font-medium">
              {search ? "No users match your filter" : "No users found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map((u) => {
              const userBids = allBids.filter((b) => b.userId === u.id)
              const uniqueAuctions = new Set(userBids.map((b) => b.auctionId)).size
              const isStaff = isStaffRole(u.role)
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white p-3.5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                        isStaff
                          ? "bg-primary/10 text-primary"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {isStaff ? <Shield className="size-5" /> : <User className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">
                          {u.full_name || u.phone_number}
                        </p>
                        <RoleBadge role={u.role} />
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-neutral-400">
                        {u.phone_number} · {userBids.length} bids · {uniqueAuctions} auctions
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedUser(u)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-primary hover:border-primary hover:text-white transition-all shadow-sm"
                  >
                    <span>Manage Access</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        )}

        <AnimatePresence>
          {selectedUser && (
            <UserDetailModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onRoleChange={handleRoleChange}
              onNameChange={handleNameChange}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AdminLayout>
  )
}
