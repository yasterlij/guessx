import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, RefreshCw, Radio,
  TrendingUp, Users, Ticket, Crown, ChevronRight, X, Loader2, Eye,
  ArrowUpDown, Wallet, CircleDollarSign, FileText,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { AdminExportMenu, computeDateBounds, type AdminDatePreset } from "../components/admin"
import { formatCurrency } from "../mockDataV0"
import { api } from "../api"
import { toast } from "../store/toast.store"
import { exportToCsv, exportToXlsx, exportToPdf } from "../utils/exportUtils"
import type { ApiAuction, ApiBid } from "@guessx/api"

type RangePreset = "today" | "7d" | "30d" | "all"

type EngagementRow = {
  product_id: string
  product_name: string
  category: string | null
  total_watchers: number
  unique_bidders: number
  total_bids: number
  avg_bids_per_user: number
  revenue_generated: number
  engagement_score: number
}

type CategoryRow = {
  category: string
  auction_count: number
  total_bids: number
  unique_bidders: number
  watchers: number
  revenue: number
}

type RevenueAnalytics = {
  total_bid_fee_revenue: number
  total_winning_payment_revenue: number
  total_revenue: number
}

type BidVolumeResponse = {
  points: Array<{ bucket: string; count: number }>
  total_bids: number
  unique_bidders: number
}

type SortKey = "engagement_score" | "total_bids" | "revenue_generated" | "total_watchers" | "unique_bidders"

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Past 7 Days" },
  { id: "30d", label: "Past 30 Days" },
  { id: "all", label: "All Time" },
]

