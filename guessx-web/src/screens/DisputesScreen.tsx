import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  XCircle,
  MessageSquare,
  FileCheck,
  X,
  Loader2,
  Gavel,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { AdminLoadingState, AdminEmptyState } from "../components/admin"
import { usePagination, PaginationBar } from "../components/Pagination"
import { api, type ApiDispute } from "../api"
import { toast } from "../store/toast.store"

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  OPEN: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", icon: AlertCircle },
  IN_REVIEW: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  RESOLVED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
  REJECTED: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200", icon: XCircle },
}

export function DisputesScreen() {
  const [disputes, setDisputes] = useState<ApiDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")

  const [activeModalDispute, setActiveModalDispute] = useState<ApiDispute | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [documentUrls, setDocumentUrls] = useState("")
  const [targetStatus, setTargetStatus] = useState<"RESOLVED" | "REJECTED">("RESOLVED")
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.adminListAllDisputes(filter === "ALL" ? undefined : filter)
      const list = Array.isArray(res) ? res : (res as any)?.disputes || []
      setDisputes(list)
    } catch {
      toast("Failed to load disputes", "error")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStartReview = async (d: ApiDispute) => {
    try {
      await api.adminUpdateDisputeStatus(d.id, "IN_REVIEW")
      toast("Dispute marked as In Review", "success")
      loadData()
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to update dispute", "error")
    }
  }

  const handleOpenDeterminationModal = (d: ApiDispute) => {
    setActiveModalDispute(d)
    setResolutionNote(d.resolution || "")
    setDocumentUrls(d.document_urls || "")
    setTargetStatus("RESOLVED")
  }

  const handleResolveSubmit = async () => {
    if (!activeModalDispute) return
    setActionLoading(true)
    try {
      await api.adminUpdateDisputeStatus(
        activeModalDispute.id,
        targetStatus,
        resolutionNote || undefined,
        documentUrls || undefined,
      )
      toast(`Dispute marked as ${targetStatus.toLowerCase()}`, "success")
      setActiveModalDispute(null)
      setResolutionNote("")
      setDocumentUrls("")
      loadData()
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Failed to update dispute", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = disputes.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = d.user?.full_name?.toLowerCase() || ""
    const phone = d.user?.phone_number?.toLowerCase() || ""
    const desc = d.description?.toLowerCase() || ""
    const type = d.type?.toLowerCase() || ""
    return name.includes(q) || phone.includes(q) || desc.includes(q) || type.includes(q)
  })

  const { page, setPage, perPage, setPerPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)

  useEffect(() => {
    resetPage()
  }, [filter, search, resetPage])

  const openCount = disputes.filter((d) => d.status === "OPEN").length
  const inReviewCount = disputes.filter((d) => d.status === "IN_REVIEW").length
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length

  return (
    <AdminLayout
      title="Dispute Resolution"
      subtitle="Examine customer claims, verify audit logs, and provide fair determinations"
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
          <StatCard
            icon={<ShieldAlert className="size-5" />}
            label="Total Cases"
            value={disputes.length}
            accent="blue"
            delay={0}
          />
          <StatCard
            icon={<AlertCircle className="size-5" />}
            label="Open Tickets"
            value={openCount}
            accent="red"
            delay={0.04}
          />
          <StatCard
            icon={<Clock className="size-5" />}
            label="Under Investigation"
            value={inReviewCount}
            accent="amber"
            delay={0.08}
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Resolved"
            value={resolvedCount}
            accent="emerald"
            delay={0.12}
          />
        </div>

        {/* Filters and search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search disputes by user, description, or type..."
              className="w-full rounded-xl border border-border/60 bg-white py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white p-1 shadow-sm">
            {(["ALL", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-neutral-600 hover:text-foreground"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Disputes List */}
        <div className="space-y-3">
          {loading ? (
            <AdminLoadingState message="Loading dispute claims..." />
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={CheckCircle2}
              title="No disputes found matching current filters"
              description="Try selecting a different status filter or clearing your search keywords."
            />
          ) : (
            paginated.map((d, i) => {
              const style = STATUS_STYLES[d.status] || STATUS_STYLES.OPEN
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style.bg} ${style.text} ${style.border}`}>
                          <style.icon className="size-3" /> {d.status.replace("_", " ")}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                          {d.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(d.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 text-sm font-bold text-foreground">
                        <span>{d.user?.full_name || "Participant"}</span>
                        <span className="text-xs font-normal text-neutral-400">({d.user?.phone_number || "No phone"})</span>
                      </div>

                      <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                        {d.description}
                      </p>

                      {d.auction && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <Gavel className="size-3 text-primary" />
                          <span>Auction: {d.auction.title || d.auction.public_code || d.auction_id}</span>
                        </div>
                      )}

                      {d.resolution && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                          <strong className="font-semibold text-emerald-900">Admin Resolution:</strong> {d.resolution}
                        </div>
                      )}

                      {d.document_urls && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-neutral-400">Evidence / Documents:</span>
                          {d.document_urls.split(",").map((url, idx) => {
                            const trimmed = url.trim()
                            const isHttp = trimmed.startsWith("http")
                            return isHttp ? (
                              <a
                                key={idx}
                                href={trimmed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-primary hover:underline"
                              >
                                <FileCheck className="size-2.5" /> Document {idx + 1}
                              </a>
                            ) : (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-600"
                              >
                                {trimmed}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {d.status === "OPEN" && (
                        <button
                          onClick={() => handleStartReview(d)}
                          className="rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors shadow-sm"
                        >
                          Start Review
                        </button>
                      )}
                      {(d.status === "OPEN" || d.status === "IN_REVIEW") && (
                        <button
                          onClick={() => handleOpenDeterminationModal(d)}
                          className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                        >
                          Resolve / Close
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>

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
      </div>

      {/* Resolution Modal */}
      <AnimatePresence>
        {activeModalDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground">
                  <FileCheck className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Dispute Determination</h3>
                </div>
                <button
                  onClick={() => setActiveModalDispute(null)}
                  className="rounded-full p-1 text-neutral-400 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                Case <strong className="font-mono text-foreground">{activeModalDispute.id.slice(0, 8)}</strong> filed by <strong className="text-foreground">{activeModalDispute.user?.full_name || "User"}</strong>
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Outcome Determination</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetStatus("RESOLVED")}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        targetStatus === "RESOLVED"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      Resolve in Favor
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetStatus("REJECTED")}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        targetStatus === "REJECTED"
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      Reject Claim
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Resolution Findings & Note</label>
                  <textarea
                    rows={3}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Describe findings, verified audit log timestamp, or actions taken..."
                    className="mt-1.5 w-full rounded-xl border border-border/60 bg-white p-3 text-xs text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Supporting Documents & Evidence (URLs / References)</label>
                  <input
                    type="text"
                    value={documentUrls}
                    onChange={(e) => setDocumentUrls(e.target.value)}
                    placeholder="e.g. https://storage.guessx.com/disputes/doc-123.pdf, Awash receipt #99182"
                    className="mt-1.5 w-full rounded-xl border border-border/60 bg-white p-2.5 text-xs text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                  <p className="mt-1 text-[10px] text-neutral-400">
                    Attach links to payment slips, bank confirmation statements, or procurement compliance transcripts.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalDispute(null)}
                  className="rounded-xl border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolveSubmit}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  {actionLoading && <Loader2 className="size-3 animate-spin" />}
                  Submit Determination
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}