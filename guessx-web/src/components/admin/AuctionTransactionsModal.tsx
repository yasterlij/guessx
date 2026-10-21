import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Receipt,
  X,
  DollarSign,
  Trophy,
  Sliders,
  ChevronDown,
  RotateCcw,
  Check,
} from "lucide-react"
import { api, type ApiAuctionTransactions } from "../../api"
import { Badge } from "../AuctionUI"
import { formatCurrency } from "../../mockDataV0"
import { exportToCsv, exportToXlsx, exportToPdf } from "../../utils/exportUtils"
import { toast } from "../../store/toast.store"
import type { Auction } from "../../mockDataV0"

export function AuctionTransactionsModal({
  auction,
  onClose,
}: {
  auction: Auction | null
  onClose: () => void
}) {
  const [txnData, setTxnData] = useState<ApiAuctionTransactions | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "bids" | "winner" | "fees" | "refunds" | "escalations"
  >("bids")

  const [showSplitConfig, setShowSplitConfig] = useState(false)
  const [splitWinningPrice, setSplitWinningPrice] = useState("")
  const [splitBidFees, setSplitBidFees] = useState("")
  const [splitPlatformShare, setSplitPlatformShare] = useState("")
  const [splitNetToSeller, setSplitNetToSeller] = useState("")
  const [splitSaving, setSplitSaving] = useState(false)

  useEffect(() => {
    if (!auction) {
      setTxnData(null)
      return
    }

    let active = true
    setLoading(true)

    api
      .adminGetAuctionTransactions(auction.id)
      .then((data) => {
        if (!active) return
        setTxnData(data)
        const rev = data.revenue_sharing
        setSplitWinningPrice(String(rev.winning_amount || ""))
        setSplitBidFees(String(data.total_bid_fees_collected || ""))
        setSplitPlatformShare(String(rev.platform_share || ""))
        setSplitNetToSeller(String(rev.net_to_seller || ""))
      })
      .catch(() => {
        if (!active) return
        const winAmt =
          auction.winning_bid_amount ??
          (auction.winners?.[0]?.amount != null
            ? Number(auction.winners[0].amount)
            : 0)
        const pShare = (winAmt * 10) / 100
        const netSeller = Math.max(0, winAmt - pShare)
        const bidFee = auction.bidFee || 10
        const fallback: ApiAuctionTransactions = {
          auction_id: auction.id,
          product_name: auction.name,
          public_code:
            typeof auction.publicCode === "number"
              ? auction.publicCode
              : parseInt(String(auction.publicCode || "0"), 10) || 0,
          status: auction.status,
          winner_user_id: auction.winner_user_id || auction.winners?.[0]?.user_id || null,
          winner_name: auction.winners?.[0]?.name || null,
          winner_phone: auction.winners?.[0]?.phone || null,
          winning_bid_amount: winAmt,
          payment_status: auction.payment_status || "PENDING",
          payment_deadline: auction.payment_deadline || null,
          second_winner_assigned: Boolean(auction.second_winner_assigned),
          escalation_rule: auction.escalation_rule || "LOWEST_UNIQUE_BID",
          bid_fee: bidFee,
          total_bids_count: (auction as any).total_bids || (auction as any).bidsCount || 0,
          total_bid_fees_collected: ((auction as any).total_bids || 0) * bidFee,
          revenue_sharing: {
            winning_amount: winAmt,
            platform_share: pShare,
            platform_share_percent: 10,
            tax: (winAmt * 15) / 100,
            tax_percent: 15,
            commission: (winAmt * 5) / 100,
            commission_percent: 5,
            net_to_seller: netSeller,
            platform_total_net: pShare,
          },
          bids: [],
          winner_payments: [],
          fee_payments: [],
          refunds: [],
          escalations: [],
        }
        setTxnData(fallback)
        setSplitWinningPrice(String(winAmt || ""))
        setSplitBidFees(String(fallback.total_bid_fees_collected || ""))
        setSplitPlatformShare(String(pShare || ""))
        setSplitNetToSeller(String(netSeller || ""))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [auction])

  const handleAutoBalanceSeller = () => {
    const w = parseFloat(splitWinningPrice) || 0
    const p = parseFloat(splitPlatformShare) || 0
    const net = Math.max(0, w - p)
    setSplitNetToSeller(String(net))
  }

  const handleSaveSettlementSplit = async () => {
    if (!auction || !txnData) return
    setSplitSaving(true)
    try {
      const winPrice = parseFloat(splitWinningPrice) || 0
      const bidFees = parseFloat(splitBidFees) || 0
      const platformShare = parseFloat(splitPlatformShare) || 0
      const netToSeller = parseFloat(splitNetToSeller) || 0

      const config = {
        winning_price: winPrice,
        bid_fees_collected: bidFees,
        platform_share: platformShare,
        net_to_seller: netToSeller,
      }

      await api.adminSaveAuctionSettlementConfig(auction.id, config)

      setTxnData((prev) => {
        if (!prev) return prev
        const tax = (winPrice * 15) / 100
        const commission = (winPrice * 5) / 100
        return {
          ...prev,
          winning_bid_amount: winPrice,
          total_bid_fees_collected: bidFees,
          revenue_sharing: {
            ...prev.revenue_sharing,
            winning_amount: winPrice,
            platform_share: platformShare,
            net_to_seller: netToSeller,
            platform_total_net: bidFees + platformShare + commission - tax,
            is_custom_configured: true,
          },
        }
      })

      toast("Saved custom settlement split", "success")
    } catch {
      toast("Failed to save settlement configuration", "error")
    } finally {
      setSplitSaving(false)
    }
  }

  const handleResetSettlementSplit = async () => {
    if (!auction) return
    setSplitSaving(true)
    try {
      await api.adminResetAuctionSettlementConfig(auction.id)
      const fresh = await api.adminGetAuctionTransactions(auction.id)
      setTxnData(fresh)
      const rev = fresh.revenue_sharing
      setSplitWinningPrice(String(rev.winning_amount || ""))
      setSplitBidFees(String(fresh.total_bid_fees_collected || ""))
      setSplitPlatformShare(String(rev.platform_share || ""))
      setSplitNetToSeller(String(rev.net_to_seller || ""))
      toast("Reset settlement configuration to automatic rules", "info")
    } catch {
      toast("Failed to reset settlement configuration", "error")
    } finally {
      setSplitSaving(false)
    }
  }

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    if (!txnData || !auction) return
    const publicCode =
      txnData.public_code || auction.publicCode || auction.id.slice(0, 8)
    const fileName = `auction-${publicCode}-transactions`

    const headers = ["Record Type", "Reference / Ticket", "Amount (ETB)", "User / Phone", "Status", "Timestamp"]
    const rows = [
      ...txnData.bids.map((b) => [
        "Auction Bid",
        `#${b.ticket_number || "—"}`,
        b.amount,
        b.user_phone || b.user_name || b.user_id.slice(0, 8),
        b.service_fee_paid ? "Fee Paid" : "Unpaid",
        b.bid_time,
      ]),
      ...txnData.winner_payments.map((w) => [
        "Winner Payment",
        w.client_reference_id || w.id.slice(0, 8),
        w.amount,
        w.customer_phone || "—",
        w.status,
        w.created_at,
      ]),
      ...txnData.fee_payments.map((f) => [
        f.type || "Bid Participation Fee",
        f.reference_id || f.id.slice(0, 8),
        f.amount,
        f.user_id.slice(0, 8),
        "COLLECTED",
        f.created_at,
      ]),
      ...txnData.refunds.map((r) => [
        "Refund Processed",
        r.reference_id || r.id.slice(0, 8),
        r.amount,
        r.user_id.slice(0, 8),
        "REFUNDED",
        r.created_at,
      ]),
    ]

    if (rows.length === 0) {
      toast("No transaction records to export for this auction", "info")
      return
    }

    if (format === "csv") {
      exportToCsv(fileName, headers, rows, [
        `Auction: ${auction.name} (ID: ${auction.id})`,
        `Winning Amount: ETB ${txnData.revenue_sharing.winning_amount}`,
        `Platform Share: ETB ${txnData.revenue_sharing.platform_share}`,
        `Net to Seller: ETB ${txnData.revenue_sharing.net_to_seller}`,
        `Compliance: UNCITRAL Model Law Art. 37 & ICC Rules §4.2`,
      ])
    } else if (format === "xlsx") {
      exportToXlsx(fileName, "Transactions", headers, rows, [
        { label: "Product Name", value: auction.name },
        { label: "Public Code", value: publicCode },
        { label: "Winning Bid", value: `ETB ${txnData.revenue_sharing.winning_amount}` },
        { label: "Platform Cut", value: `ETB ${txnData.revenue_sharing.platform_share}` },
        { label: "VAT Withheld", value: `ETB ${txnData.revenue_sharing.tax}` },
        { label: "Net to Seller", value: `ETB ${txnData.revenue_sharing.net_to_seller}` },
        { label: "Audit Standard", value: "UNCITRAL Model Law Art. 37" },
      ])
    } else {
      exportToPdf({
        title: "Guess X — Per-Auction Transaction & Settlement Slip",
        subtitle: `Auction: ${auction.name} (Public #${publicCode})`,
        reportCode: `TL-AUC-${publicCode}`,
        metadata: [
          { label: "Auction ID", value: auction.id },
          { label: "Public Code", value: publicCode },
          { label: "Payment Status", value: txnData.payment_status },
          { label: "Escalation Rule", value: txnData.escalation_rule },
          { label: "Winner", value: txnData.winner_name || txnData.winner_phone || "Pending / None" },
          { label: "2nd Winner Assigned", value: txnData.second_winner_assigned ? "YES (Flagged)" : "No" },
        ],
        summaryKpis: [
          { label: "Winning Amount", value: formatCurrency(txnData.revenue_sharing.winning_amount), color: "#0B192C" },
          { label: "Platform Net Cut", value: formatCurrency(txnData.revenue_sharing.platform_total_net), color: "#16A34A" },
          { label: "Net to Seller", value: formatCurrency(txnData.revenue_sharing.net_to_seller), color: "#2563EB" },
          { label: "Total Bids Placed", value: txnData.total_bids_count, color: "#854D0E" },
        ],
        revenueBreakdown: {
          winning_amount: txnData.revenue_sharing.winning_amount,
          platform_share: txnData.revenue_sharing.platform_share,
          tax: txnData.revenue_sharing.tax,
          commission: txnData.revenue_sharing.commission,
          net_to_seller: txnData.revenue_sharing.net_to_seller,
        },
        headers,
        rows,
      })
    }
    toast(`Exported ${format.toUpperCase()} for ${auction.name}`, "success")
  }

  return (
    <AnimatePresence>
      {auction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border/80 bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
                  <Receipt className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-extrabold text-awash-blue">
                      {txnData?.product_name || auction.name}
                    </h2>
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-600">
                      #{txnData?.public_code || auction.publicCode || auction.id.slice(0, 8)}
                    </span>
                    {txnData?.second_winner_assigned && (
                      <Badge tone="orange">2nd Winner Reassigned</Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium text-neutral-500 mt-0.5">
                    Per-Auction Transaction Logs, Winner Payments & Automated Revenue Sharing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                  <button
                    onClick={() => handleExport("csv")}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white text-neutral-600 hover:text-awash-blue transition-all"
                    title="Export CSV"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport("xlsx")}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white text-neutral-600 hover:text-emerald-700 transition-all"
                    title="Export Excel XLSX"
                  >
                    XLSX
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-white text-neutral-600 hover:text-primary transition-all"
                    title="Print UNCITRAL / ICC Audit Slip"
                  >
                    PDF
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {txnData && (
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-yellow-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-amber-700" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                      Automated Revenue Sharing & Tax Settlement
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSplitConfig((v) => !v)}
                      className="text-[10px] font-bold text-awash-blue bg-white/80 hover:bg-white border border-amber-300/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <Sliders className="size-3" />
                      Configure Splits
                      <ChevronDown
                        className={`size-3 transition-transform ${
                          showSplitConfig ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
                      UNCITRAL / ICC Compliant
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      Winning Bid
                    </span>
                    <p className="font-display text-sm font-extrabold text-awash-blue mt-0.5">
                      {formatCurrency(txnData.revenue_sharing.winning_amount)}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      Platform Share ({txnData.revenue_sharing.platform_share_percent}%)
                    </span>
                    <p className="font-display text-sm font-extrabold text-neutral-700 mt-0.5">
                      {formatCurrency(txnData.revenue_sharing.platform_share)}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      VAT Tax ({txnData.revenue_sharing.tax_percent}%)
                    </span>
                    <p className="font-display text-sm font-extrabold text-neutral-700 mt-0.5">
                      {formatCurrency(txnData.revenue_sharing.tax)}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      Commission ({txnData.revenue_sharing.commission_percent}%)
                    </span>
                    <p className="font-display text-sm font-extrabold text-neutral-700 mt-0.5">
                      {formatCurrency(txnData.revenue_sharing.commission)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">
                      Net to Seller
                    </span>
                    <p className="font-display text-sm font-extrabold text-emerald-800 mt-0.5">
                      {formatCurrency(txnData.revenue_sharing.net_to_seller)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-200/60 text-amber-900 font-medium">
                  <span>
                    Total Participation Fees:{" "}
                    <strong>{formatCurrency(txnData.total_bid_fees_collected)}</strong>{" "}
                    ({txnData.total_bids_count} bids placed)
                  </span>
                  <span>
                    Net Platform Revenue:{" "}
                    <strong>{formatCurrency(txnData.revenue_sharing.platform_total_net)}</strong>
                  </span>
                </div>

                <AnimatePresence>
                  {showSplitConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2 border-t border-amber-200/80"
                    >
                      <div className="p-3.5 bg-white rounded-xl border border-amber-300/80 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-xs font-bold text-awash-blue">
                              Custom Settlement Split Configuration
                            </h5>
                            <p className="text-[11px] text-neutral-500">
                              Adjust amounts or percentages for this auction. Updates will apply to accounting and settlement ledgers.
                            </p>
                          </div>
                          {txnData.revenue_sharing.is_custom_configured && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              Custom Rules Active
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                              Winning Price (ETB)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={splitWinningPrice}
                              onChange={(e) => setSplitWinningPrice(e.target.value)}
                              placeholder="e.g. 2500"
                              className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                              Bid Fees Collected (ETB)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={splitBidFees}
                              onChange={(e) => setSplitBidFees(e.target.value)}
                              placeholder="e.g. 350"
                              className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                              Platform Share (ETB)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={splitPlatformShare}
                              onChange={(e) => setSplitPlatformShare(e.target.value)}
                              placeholder="e.g. 250"
                              className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-neutral-700 block">
                                Net to Seller (ETB)
                              </label>
                              <button
                                type="button"
                                onClick={handleAutoBalanceSeller}
                                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                              >
                                Auto-balance
                              </button>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={splitNetToSeller}
                              onChange={(e) => setSplitNetToSeller(e.target.value)}
                              placeholder="e.g. 2000"
                              className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none bg-emerald-50/40 text-emerald-900"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-2">
                          <div className="text-[11px] text-neutral-500 font-medium">
                            Gross Settlement:{" "}
                            <strong className="text-awash-blue">
                              ETB{" "}
                              {(
                                (parseFloat(splitWinningPrice) || 0) +
                                (parseFloat(splitBidFees) || 0)
                              ).toLocaleString()}
                            </strong>
                          </div>
                          <div className="flex items-center gap-2">
                            {txnData.revenue_sharing.is_custom_configured && (
                              <button
                                onClick={handleResetSettlementSplit}
                                disabled={splitSaving}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-neutral-600 hover:bg-neutral-100 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="size-3" />
                                Reset to Auto
                              </button>
                            )}
                            <button
                              onClick={handleSaveSettlementSplit}
                              disabled={splitSaving}
                              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-awash-blue text-white hover:bg-awash-blue/90 shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Check className="size-3.5" />
                              Save & Apply Split
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
              {[
                { id: "bids" as const, label: `Bids & Tickets (${txnData?.bids.length || 0})` },
                { id: "winner" as const, label: `Winner Payments (${txnData?.winner_payments.length || 0})` },
                { id: "fees" as const, label: `Fee Payments (${txnData?.fee_payments.length || 0})` },
                { id: "refunds" as const, label: `Refunds (${txnData?.refunds.length || 0})` },
                { id: "escalations" as const, label: `Escalations (${txnData?.escalations.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-awash-blue text-white shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[220px] max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-xs text-neutral-400">
                  Loading auction transactions...
                </div>
              ) : activeTab === "bids" ? (
                txnData?.bids.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-10 text-center">No bids recorded yet</p>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden">
                    {txnData?.bids.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              Auction Bid
                            </span>
                            <span className="font-mono font-bold text-awash-blue">#{b.ticket_number || "—"}</span>
                            <span className="font-semibold text-neutral-600">
                              {b.user_phone || b.user_name || b.user_id.slice(0, 8)}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">
                            {new Date(b.bid_time).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-display font-bold text-awash-blue">
                            {formatCurrency(b.amount)}
                          </span>
                          <span
                            className={`block text-[10px] font-bold ${
                              b.service_fee_paid ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {b.service_fee_paid ? "Fee Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === "winner" ? (
                txnData?.winner_payments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Trophy className="size-8 text-neutral-300 mb-2" />
                    <p className="text-xs font-semibold text-neutral-500">No Winner Payment Records</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Status: {txnData?.payment_status} · Winner:{" "}
                      {txnData?.winner_name || txnData?.winner_user_id?.slice(0, 8) || "Unassigned"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden">
                    {txnData?.winner_payments.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-3 text-xs hover:bg-neutral-50">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Winner Settlement Payment
                            </span>
                            <span className="font-bold text-awash-blue">{w.gateway || "Internal Wallet"}</span>
                            {w.client_reference_id && (
                              <span className="font-mono text-[10px] text-neutral-400">
                                Ref: {w.client_reference_id}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Bidder: {w.customer_phone || "—"} · {new Date(w.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-extrabold text-awash-blue">{formatCurrency(w.amount)}</p>
                          <Badge tone={w.status === "SUCCESSFUL" || w.status === "PAID" ? "green" : "orange"}>
                            {w.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === "fees" ? (
                txnData?.fee_payments.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-10 text-center">No fee transaction records</p>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden">
                    {txnData?.fee_payments.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200">
                              Bid Participation Fee
                            </span>
                            {f.reference_id && (
                              <span className="text-[10px] font-mono text-neutral-500">Ref: {f.reference_id}</span>
                            )}
                          </div>
                          <span className="block text-[10px] text-neutral-400 mt-0.5">
                            User: {f.user_id.slice(0, 8)} · {new Date(f.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="font-display font-bold text-amber-700">{formatCurrency(f.amount)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === "refunds" ? (
                txnData?.refunds.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-10 text-center">No refunds recorded for this auction</p>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden">
                    {txnData?.refunds.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                        <div>
                          <span className="font-bold text-destructive">REFUND PROCESSED</span>
                          <span className="block text-[10px] text-neutral-400">
                            User: {r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="font-display font-bold text-destructive">+{formatCurrency(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : txnData?.escalations.length === 0 ? (
                <p className="text-xs text-neutral-400 py-10 text-center">No escalation events recorded</p>
              ) : (
                <div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden">
                  {txnData?.escalations.map((e) => (
                    <div key={e.id} className="p-3 text-xs hover:bg-neutral-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-awash-blue">{e.action}</span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Actor: {e.actor_phone || e.actor_id.slice(0, 8)}
                      </p>
                      {e.details && (
                        <pre className="mt-1 p-2 bg-neutral-100 rounded-lg text-[10px] font-mono text-neutral-600 overflow-x-auto whitespace-pre-wrap">
                          {typeof e.details === "object" ? JSON.stringify(e.details, null, 2) : e.details}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
