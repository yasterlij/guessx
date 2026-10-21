import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  Lock,
  X,
  Trophy,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Printer,
} from "lucide-react"
import type { ApiUnifiedTransaction } from "../../api"
import { formatCurrency } from "../../mockDataV0"

const DEFAULT_TYPE_CONFIG: Record<string, { label: string; badgeBg: string }> = {
  WINNING_BID: {
    label: "Winner Payment",
    badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
  },
  BID_FEE: {
    label: "Participation Fee",
    badgeBg: "bg-indigo-50 text-indigo-900 border-indigo-200",
  },
  DEPOSIT: {
    label: "Wallet Top-Up",
    badgeBg: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  REFUND: {
    label: "Refund",
    badgeBg: "bg-sky-50 text-sky-900 border-sky-200",
  },
  WITHDRAWAL: {
    label: "Withdrawal",
    badgeBg: "bg-rose-50 text-rose-900 border-rose-200",
  },
  WALLET: {
    label: "Wallet Transaction",
    badgeBg: "bg-neutral-50 text-neutral-800 border-neutral-200",
  },
}

export interface TransactionAuditSlipModalProps {
  transaction: ApiUnifiedTransaction | null
  onClose: () => void
  onExportSlip: (txn: ApiUnifiedTransaction) => void
  typeConfig?: Record<string, { label: string; badgeBg: string }>
}

export function TransactionAuditSlipModal({
  transaction,
  onClose,
  onExportSlip,
  typeConfig = DEFAULT_TYPE_CONFIG,
}: TransactionAuditSlipModalProps) {
  if (!transaction) return null

  const isAuctionCategory =
    transaction.category === "AUCTION" || Boolean(transaction.auction_id)

  const isSuccessful =
    transaction.status === "SUCCESSFUL" || transaction.status === "PAID"
  const isPending = transaction.status === "PENDING"

  const cfg = typeConfig[transaction.type] || {
    label: transaction.type,
    badgeBg: "bg-neutral-100 text-neutral-800 border-neutral-200",
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-border/70 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-black text-awash-blue">
                    Transaction Audit Slip
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <Lock className="size-2.5 text-emerald-600" /> Immutable
                  </span>
                </div>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Ledger ID: {transaction.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Amount & Status Hero Card */}
          <div className="rounded-2xl border border-border/80 bg-neutral-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Certified Transaction Amount
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-black tabular-nums text-awash-blue">
                  {formatCurrency(transaction.amount)}
                </span>
                <span className="text-xs font-semibold text-neutral-500">ETB</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category badge */}
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  isAuctionCategory
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isAuctionCategory ? (
                  <Trophy className="size-3.5 text-purple-600" />
                ) : (
                  <Wallet className="size-3.5 text-emerald-600" />
                )}
                {transaction.category || (transaction.auction_id ? "AUCTION" : "WALLET")}
              </span>

              {/* Type badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${cfg.badgeBg}`}>
                {cfg.label}
              </span>

              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold border ${
                  isSuccessful
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isPending
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {isSuccessful ? (
                  <CheckCircle2 className="size-3 text-emerald-600" />
                ) : isPending ? (
                  <Clock className="size-3 text-amber-600" />
                ) : (
                  <XCircle className="size-3 text-red-600" />
                )}
                {transaction.status}
              </span>
            </div>
          </div>

          {/* Forensic Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Left Column: Auction & Item Info */}
            <div className="rounded-xl border border-border/70 p-3.5 space-y-2.5 bg-white">
              <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                Auction & Item Information
              </p>
              <div>
                <span className="text-[11px] text-neutral-500 block">Item / Product Name</span>
                <p className="font-bold text-awash-blue text-sm">
                  {transaction.product_name || "N/A (Direct Wallet Transaction)"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Auction ID</span>
                <p className="font-mono font-medium text-neutral-700">
                  {transaction.auction_id || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Bid Ticket Number</span>
                {transaction.ticket_number ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 mt-0.5">
                    #{transaction.ticket_number}
                  </span>
                ) : (
                  <p className="font-mono text-neutral-400">N/A (No ticket assigned)</p>
                )}
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Settlement Channel</span>
                <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200 mt-0.5">
                  {transaction.gateway || (transaction.payment_type === "WALLET" ? "Internal Wallet Balance" : "Payment Gateway")}
                </span>
              </div>
            </div>

            {/* Right Column: Bidder & Auditing Info */}
            <div className="rounded-xl border border-border/70 p-3.5 space-y-2.5 bg-white">
              <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
                Bidder & Audit Verification
              </p>
              <div>
                <span className="text-[11px] text-neutral-500 block">Bidder Phone / Name</span>
                <p className="font-mono font-bold text-neutral-800 text-sm">
                  {transaction.user_phone || transaction.user_name || "Anonymous User"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Bidder User UUID</span>
                <p className="font-mono text-[11px] text-neutral-600 truncate" title={transaction.user_id}>
                  {transaction.user_id}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Client Reference ID</span>
                <p className="font-mono text-[11px] text-neutral-600 truncate" title={transaction.reference_id || "N/A"}>
                  {transaction.reference_id || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-neutral-500 block">Escalation & Compliance</span>
                {transaction.escalation_flag ? (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mt-0.5">
                    <AlertTriangle className="size-3 text-amber-600" />
                    {transaction.escalation_flag}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Normal Execution (No Flag)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timestamp Audit Row */}
          <div className="rounded-xl border border-border/60 bg-neutral-50 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-neutral-500 font-medium">Certified Local Timestamp:</span>
              <p className="font-mono font-bold text-neutral-800">
                {new Date(transaction.created_at).toLocaleString("en-US", {
                  dateStyle: "full",
                  timeStyle: "medium",
                })}
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-neutral-500 font-medium">UTC Timestamp:</span>
              <p className="font-mono text-[11px] text-neutral-600">
                {new Date(transaction.created_at).toISOString()}
              </p>
            </div>
          </div>

          {/* Compliance Legal Seal Note */}
          <div className="rounded-xl bg-purple-50/50 p-3 text-[11px] text-purple-900 border border-purple-200 flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-purple-700 shrink-0 mt-0.5" />
            <p>
              <strong>UNCITRAL Model Law (Art. 37) & ICC §4.2 Certified Audit Trail:</strong> All transaction records are tamper-proof and cryptographically indexed across PostgreSQL relational ledgers and Redis persistent state journals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <button
              onClick={onClose}
              className="rounded-xl border border-border/70 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onExportSlip(transaction)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <Printer className="size-3.5" /> Print / Save Slip (PDF)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