const DONUT_COLORS = ["#C8A642", "#0071e3", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#64748B"]

function LineChart({ points, hourly }: { points: Array<{ bucket: string; count: number }>; hourly: boolean }) {
  if (points.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-neutral-400">No bid activity in this range</div>
  }
  const W = 620
  const H = 200
  const PAD = 8
  const max = Math.max(...points.map((p) => p.count), 1)
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX
    const y = H - PAD - (p.count / max) * (H - PAD * 2)
    return `${x},${y}`
  })
  const areaPath = `M${PAD},${H - PAD} L${coords.join(" L")} L${PAD + (points.length - 1) * stepX},${H - PAD} Z`
  const fmt = (iso: string) =>
    hourly
      ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" })
      : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bidline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8A642" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C8A642" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} stroke="#e5e5ea" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        <path d={areaPath} fill="url(#bidline)" />
        <polyline points={coords.join(" ")} fill="none" stroke="#C8A642" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.bucket} cx={PAD + i * stepX} cy={H - PAD - (p.count / max) * (H - PAD * 2)} r="3" fill="#fff" stroke="#C8A642" strokeWidth="2">
            <title>{`${fmt(p.bucket)}: ${p.count} bids`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-400">
        <span>{fmt(points[0].bucket)}</span>
        <span className="font-semibold text-neutral-500">peak {max} bids{hourly ? " /hr" : " /day"}</span>
        <span>{fmt(points[points.length - 1].bucket)}</span>
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: CategoryRow[] }) {
  const total = data.reduce((s, d) => s + d.total_bids, 0)
  if (total === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-neutral-400">No category data in this range</div>
  }
  const R = 70
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
        <circle cx="90" cy="90" r={R} fill="none" stroke="#f0f0f2" strokeWidth="22" />
        {data.slice(0, DONUT_COLORS.length).map((d, i) => {
          const frac = d.total_bids / total
          const dash = frac * C
          const el = (
            <circle
              key={d.category}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            >
              <title>{`${d.category}: ${d.total_bids} bids (${(frac * 100).toFixed(0)}%)`}</title>
            </circle>
          )
          offset += dash
          return el
        })}
        <text x="90" y="86" textAnchor="middle" className="fill-neutral-900 text-[15px] font-bold">{total}</text>
        <text x="90" y="102" textAnchor="middle" className="fill-neutral-400 text-[9px] font-semibold uppercase tracking-wide">bids</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.slice(0, DONUT_COLORS.length).map((d, i) => (
          <div key={d.category} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate font-medium text-neutral-700">{d.category}</span>
            <span className="font-semibold text-neutral-500">{((d.total_bids / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminAnalyticsScreen() {
  const { go } = useApp()
  const [preset, setPreset] = useState<RangePreset>("30d")
  const [category, setCategory] = useState("")
  const [hourly, setHourly] = useState(false)
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null)
  const [engagement, setEngagement] = useState<EngagementRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [bidVolume, setBidVolume] = useState<BidVolumeResponse | null>(null)
  const [walletTotal, setWalletTotal] = useState(0)
  const [depositsTotal, setDepositsTotal] = useState(0)

  const [sortKey, setSortKey] = useState<SortKey>("engagement_score")
  const [sortDesc, setSortDesc] = useState(true)

  const [drillProduct, setDrillProduct] = useState<EngagementRow | null>(null)
  const [drillAuctions, setDrillAuctions] = useState<ApiAuction[]>([])
  const [drillLoading, setDrillLoading] = useState(false)
  const [expandedAuctionId, setExpandedAuctionId] = useState<string | null>(null)
  const [auctionBids, setAuctionBids] = useState<ApiBid[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const auctionsCache = useRef<ApiAuction[] | null>(null)

  const range = useMemo(() => computeDateBounds(preset as AdminDatePreset), [preset])

  const fetchData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const params = { start: range.start, end: range.end }
      const [rev, eng, cats, vol, stats] = await Promise.all([
        api.adminGetRevenueAnalytics(params).catch(() => null),
        api.adminGetProductEngagement({ ...params, category: category || undefined }).catch(() => [] as EngagementRow[]),
        api.adminGetCategoryDistribution(params).catch(() => [] as CategoryRow[]),
        api.adminGetBidVolume({ ...params, granularity: hourly ? "hour" : "day" }).catch(() => null),
        api.adminGetStats().catch(() => null),
      ])
      setRevenue(rev)
      setEngagement(eng as EngagementRow[])
      setCategories(cats as CategoryRow[])
      setBidVolume(vol)
      if (stats) {
        setWalletTotal(stats.finances?.wallet_total ?? 0)
        setDepositsTotal(stats.finances?.deposits_total ?? 0)
      }
    } catch (e) {
      toast("Failed to load analytics", "error")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range, category, hourly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => fetchData(true), 15000)
    return () => clearInterval(t)
  }, [live, fetchData])

  const sortedEngagement = useMemo(() => {
    return [...engagement].sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]))
  }, [engagement, sortKey, sortDesc])

  const topProduct = engagement[0]
  const categoryOptions = useMemo(
    () => Array.from(new Set(categories.map((c) => c.category))).filter((c) => c !== "Uncategorized"),
    [categories],
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const exportRows = useMemo(
    () =>
      sortedEngagement.map((r) => [
        r.product_name,
        r.category ?? "",
        r.total_watchers,
        r.unique_bidders,
        r.total_bids,
        r.avg_bids_per_user,
        r.revenue_generated.toFixed(2),
        r.engagement_score.toFixed(2),
      ]),
    [sortedEngagement],
  )
  const exportHeaders = ["Product", "Category", "Watchers", "Unique Bidders", "Total Bids", "Avg Bids/User", "Revenue (ETB)", "Engagement Score"]
  const periodLabel = PRESETS.find((p) => p.id === preset)?.label ?? preset

  const handleExportCsv = async () => {
    const ok = await exportToCsv(`guessx-product-analytics-${preset}`, exportHeaders, exportRows, [
      `Period: ${periodLabel} (${new Date(range.start).toLocaleDateString()} - ${new Date(range.end).toLocaleDateString()})`,
      `Total Revenue: ${revenue?.total_revenue.toFixed(2) ?? "0.00"} ETB`,
      `Engagement Score = Watchers*0.3 + Unique Bidders*0.5 + Total Bids*0.2`,
    ])
    if (ok) toast("CSV exported", "success")
  }
  const handleExportXlsx = async () => {
    const ok = await exportToXlsx(`guessx-product-analytics-${preset}`, "Product Analytics", exportHeaders, exportRows, [
      { label: "Period", value: periodLabel },
      { label: "Total Revenue (ETB)", value: revenue?.total_revenue.toFixed(2) ?? "0.00" },
      { label: "Total Bids", value: bidVolume?.total_bids ?? 0 },
      { label: "Unique Bidders", value: bidVolume?.unique_bidders ?? 0 },
    ])
    if (ok) toast("XLSX exported", "success")
  }
  const handleExportPdf = () => {
    exportToPdf({
      title: "Guess X — Product Engagement & Analytics Report",
      reportCode: "GXR-ANL-001",
      metadata: [
        { label: "Period", value: periodLabel },
        { label: "Generated", value: new Date().toLocaleString() },
        { label: "Category Filter", value: category || "All" },
      ],
      summaryKpis: [
        { label: "Total Revenue", value: `${(revenue?.total_revenue ?? 0).toFixed(2)} ETB` },
        { label: "Total Bids", value: bidVolume?.total_bids ?? 0 },
        { label: "Unique Bidders", value: bidVolume?.unique_bidders ?? 0 },
        { label: "Top Product", value: topProduct?.product_name ?? "—" },
      ],
      headers: exportHeaders,
      rows: exportRows,
      legalDisclaimer:
        "Engagement Score = (Watchers x 0.3) + (Unique Bidders x 0.5) + (Total Bids x 0.2). Revenue figures are derived from the immutable transaction ledger in compliance with UNCITRAL audit directives.",
    })
    toast("PDF export generated", "success")
  }

  const openDrillDown = async (row: EngagementRow) => {
    setDrillProduct(row)
    setExpandedAuctionId(null)
    setAuctionBids([])
    setDrillLoading(true)
    try {
      if (!auctionsCache.current) {
        const res = await api.adminListAuctions(1, 200)
        auctionsCache.current = res.data || []
      }
      setDrillAuctions(auctionsCache.current.filter((a) => a.product_id === row.product_id))
    } catch {
      toast("Failed to load product auctions", "error")
      setDrillAuctions([])
    } finally {
      setDrillLoading(false)
    }
  }

  const expandAuction = async (auction: ApiAuction) => {
    if (expandedAuctionId === auction.id) {
      setExpandedAuctionId(null)
      return
    }
    setExpandedAuctionId(auction.id)
    setBidsLoading(true)
    setAuctionBids([])
    try {
      const bids = await api.getAuctionBids(auction.id)
      setAuctionBids(bids || [])
    } catch {
      toast("Failed to load bid history", "error")
    } finally {
      setBidsLoading(false)
    }
  }

  const statusBadge = (status?: string) => {
    const s = (status || "").toUpperCase()
    const cls =
      s === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "CLOSED" ? "bg-blue-50 text-blue-700 border-blue-200"
      : s === "EXPIRED" ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-neutral-100 text-neutral-600 border-neutral-200"
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{s || "UNKNOWN"}</span>
  }

  return (
    <AdminLayout
      title="Analytics & Financial Reports"
      subtitle="Product engagement, bidding behavior & financial reconciliation"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setLive((l) => !l)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              live ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Radio className={`size-3.5 ${live ? "animate-pulse text-emerald-600" : ""}`} />
            {live ? "Live" : "Live Off"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 shadow-sm">
          <div className="flex rounded-xl bg-neutral-100 p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.id ? "bg-white text-awash-blue shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setHourly((h) => !h)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              hourly ? "border-awash-gold/50 bg-amber-50 text-amber-700" : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {hourly ? "Hourly" : "Daily"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <AdminExportMenu
              onExportCsv={handleExportCsv}
              onExportXlsx={handleExportXlsx}
              onExportPdf={handleExportPdf}
            />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="size-5" />}
            label="Total Revenue"
            value={`${formatCurrency(revenue?.total_revenue ?? 0)} ETB`}
            hint={`Fees ${formatCurrency(revenue?.total_bid_fee_revenue ?? 0)} + Winnings ${formatCurrency(revenue?.total_winning_payment_revenue ?? 0)}`}
            accent="gold"
            delay={0}
          />
          <StatCard
            icon={<Users className="size-5" />}
            label="Unique Bidders"
            value={String(bidVolume?.unique_bidders ?? 0)}
            hint={`${bidVolume?.total_bids ?? 0} bids placed in range`}
            accent="blue"
            delay={0.05}
          />
          <StatCard
            icon={<Ticket className="size-5" />}
            label="Total Bid Tickets"
            value={String(bidVolume?.total_bids ?? 0)}
            hint={`${hourly ? "Hourly" : "Daily"} volume chart below`}
            accent="emerald"
            delay={0.1}
          />
          <StatCard
            icon={<Crown className="size-5" />}
            label="Top Product Demand"
            value={topProduct ? topProduct.product_name : "—"}
            hint={topProduct ? `Engagement score ${topProduct.engagement_score.toFixed(1)} · ${topProduct.total_bids} bids` : "No engagement yet"}
            accent="amber"
            delay={0.15}
          />
        </div>

        {/* Financial snapshot */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-awash-gold/30 bg-gradient-to-r from-amber-50/80 to-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <CircleDollarSign className="size-4" /> Financial Snapshot
          </div>
          <div className="text-xs text-neutral-600">
            <span className="font-bold text-neutral-900">{formatCurrency(walletTotal)} ETB</span> held in user wallets
          </div>
          <div className="text-xs text-neutral-600">
            <span className="font-bold text-neutral-900">{formatCurrency(depositsTotal)} ETB</span> total deposits
          </div>
          <button
            onClick={() => go("admin-settlement")}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink/90"
          >
            <FileText className="size-3.5" /> Revenue & Settlement Reports
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm lg:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="size-4 text-awash-blue" />
              <h3 className="text-sm font-bold text-foreground">Bid Activity & Volume Over Time</h3>
              {live && <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE</span>}
            </div>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-neutral-100" />
            ) : (
              <LineChart points={bidVolume?.points ?? []} hourly={hourly} />
            )}
          </div>
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="size-4 text-awash-blue" />
              <h3 className="text-sm font-bold text-foreground">Category Interest</h3>
            </div>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-neutral-100" />
            ) : (
              <DonutChart data={categories} />
            )}
          </div>
        </div>

        {/* Category breakdown table */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/60 px-5 py-3">
            <h3 className="text-sm font-bold text-foreground">Category Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-neutral-50/60 text-left text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5 text-right">Auctions</th>
                  <th className="px-5 py-2.5 text-right">Watchers</th>
                  <th className="px-5 py-2.5 text-right">Unique Bidders</th>
                  <th className="px-5 py-2.5 text-right">Total Bids</th>
                  <th className="px-5 py-2.5 text-right">Bid-Fee Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.category} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3 font-semibold text-foreground">{c.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{c.auction_count}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{c.watchers}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{c.unique_bidders}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">{c.total_bids}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{formatCurrency(c.revenue)} ETB</td>
                  </tr>
                ))}
                {!loading && categories.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">No category data in this range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product performance matrix */}
        <div className="rounded-2xl border border-border/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Product Performance Matrix</h3>
              <p className="text-[11px] text-neutral-400">Engagement Score = Watchers×0.3 + Unique Bidders×0.5 + Total Bids×0.2 — click a row to drill down</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-500">{sortedEngagement.length} products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-neutral-50/60 text-left text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-5 py-2.5">Product</th>
                  <th className="px-5 py-2.5">Category</th>
                  {([
                    ["total_watchers", "Watchers"],
                    ["unique_bidders", "Unique Bidders"],
                    ["total_bids", "Total Bids"],
                    ["revenue_generated", "Revenue"],
                    ["engagement_score", "Engagement"],
                  ] as Array<[SortKey, string]>).map(([key, label]) => (
                    <th key={key} className="cursor-pointer px-5 py-2.5 text-right select-none hover:text-neutral-700" onClick={() => toggleSort(key)}>
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <ArrowUpDown className={`size-3 ${sortKey === key ? "text-awash-blue" : "text-neutral-300"}`} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-border/40"><td colSpan={9} className="px-5 py-3"><div className="h-5 animate-pulse rounded bg-neutral-100" /></td></tr>
                  ))
                ) : (
                  sortedEngagement.map((row, i) => (
                    <tr
                      key={row.product_id}
                      onClick={() => openDrillDown(row)}
                      className="cursor-pointer border-b border-border/40 transition hover:bg-amber-50/40"
                    >
                      <td className="px-5 py-3 text-xs font-bold text-neutral-300">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{row.product_name}</td>
                      <td className="px-5 py-3 text-neutral-500">{row.category ?? "—"}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{row.total_watchers}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{row.unique_bidders}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">{row.total_bids}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-neutral-600">{formatCurrency(row.revenue_generated)} ETB</td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-block rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-2.5 py-1 text-xs font-bold tabular-nums text-amber-800">
                          {row.engagement_score.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && sortedEngagement.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-neutral-400">No product engagement data in this range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drill-down modal */}
      <AnimatePresence>
        {drillProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDrillProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-border/60 px-6 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Product Drill-Down</p>
                  <h3 className="font-display text-lg font-bold text-foreground">{drillProduct.product_name}</h3>
                  <p className="text-xs text-neutral-400">
                    {drillProduct.category ?? "Uncategorized"} · Score {drillProduct.engagement_score.toFixed(1)} · {drillProduct.total_watchers} watchers · {drillProduct.unique_bidders} bidders
                  </p>
                </div>
                <button onClick={() => setDrillProduct(null)} className="rounded-xl p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700">
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {drillLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400">
                    <Loader2 className="size-4 animate-spin" /> Loading auctions...
                  </div>
                ) : drillAuctions.length === 0 ? (
                  <div className="py-10 text-center text-sm text-neutral-400">No auctions found for this product</div>
                ) : (
                  <div className="space-y-2">
                    {drillAuctions.map((a) => (
                      <div key={a.id} className="overflow-hidden rounded-2xl border border-border/60">
                        <button
                          onClick={() => expandAuction(a)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">Auction #{a.public_code ?? "—"}</span>
                              {statusBadge(a.status)}
                            </div>
                            <p className="mt-0.5 text-[11px] text-neutral-400">
                              {a.start_time ? new Date(a.start_time).toLocaleDateString() : "—"} → {a.end_time ? new Date(a.end_time).toLocaleDateString() : "—"} · fee {formatCurrency(Number(a.bid_fee ?? 0))} ETB
                            </p>
                          </div>
                          <ChevronRight className={`size-4 shrink-0 text-neutral-400 transition-transform ${expandedAuctionId === a.id ? "rotate-90" : ""}`} />
                        </button>
                        {expandedAuctionId === a.id && (
                          <div className="border-t border-border/60 bg-neutral-50/50 px-4 py-3">
                            {bidsLoading ? (
                              <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-400">
                                <Loader2 className="size-3.5 animate-spin" /> Loading bid history...
                              </div>
                            ) : auctionBids.length === 0 ? (
                              <div className="py-4 text-center text-xs text-neutral-400">No bids recorded for this auction</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                                      <th className="py-1.5 pr-4">Bidder</th>
                                      <th className="py-1.5 pr-4">Amount</th>
                                      <th className="py-1.5 pr-4">Ticket</th>
                                      <th className="py-1.5">Time</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {auctionBids.map((b) => (
                                      <tr key={b.id} className="border-t border-border/40">
                                        <td className="py-1.5 pr-4 font-medium text-neutral-700">{b.user_name || b.user_id.slice(0, 8)}</td>
                                        <td className="py-1.5 pr-4 tabular-nums text-neutral-600">{formatCurrency(Number(b.amount))} ETB</td>
                                        <td className="py-1.5 pr-4 text-neutral-400">{b.ticket_number ?? "—"}</td>
                                        <td className="py-1.5 text-neutral-400">{new Date(b.bid_time).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
