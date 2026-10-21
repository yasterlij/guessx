import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Calendar,
  AlertCircle,
  UserCheck,
  RotateCcw,
  Ban,
  X,
  Loader2,
  Bell,
  Send,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { PaginationBar } from "../components/Pagination"
import {
  api,
  type ApiPendingWinner,
  type ApiWinnerStats,
  type ApiBidderHistory,
} from "../api"
import { formatCurrency } from "../mockDataV0"
import { toast } from "../store/toast.store"

export function WinnerManagementScreen() {
  const [stats, setStats] = useState<ApiWinnerStats | null>(null)
  const [pendingWinners, setPendingWinners] = useState<ApiPendingWinner[]>([])
  const [expiredWinners, setExpiredWinners] = useState<ApiPendingWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "EXPIRED" | "SECOND_WINNER">("ALL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [selectedBidderHistory, setSelectedBidderHistory] = useState<ApiBidderHistory | null>(null)
  const [bidderHistoryLoading, setBidderHistoryLoading] = useState(false)
  const [remindingId, setRemindingId] = useState<string | null>(null)

  const [extendModalWinner, setExtendModalWinner] = useState<ApiPendingWinner | null>(null)
  const [extendHours, setExtendHours] = useState(24)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, pendingRes, expiredRes] = await Promise.allSettled([
        api.adminGetWinnerStats(),
        api.adminGetPendingWinners(),
        api.adminGetExpiredWinners(),
      ])

      if (statsRes.status === "fulfilled") setStats(statsRes.value)
      if (pendingRes.status === "fulfilled") setPendingWinners(pendingRes.value || [])
      if (expiredRes.status === "fulfilled") setExpiredWinners(expiredRes.value || [])
    } catch {
      toast("Failed to load winner management data", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExtendDeadline = async () => {
    if (!extendModalWinner) return
    setActionLoading(true)
    try {
      const newDeadline = new Date(Date.now() + extendHours * 3600 * 1000).toISOString()
      await api.adminExtendWinnerDeadline(extendModalWinner.id, newDeadline)
      toast(`Extended payment deadline by ${extendHours} hours`, "success")
      setExtendModalWinner(null)
      loadData()
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to extend deadline", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReassign = async (winner: ApiPendingWinner) => {
    if (!confirm(`Are you sure you want to promote the next eligible bidder for this auction?`)) return
    setActionLoading(true)
    try {
      await api.adminReassignWinner(winner.id)
      toast("Winner promoted to next eligible unique bidder", "success")
      loadData()
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to reassign winner", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (winner: ApiPendingWinner) => {
    const reason = prompt("Enter cancellation reason:")
    if (reason === null) return
    setActionLoading(true)
    try {
      await api.adminCancelWinner(winner.id, reason)
      toast("Winner cancelled", "success")
      loadData()
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to cancel winner", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewBidderHistory = async (userId: string) => {
    setBidderHistoryLoading(true)
    try {
      const res = await api.adminGetBidderHistory(userId)
      setSelectedBidderHistory(res)
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to load bidder history", "error")
    } finally {
      setBidderHistoryLoading(false)
    }
  }

  const handleSendReminder = async (winner: ApiPendingWinner) => {
    setRemindingId(winner.id)
    try {
      const res = await api.adminSendPaymentReminder(winner.id)
      toast(res.message || "Payment reminder dispatched via SMS, Push, and In-App notification", "success")
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to send payment reminder", "error")
    } finally {
      setRemindingId(null)
    }
  }

  const rawList = Array.from(new Map([...pendingWinners, ...expiredWinners].map((w) => [w.id, w])).values())
  const secondWinnerCount = rawList.filter((w) => w.auction?.second_winner_assigned).length

  const allList = activeTab === "EXPIRED"
    ? expiredWinners
    : activeTab === "PENDING"
    ? pendingWinners
    : activeTab === "SECOND_WINNER"
    ? rawList.filter((w) => w.auction?.second_winner_assigned)
    : rawList

  const filtered = allList.filter((w) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = w.user?.full_name?.toLowerCase() || ""
    const phone = w.user?.phone_number?.toLowerCase() || ""
    const auction = w.auction?.product?.name?.toLowerCase() || w.auction?.public_code?.toLowerCase() || ""
    return name.includes(q) || phone.includes(q) || auction.includes(q)
  })

  return (
    <AdminLayout
      title="Winner Management"
      subtitle="Supervise auction winner fulfillment, payment deadlines, and promotions"
      actions={
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-neutral-50 shadow-sm"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Total Winners</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">
                  {stats?.total_winners ?? pendingWinners.length + expiredWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Trophy className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Pending Payment</p>
                <p className="mt-1 font-display text-2xl font-bold text-amber-600">
                  {stats?.pending_winners ?? pendingWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Clock className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Settled / Paid</p>
                <p className="mt-1 font-display text-2xl font-bold text-emerald-600">
                  {stats?.paid_winners ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Expired Deadlines</p>
                <p className="mt-1 font-display text-2xl font-bold text-destructive">
                  {stats?.expired_winners ?? expiredWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive">
                <XCircle className="size-5" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search by winner name, phone, or auction..."
              className="w-full rounded-xl border border-border/60 bg-white py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-white p-1 shadow-sm">
            {[
              { id: "ALL", label: "All Queue" },
              { id: "PENDING", label: `Pending (${pendingWinners.length})` },
              { id: "EXPIRED", label: `Defaulted / Expired (${expiredWinners.length})` },
              { id: "SECOND_WINNER", label: `2nd Winner Assigned (${secondWinnerCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any)
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-neutral-600 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-neutral-50/80 font-semibold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Winner</th>
                  <th className="px-4 py-3">Auction / Product</th>
                  <th className="px-4 py-3">Winning Bid</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Payment Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                      Loading winner roster...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No winners found matching the current criteria.
                    </td>
                  </tr>
                ) : (
                  filtered
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((w, i) => {
                      const isExpired = w.payment_deadline && new Date(w.payment_deadline) < new Date() && w.payment_status === "PENDING"
                      const deadlineDate = w.payment_deadline ? new Date(w.payment_deadline) : null
                      const hoursLeft = deadlineDate ? Math.round((deadlineDate.getTime() - Date.now()) / 3600000) : null
                      const isDefaulted = w.auction?.payment_status === "PAYMENT_DEFAULTED" || w.payment_status === "DEFAULTED" || w.payment_status === "PAYMENT_DEFAULTED"
                      const paymentStatusTone = w.payment_status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isDefaulted
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : isExpired
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                      const paymentStatusIcon = w.payment_status === "PAID"
                        ? <CheckCircle2 className="size-3" />
                        : isDefaulted
                        ? <Ban className="size-3" />
                        : isExpired
                        ? <XCircle className="size-3" />
                        : <Clock className="size-3" />
                      const paymentStatusLabel = isDefaulted ? "DEFAULTED" : isExpired ? "EXPIRED" : w.payment_status

                      return (
                        <motion.tr
                          key={w.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-neutral-50/80 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleViewBidderHistory(w.user_id)}
                              className="text-left group cursor-pointer"
                              title="View Bidder History & Compliance Profile"
                            >
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                {w.user?.full_name || "Anonymous Winner"}
                                <UserCheck className="size-3 text-neutral-400 group-hover:text-primary transition-colors" />
                              </div>
                              <div className="text-[11px] text-neutral-400">
                                {w.user?.phone_number || "No phone"}
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">
                              {w.auction?.product?.name || "Auction Item"}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-primary">
                                {w.auction?.public_code || w.auction_id.slice(0, 8)}
                              </span>
                              {w.auction?.second_winner_assigned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                                  <Trophy className="size-2.5" /> 2nd Winner Assigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-600">
                              {formatCurrency(w.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${
                              w.rank === 1
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-neutral-100 text-neutral-600"
                            }`}>
                              #{w.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {deadlineDate ? (
                              <div>
                                <div>{deadlineDate.toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                <span className={`text-[10px] font-semibold ${
                                  isExpired ? "text-destructive" : hoursLeft != null && hoursLeft < 6 ? "text-amber-600" : "text-emerald-600"
                                }`}>
                                  {isExpired ? "Expired" : hoursLeft != null ? `${hoursLeft}h remaining` : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${paymentStatusTone}`}>
                              {paymentStatusIcon}
                              {paymentStatusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {w.payment_status === "PENDING" ? (
                                <button
                                  onClick={() => handleSendReminder(w)}
                                  disabled={remindingId === w.id}
                                  title="Send Multi-Channel Payment Reminder"
                                  className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                                >
                                  {remindingId === w.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Send className="size-3" />
                                  )}
                                  Remind
                                </button>
                              ) : null}
                              {w.payment_status === "PAID" ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="size-3" />
                                  Settled
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setExtendModalWinner(w)}
                                    disabled={actionLoading}
                                    title="Extend Payment Deadline"
                                    className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-neutral-50 shadow-sm transition-all"
                                  >
                                    Extend
                                  </button>
                                  <button
                                    onClick={() => handleReassign(w)}
                                    disabled={actionLoading}
                                    title="Promote Next Eligible Bidder"
                                    className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 shadow-sm transition-all"
                                  >
                                    Rotate
                                  </button>
                                  <button
                                    onClick={() => handleCancel(w)}
                                    disabled={actionLoading}
                                    title="Cancel Winner"
                                    className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 shadow-sm transition-all"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {filtered.length > 0 && (
            <div className="border-t border-border/60 bg-white p-3">
              <PaginationBar
                page={page}
                totalPages={Math.ceil(filtered.length / pageSize)}
                totalItems={filtered.length}
                perPage={pageSize}
                onPageChange={setPage}
                onPerPageChange={(ps) => {
                  setPageSize(ps)
                  setPage(1)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Extend Deadline Modal */}
      <AnimatePresence>
        {extendModalWinner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Extend Payment Deadline</h3>
                </div>
                <button
                  onClick={() => setExtendModalWinner(null)}
                  className="rounded-full p-1 text-neutral-400 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                Extending the payment deadline for <strong className="text-foreground">{extendModalWinner.user?.full_name || "Winner"}</strong> on auction <strong className="text-foreground">{extendModalWinner.auction?.product?.name || "Item"}</strong>.
              </p>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-foreground">Extension Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 48, 72].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setExtendHours(hrs)}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        extendHours === hrs
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      +{hrs} hrs
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendModalWinner(null)}
                  className="rounded-xl border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtendDeadline}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  {actionLoading && <Loader2 className="size-3 animate-spin" />}
                  Confirm Extension
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bidder History Profile Modal */}
      <AnimatePresence>
        {selectedBidderHistory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedBidderHistory(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserCheck className="size-5.5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {selectedBidderHistory.user.full_name || "Bidder Profile"}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedBidderHistory.user.phone_number} {selectedBidderHistory.user.email ? `· ${selectedBidderHistory.user.email}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBidderHistory(null)}
                  className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Compliance Score & Metrics */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Compliance Score</span>
                  <span className={`text-base font-bold ${
                    selectedBidderHistory.stats.compliance_rate >= 80
                      ? "text-emerald-600"
                      : selectedBidderHistory.stats.compliance_rate >= 50
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}>
                    {selectedBidderHistory.stats.compliance_rate}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Bids Placed</span>
                  <span className="text-base font-bold text-foreground">
                    {selectedBidderHistory.stats.total_bids}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Auctions Won</span>
                  <span className="text-base font-bold text-primary">
                    {selectedBidderHistory.stats.auctions_won}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Paid vs Defaults</span>
                  <span className="text-base font-bold text-foreground">
                    <span className="text-emerald-600">{selectedBidderHistory.stats.payments_completed}</span> / <span className="text-rose-600">{selectedBidderHistory.stats.payments_defaulted}</span>
                  </span>
                </div>
              </div>

              {/* Won Auctions History */}
              <div className="mt-5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Won Auctions History ({selectedBidderHistory.won_auctions.length})
                </h4>
                {selectedBidderHistory.won_auctions.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-3 text-center">No won auctions on record.</p>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                    {selectedBidderHistory.won_auctions.map((w) => (
                      <div key={w.id} className="p-3 text-xs flex items-center justify-between hover:bg-neutral-50/80">
                        <div>
                          <p className="font-bold text-foreground">{w.auction_name}</p>
                          <p className="text-[10px] text-neutral-400">
                            Rank #{w.rank} · Won amount: {formatCurrency(w.amount)}
                            {w.second_winner_assigned ? " · 2nd Winner Assigned" : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          w.payment_status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : w.payment_status === "EXPIRED" || w.payment_status === "DEFAULTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {w.payment_status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bids Ledger */}
              <div className="mt-5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Recent Bidding Activity (Last 20)
                </h4>
                {selectedBidderHistory.recent_bids.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-3 text-center">No recent bids found.</p>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                    {selectedBidderHistory.recent_bids.map((b) => (
                      <div key={b.id} className="p-3 text-xs flex items-center justify-between hover:bg-neutral-50/80">
                        <div>
                          <p className="font-bold text-foreground">{b.auction_name}</p>
                          <p className="text-[10px] text-neutral-400">
                            Ticket #{b.ticket_number || "—"} · {new Date(b.bid_time).toLocaleString()}
                          </p>
                        </div>
                        <span className="font-bold text-foreground">
                          {formatCurrency(b.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}