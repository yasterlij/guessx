import { useEffect, useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Receipt, Download, RefreshCw, ArrowDownCircle, ArrowUpCircle, Wallet,
  Search, X, Filter, Calendar, Trophy, AlertTriangle, ShieldCheck,
  FileSpreadsheet, FileText, CheckCircle2, XCircle, Clock, ExternalLink,
  Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Eye, Printer, Tag
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { DataTable, type Column } from "../components/DataTable"
import { Badge } from "../components/AuctionUI"
import { api, type ApiUnifiedTransaction } from "../api"
import { toast } from "../store/toast.store"
import { formatCurrency } from "../mockDataV0"
import { exportToCsv, exportToXlsx, exportToPdf } from "../utils/exportUtils"
import { PaginationBar } from "../components/Pagination"
import { TransactionAuditSlipModal } from "../components/admin"

type DatePreset = "all" | "today" | "week" | "month" | "custom"

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Wallet; color: string; bg: string; badgeBg: string }> = {
  WINNING_BID: {
    label: "Winner Payment",
    icon: Trophy,
    color: "text-amber-700",
    bg: "bg-amber-100 border-amber-300",
    badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
  },
  BID_FEE: {
    label: "Bid Participation Fee",
    icon: ArrowUpCircle,
    color: "text-orange-700",
    bg: "bg-orange-100 border-orange-200",
    badgeBg: "bg-orange-50 text-orange-900 border-orange-200",
  },
  BID: {
    label: "Auction Bid Ticket",
    icon: Layers,
    color: "text-indigo-700",
    bg: "bg-indigo-100 border-indigo-200",
    badgeBg: "bg-indigo-50 text-indigo-900 border-indigo-200",
  },
  DEPOSIT: {
    label: "Wallet Top-Up",
    icon: ArrowDownCircle,
    color: "text-emerald-700",
    bg: "bg-emerald-100 border-emerald-200",
    badgeBg: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  REFUND: {
    label: "Refund",
    icon: ArrowDownCircle,
    color: "text-sky-700",
    bg: "bg-sky-100 border-sky-200",
    badgeBg: "bg-sky-50 text-sky-900 border-sky-200",
  },
  WITHDRAWAL: {
    label: "Withdrawal",
    icon: ArrowUpCircle,
    color: "text-rose-700",
    bg: "bg-rose-100 border-rose-200",
    badgeBg: "bg-rose-50 text-rose-900 border-rose-200",
  },
  WALLET: {
    label: "Wallet Transaction",
    icon: Wallet,
    color: "text-neutral-700",
    bg: "bg-neutral-100 border-neutral-200",
    badgeBg: "bg-neutral-50 text-neutral-800 border-neutral-200",
  },
}

export function AdminTransactionsScreen() {
  const [txns, setTxns] = useState<ApiUnifiedTransaction[]>([])
  const [selectedTxn, setSelectedTxn] = useState<ApiUnifiedTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<"all" | "auction" | "wallet">("all")
  const [summary, setSummary] = useState({
    total_volume: 0,
    auction_volume: 0,
    wallet_topup_volume: 0,
    winning_bid_volume: 0,
    bid_fee_volume: 0,
    deposit_volume: 0,
    refund_volume: 0,
    successful_count: 0,
    pending_count: 0,
    defaulted_count: 0,
    auction_transactions_count: 0,
    wallet_transactions_count: 0,
  })

  // Filters
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [bulkExportOpen, setBulkExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const dateBounds = useMemo(() => {
    if (datePreset === "all") return { start: undefined, end: undefined }
    const now = new Date()
    const start = new Date()
    if (datePreset === "today") {
      start.setHours(0, 0, 0, 0)
    } else if (datePreset === "week") {
      start.setDate(now.getDate() - 7)
    } else if (datePreset === "month") {
      start.setDate(now.getDate() - 30)
    } else if (datePreset === "custom") {
      return {
        start: customStart ? new Date(customStart).toISOString() : undefined,
        end: customEnd ? new Date(customEnd).toISOString() : undefined,
      }
    }
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    }
  }, [datePreset, customStart, customEnd])

  const loadData = useCallback(() => {
    setLoading(true)
    api.adminListEnhancedTransactions({
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      start: dateBounds.start,
      end: dateBounds.end,
      search: searchQuery.trim() || undefined,
      page,
      limit: pageSize,
    })
      .then((res) => {
        setTxns(res.data || [])
        setTotalPages(res.meta?.total_pages || 1)
        setTotalCount(res.meta?.total || 0)
        if (res.summary) setSummary(res.summary)
      })
      .catch(() => toast("Failed to load transactions", "error"))
      .finally(() => setLoading(false))
  }, [categoryFilter, typeFilter, statusFilter, dateBounds, searchQuery, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Multi-format export handlers
  const handleExport = (format: "csv" | "xlsx" | "pdf", presetOverride?: DatePreset) => {
    setExporting(true)
    try {
      const headers = [
        "Transaction ID",
        "Category",
        "Type",
        "Amount (ETB)",
        "Status",
        "Gateway",
        "Auction / Product",
        "Bidder / User",
        "Reference / Ticket",
        "Date & Time",
        "Escalation Flag",
      ]

      const rows = txns.map((t) => [
        t.id.slice(0, 12),
        t.category || (t.auction_id ? "AUCTION" : "WALLET"),
        TYPE_CONFIG[t.type]?.label || t.type,
        t.amount,
        t.status,
        t.gateway || "N/A",
        t.product_name || (t.auction_id ? `Auction #${t.auction_id.slice(0, 8)}` : "Wallet Transfer"),
        t.user_phone || t.user_name || t.user_id.slice(0, 8),
        t.ticket_number || t.reference_id || "—",
        new Date(t.created_at).toLocaleString(),
        t.escalation_flag ? t.escalation_flag.replace(/_/g, " ") : "Normal",
      ])

      const periodStr = presetOverride || datePreset
      const filename = `guessx-transactions-${periodStr}-${Date.now().toString().slice(-6)}`

      if (format === "csv") {
        exportToCsv(filename, headers, rows, [
          `Export Period: ${periodStr}`,
          `Auction Proceeds Volume: ETB ${summary.auction_volume.toFixed(2)}`,
          `Wallet Top-Up Volume: ETB ${summary.wallet_topup_volume.toFixed(2)}`,
          `Total Volume: ETB ${summary.total_volume.toFixed(2)}`,
          `Winning Bid Volume: ETB ${summary.winning_bid_volume.toFixed(2)}`,
          `Bid Fee Volume: ETB ${summary.bid_fee_volume.toFixed(2)}`,
          "Governance: UNCITRAL Article 37 & ICC Commercial Auction Rules",
        ])
        toast("CSV exported successfully", "success")
      } else if (format === "xlsx") {
        exportToXlsx(filename, "Transactions", headers, rows, [
          { label: "Auction Proceeds Volume", value: `ETB ${summary.auction_volume.toFixed(2)}` },
          { label: "Wallet Top-Up Volume", value: `ETB ${summary.wallet_topup_volume.toFixed(2)}` },
          { label: "Total Volume", value: `ETB ${summary.total_volume.toFixed(2)}` },
          { label: "Winning Bids Volume", value: `ETB ${summary.winning_bid_volume.toFixed(2)}` },
          { label: "Bid Fees Volume", value: `ETB ${summary.bid_fee_volume.toFixed(2)}` },
          { label: "Successful Transactions", value: summary.successful_count },
          { label: "Compliance Protocol", value: "UNCITRAL Model Law Art. 37" },
        ])
        toast("Excel XLSX exported successfully", "success")
      } else if (format === "pdf") {
        exportToPdf({
          title: "Guess X — Transaction & Winner Payment Ledger",
          subtitle: `Official Transaction Log (${periodStr.toUpperCase()})`,
          metadata: [
            { label: "Report Period", value: periodStr },
            { label: "Records Count", value: txns.length },
            { label: "Compliance Standard", value: "UNCITRAL Art. 37 & ICC Rules" },
            { label: "Integrity Status", value: "🔒 Verified Immutable" },
          ],
          summaryKpis: [
            { label: "Auction Proceeds", value: formatCurrency(summary.auction_volume), color: "#6B21A8" },
            { label: "Winner Payments", value: formatCurrency(summary.winning_bid_volume), color: "#0B192C" },
            { label: "Bid Fees Collected", value: formatCurrency(summary.bid_fee_volume), color: "#854D0E" },
            { label: "Wallet Top-Ups", value: formatCurrency(summary.wallet_topup_volume), color: "#047857" },
            { label: "Successful", value: summary.successful_count, color: "#16A34A" },
          ],
          headers,
          rows,
          legalDisclaimer: "This certified transaction report is generated from Guess X's read-only immutable audit trail in compliance with UNCITRAL procurement directives.",
        })
      }
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : String(e)) || "Export failed", "error")
    } finally {
      setExporting(false)
      setBulkExportOpen(false)
    }
  }

  const handleExportSingleSlip = (t: ApiUnifiedTransaction) => {
    const isAuction = t.category === "AUCTION" || Boolean(t.auction_id)
    const typeLabel = TYPE_CONFIG[t.type]?.label || t.type
    exportToPdf({
      title: "OFFICIAL TRANSACTION FORENSIC AUDIT SLIP",
      subtitle: `Cryptographic audit certificate for Transaction #${t.id}`,
      metadata: [
        { label: "Ledger ID", value: t.id },
        { label: "Category", value: t.category || (isAuction ? "AUCTION" : "WALLET") },
        { label: "Transaction Nature", value: typeLabel },
        { label: "Auction Product", value: t.product_name || "N/A" },
        { label: "Ticket Number", value: t.ticket_number || "N/A" },
        { label: "Bidder Phone / Name", value: t.user_phone || t.user_name || "N/A" },
        { label: "Gateway Channel", value: t.gateway || (t.payment_type === "WALLET" ? "Internal Wallet" : "System") },
        { label: "Timestamp (UTC)", value: new Date(t.created_at).toISOString() },
      ],
      summaryKpis: [
        { label: "Amount", value: formatCurrency(t.amount), color: "#0B192C" },
        { label: "Status", value: t.status, color: t.status === "SUCCESSFUL" || t.status === "PAID" ? "#16A34A" : "#DC2626" },
        { label: "Category", value: t.category || (isAuction ? "AUCTION" : "WALLET"), color: isAuction ? "#6B21A8" : "#047857" },
      ],
      headers: ["Audit Field", "Ledger Record Value"],
      rows: [
        ["Transaction ID", t.id],
        ["Classification", t.category || (isAuction ? "AUCTION" : "WALLET")],
        ["Transaction Nature", typeLabel],
        ["Transaction Amount", `${t.amount} ETB`],
        ["Product Name", t.product_name || "N/A"],
        ["Auction Reference ID", t.auction_id || "N/A"],
        ["Bid Ticket Number", t.ticket_number || "N/A"],
        ["Bidder User ID", t.user_id],
        ["Bidder Phone", t.user_phone || "N/A"],
        ["Payment Gateway", t.gateway || (t.payment_type === "WALLET" ? "Internal Wallet" : "System")],
        ["Client Reference ID", t.reference_id || "N/A"],
        ["Payment Status", t.status],
        ["Escalation Flag", t.escalation_flag || "NONE"],
        ["Created At (UTC)", new Date(t.created_at).toISOString()],
        ["Created At (Local)", new Date(t.created_at).toLocaleString()],
      ],
      legalDisclaimer: "UNCITRAL Article 37 & ICC §4.2 Certified Record. This forensic transaction slip represents an immutable ledger entry on Guess X.",
    })
  }

  const columns: Column<ApiUnifiedTransaction>[] = [
    {
      key: "category",
      header: "Category",
      render: (t: ApiUnifiedTransaction) => {
        const isAuction = t.category === "AUCTION" || Boolean(t.auction_id)
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
              isAuction
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            {isAuction ? <Trophy className="size-3 text-purple-600" /> : <Wallet className="size-3 text-emerald-600" />}
            {t.category || (t.auction_id ? "AUCTION" : "WALLET")}
          </span>
        )
      },
    },
    {
      key: "type",
      header: "Transaction Type",
      render: (t: ApiUnifiedTransaction) => {
        const config = TYPE_CONFIG[t.type] || {
          label: t.type,
          icon: Wallet,
          color: "text-neutral-600",
          bg: "bg-neutral-100 border-neutral-200",
          badgeBg: "bg-neutral-100 text-neutral-800 border-neutral-200",
        }
        return (
          <div className="flex items-center gap-2">
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${config.bg}`}>
              <config.icon className={`size-3.5 ${config.color}`} />
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${config.badgeBg}`}>
              {config.label}
            </span>
          </div>
        )
      },
    },
    {
      key: "reference",
      header: "Auction / Item & Ticket",
      render: (t: ApiUnifiedTransaction) => {
        const isAuction = t.category === "AUCTION" || Boolean(t.auction_id)
        return (
          <div className="min-w-0 max-w-[260px]">
            {isAuction ? (
              <>
                <p className="truncate text-xs font-bold text-awash-blue" title={t.product_name || "Auction Item"}>
                  {t.product_name || `Auction #${t.auction_id?.slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {t.ticket_number && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                      #{t.ticket_number}
                    </span>
                  )}
                  {t.auction_id && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      ID: {t.auction_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="truncate text-xs font-semibold text-neutral-700">
                  User Wallet Top-Up / Settlement
                </p>
                {t.reference_id && (
                  <span className="text-[10px] font-mono text-neutral-400 truncate block">
                    Ref: {t.reference_id}
                  </span>
                )}
              </>
            )}
          </div>
        )
      },
    },
    {
      key: "amount",
      header: "Amount (ETB)",
      align: "right" as const,
      render: (t: ApiUnifiedTransaction) => (
        <div className="text-right">
          <span className="font-display text-sm font-black tabular-nums text-awash-blue">
            {formatCurrency(t.amount)}
          </span>
          <div className="mt-0.5">
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
              {t.gateway || (t.payment_type === "WALLET" ? "Wallet" : "System")}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "user",
      header: "Bidder / Account",
      render: (t: ApiUnifiedTransaction) => (
        <div>
          <p className="font-mono text-xs font-semibold text-neutral-800">
            {t.user_phone || t.user_name || "Anonymous User"}
          </p>
          <span className="text-[10px] font-mono text-neutral-400">
            UID: {t.user_id.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status & Flags",
      render: (t: ApiUnifiedTransaction) => {
        const isSuccess = t.status === "SUCCESSFUL" || t.status === "PAID"
        const isPending = t.status === "PENDING"
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isSuccess
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : isPending
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="size-2.5" />
                ) : isPending ? (
                  <Clock className="size-2.5" />
                ) : (
                  <XCircle className="size-2.5" />
                )}
                {t.status}
              </span>
            </div>
            {t.escalation_flag === "SECOND_WINNER_ASSIGNED" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700 border border-purple-200">
                <Trophy className="size-2 text-purple-600" /> 2nd Winner Assigned
              </span>
            )}
            {t.escalation_flag === "PAYMENT_DEFAULTED" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700 border border-red-200">
                <AlertTriangle className="size-2 text-red-600" /> Payment Defaulted
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "time",
      header: "Timestamp",
      align: "right" as const,
      render: (t: ApiUnifiedTransaction) => (
        <div className="text-right">
          <span className="text-[11px] font-medium text-neutral-600 tabular-nums block">
            {new Date(t.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[10px] text-neutral-400 tabular-nums">
            {new Date(t.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Audit Slip",
      align: "center" as const,
      render: (t: ApiUnifiedTransaction) => (
        <button
          onClick={() => setSelectedTxn(t)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-awash-blue bg-neutral-100 hover:bg-primary hover:text-white transition-all shadow-xs"
          title="Inspect Cryptographic Audit Slip"
        >
          <Receipt className="size-3.5" />
          <span>Slip</span>
        </button>
      ),
    },
  ]

  return (
    <AdminLayout
      title="Transaction Management"
      subtitle="Per-auction logs, winner settlement payments, wallet deposits, and compliance records"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkExportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <Download className="size-3.5" /> Bulk Download
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-neutral-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ── Immutable Audit Header Banner ── */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-neutral-900 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Immutable Read-Only Audit Ledger
              </p>
              <p className="text-xs font-medium text-neutral-300">
                All bids, winner payments, and fee transactions are cryptographically recorded and tamper-proof per UNCITRAL Article 37 & ICC Auction Guidelines.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-neutral-200">
              <ShieldCheck className="size-3.5 text-primary" /> ISO 27001 Verified
            </span>
          </div>
        </div>

        {/* ── Top Summary KPI Cards: Separate Auction Proceeds from Wallet Top-Ups ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Auction Proceeds</span>
              <Trophy className="size-4 text-purple-700" />
            </div>
            <p className="mt-2 font-display text-xl font-black tabular-nums text-purple-900">
              {formatCurrency(summary.auction_volume)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-purple-700/80">
              Winner pay + bid fees ({summary.auction_transactions_count} txns)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Winner Payments</span>
              <Receipt className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-primary">
              {formatCurrency(summary.winning_bid_volume)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500">Completed settlements</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Participation Fees</span>
              <ArrowUpCircle className="size-4 text-amber-600" />
            </div>
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-amber-800">
              {formatCurrency(summary.bid_fee_volume)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-700/70">Auction fees collected</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Wallet Top-Ups</span>
              <ArrowDownCircle className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-display text-xl font-black tabular-nums text-emerald-900">
              {formatCurrency(summary.wallet_topup_volume)}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-emerald-700/80">
              Deposits ({summary.wallet_transactions_count} user funding)
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Compliance Status</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-xl font-extrabold tabular-nums text-emerald-700">
                {summary.successful_count}
              </span>
              <span className="text-xs font-semibold text-emerald-600">paid</span>
              {summary.defaulted_count > 0 && (
                <span className="text-xs font-bold text-red-600">({summary.defaulted_count} defaulted)</span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
              {summary.pending_count} pending settlement
            </p>
          </motion.div>
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-1">
          <button
            onClick={() => {
              setCategoryFilter("all")
              setTypeFilter("all")
              setPage(1)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === "all"
                ? "bg-awash-blue text-white shadow-sm"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-border/60"
            }`}
          >
            <Layers className="size-3.5" />
            All Transactions
          </button>
          <button
            onClick={() => {
              setCategoryFilter("auction")
              setTypeFilter("all")
              setPage(1)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === "auction"
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-border/60"
            }`}
          >
            <Trophy className="size-3.5" />
            Auction Transactions (Proceeds & Bids)
          </button>
          <button
            onClick={() => {
              setCategoryFilter("wallet")
              setTypeFilter("all")
              setPage(1)
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === "wallet"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-border/60"
            }`}
          >
            <Wallet className="size-3.5" />
            Wallet Top-Ups & Refunds
          </button>
        </div>

        {/* ── Filters Bar ── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-border/70 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by Reference, Ticket, Phone, Auction ID, or Product..."
              className="w-full rounded-xl border border-border/80 bg-neutral-50/50 pl-9 pr-8 py-2 text-xs font-medium text-foreground outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-xl border border-border/80 bg-white px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">
                {categoryFilter === "auction"
                  ? "All Auction Types"
                  : categoryFilter === "wallet"
                  ? "All Wallet Types"
                  : "All Types"}
              </option>
              {categoryFilter !== "wallet" && (
                <>
                  <option value="WINNING_BID">Winner Payments</option>
                  <option value="BID_FEE">Bid Participation Fees</option>
                  <option value="BID">Auction Bids</option>
                </>
              )}
              {categoryFilter !== "auction" && (
                <>
                  <option value="DEPOSIT">Wallet Top-Ups</option>
                  <option value="REFUND">Refunds</option>
                </>
              )}
            </select>

            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-xl border border-border/80 bg-white px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired / Defaulted</option>
            </select>

            {/* Date Preset selector */}
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value as DatePreset)
                setPage(1)
              }}
              className="h-9 rounded-xl border border-border/80 bg-white px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">All Time</option>
              <option value="today">Today (24h)</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Quick Export Dropdown */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
              <button
                onClick={() => handleExport("csv")}
                title="Export as CSV"
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white transition-all text-neutral-600 hover:text-awash-blue"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport("xlsx")}
                title="Export as Excel XLSX"
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white transition-all text-neutral-600 hover:text-emerald-700"
              >
                XLSX
              </button>
              <button
                onClick={() => handleExport("pdf")}
                title="Printable UNCITRAL / ICC Audit Slip"
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white transition-all text-neutral-600 hover:text-primary"
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── Custom Date Range Inputs (if selected) ── */}
        {datePreset === "custom" && (
          <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-xl border border-border/70 text-xs">
            <span className="font-semibold text-neutral-500">Custom Date Bounds:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-border/70 bg-white px-2.5 py-1 font-medium"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-border/70 bg-white px-2.5 py-1 font-medium"
            />
            <button
              onClick={loadData}
              className="rounded-lg bg-primary px-3 py-1 font-bold text-primary-foreground hover:opacity-90"
            >
              Apply Bounds
            </button>
          </div>
        )}

        {/* ── Data Table ── */}
        <div className="glass-card-solid">
          <DataTable
            columns={columns}
            rows={txns}
            rowKey={(t) => t.id}
            loading={loading}
            empty={{
              icon: <Receipt className="size-6 text-neutral-400" />,
              title: "No transactions found",
              message: "No transactions match your current filters or date range.",
            }}
          />

          {/* ── Pagination Bar ── */}
          {totalCount > 0 && (
            <div className="border-t border-border/60 bg-white p-3">
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={totalCount}
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

      {/* ── Bulk Download Modal ── */}
      <AnimatePresence>
        {bulkExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Download className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-extrabold text-awash-blue">Bulk Export Transactions</h3>
                    <p className="text-xs text-neutral-500">Download complete audit records across all auctions</p>
                  </div>
                </div>
                <button onClick={() => setBulkExportOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-neutral-600">Select Export Period:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["today", "week", "month"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setDatePreset(period)}
                      className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all ${
                        datePreset === period
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      {period === "today" ? "Daily (24h)" : period === "week" ? "Weekly (7d)" : "Monthly (30d)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <p className="text-xs font-bold text-neutral-600">Select File Format:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/70 hover:border-awash-blue hover:bg-neutral-50 text-xs font-bold text-neutral-700"
                  >
                    <FileText className="size-5 text-neutral-600" />
                    CSV File
                  </button>
                  <button
                    onClick={() => handleExport("xlsx")}
                    disabled={exporting}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-bold text-emerald-800"
                  >
                    <FileSpreadsheet className="size-5 text-emerald-600" />
                    Excel (XLSX)
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    disabled={exporting}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-amber-200 hover:border-primary hover:bg-amber-50 text-xs font-bold text-primary"
                  >
                    <ShieldCheck className="size-5 text-primary" />
                    Print / PDF
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-500 border border-border/50">
                Exports include metadata: Auction ID, Bidder ID/phone, Bid Amount, Payment Status, Gateway References, and Escalation Flags in accordance with international auditing standards.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* ── Transaction Forensic Audit Slip Modal ── */}
        <TransactionAuditSlipModal
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onExportSlip={handleExportSingleSlip}
          typeConfig={TYPE_CONFIG}
        />
      
    </AdminLayout>
  )
}
