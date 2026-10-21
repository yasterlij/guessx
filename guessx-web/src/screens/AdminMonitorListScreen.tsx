import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Radio, Users, TrendingDown, Clock, Eye, Search, RefreshCw, Gavel, Inbox } from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { AdminEmptyState } from "../components/admin"
import { api } from "../api"
import { toast } from "../store/toast.store"
import { useAuctionSocket, applySocketUpdate } from "../hooks/useAuctionSocket"
import { normalizeAuctionCategory } from "../lib/auctionCategories"
import { formatCurrency, formatETB } from "../mockDataV0"
import type { Auction } from "../mockDataV0"
import { useCountdown } from "../components/Countdown"

type AdminAuction = Auction & { product_id?: string }

export function AdminMonitorListScreen() {
  const { go, auctions, auctionsLoading, refreshAuctions, selectAuctionForMonitor, user } = useApp()
  const [search, setSearch] = useState("")
  const [adminAuctions, setAdminAuctions] = useState<AdminAuction[]>([])

  useEffect(() => {
    api.adminListAuctions(1, 200)
      .then((res) => {
        const list = ((res as any).data || res || []) as any[]
        const mapped = list.map(mapAdminAuction)
        setAdminAuctions(mapped)
      })
      .catch(() => toast("Failed to load auctions", "error"))
  }, [auctions])

  useAuctionSocket(null, () => {})

  const activeAuctions = useMemo(() => {
    return adminAuctions.filter((a) => a.status !== "closed")
  }, [adminAuctions])

  const filtered = activeAuctions.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleRefresh = () => {
    refreshAuctions()
    api.adminListAuctions(1, 200)
      .then((res) => {
        const list = ((res as any).data || res || []) as any[]
        setAdminAuctions(list.map(mapAdminAuction))
      })
      .catch(() => {})
  }

  return (
    <AdminLayout title="Monitor Auctions" subtitle={`${activeAuctions.length} live auctions`}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.04 } },
        }}
        className="space-y-4"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search auctions…"
              className="h-10 w-full rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm pl-9 pr-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-50 active:scale-95"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </motion.div>

        {filtered.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title="No active auctions to monitor"
            description="Create an auction or check back later."
          />
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((a, i) => (
              <AuctionMonitorCard
                key={a.id}
                auction={a}
                delay={i * 0.05}
                onMonitor={() => selectAuctionForMonitor(a.id)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </AdminLayout>
  )
}

function AuctionMonitorCard({ auction, delay, onMonitor }: { auction: AdminAuction; delay: number; onMonitor: () => void }) {
  const seconds = auction.timeLeft
  const isEndingSoon = seconds > 0 && seconds < 3600

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onMonitor}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,43,92,0.04)] transition-all hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(0,43,92,0.08)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 ring-1 ring-awash-blue/10">
        {auction.images?.[0] ? (
          <img src={auction.images[0]} alt={auction.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-300">
            <Gavel className="size-8" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          <Radio className="size-3 animate-pulse" /> LIVE
        </div>
        {isEndingSoon && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Clock className="size-3" /> Ending Soon
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-sm font-bold text-awash-blue">{auction.name}</h3>
          <span className="shrink-0 font-display text-xs font-bold text-primary">{formatCurrency(auction.marketPrice)}</span>
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-neutral-400">{auction.category || "No category"}</p>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-neutral-50 px-2 py-1.5 text-center">
            <Users className="mx-auto size-3.5 text-awash-blue" />
            <p className="mt-0.5 font-display text-sm font-extrabold tabular-nums text-awash-blue">{auction.totalBids || auction.bidders}</p>
            <p className="text-[8px] font-semibold uppercase text-neutral-400">Bids</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-2 py-1.5 text-center">
            <TrendingDown className="mx-auto size-3.5 text-primary" />
            <p className="mt-0.5 font-display text-sm font-extrabold tabular-nums text-primary">{auction.uniqueBidders ?? "—"}</p>
            <p className="text-[8px] font-semibold uppercase text-neutral-400">Unique</p>
          </div>
          <div className="rounded-lg bg-neutral-50 px-2 py-1.5 text-center">
            <Clock className="mx-auto size-3.5 text-neutral-500" />
            <CountdownMini seconds={seconds} />
            <p className="text-[8px] font-semibold uppercase text-neutral-400">Left</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-awash-blue/5 py-2 text-xs font-bold text-awash-blue transition-colors group-hover:bg-awash-blue/10">
          <Eye className="size-3.5" /> Monitor Auction
        </div>
      </div>
    </motion.div>
  )
}

function CountdownMini({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const label = h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}`
  return <p className={`mt-0.5 font-display text-sm font-extrabold tabular-nums ${h > 0 ? "text-awash-blue" : "text-amber-600"}`}>{label}</p>
}

function mapAdminAuction(a: any): AdminAuction {
  const timeLeft = Math.max(0, Math.floor((new Date(a.end_time).getTime() - Date.now()) / 1000))
  return {
    id: a.id,
    productId: a.product_id,
    name: a.product?.name || "Unknown",
    category: normalizeAuctionCategory(a.product?.category, a.product?.name),
    images: a.product?.image_urls || [],
    marketPrice: Number(a.product?.current_market_price || 0),
    bidFee: a.bid_fee != null ? Number(a.bid_fee) : 1,
    bidders: a.stats?.total_bids ?? 0,
    uniqueBidders: a.stats?.unique_bidders ?? 0,
    totalBids: a.stats?.total_bids ?? 0,
    timeLeft,
    endTime: a.end_time,
    status: a.status === "ACTIVE" ? (timeLeft < 3600 ? "ending-soon" : "live") : "closed",
    description: a.product?.description || "",
    highlights: [],
    minBid: a.min_bid ?? undefined,
    maxBid: a.max_bid ?? undefined,
    winning_bid_amount: a.winning_bid_amount ?? null,
    winner_user_id: a.winner_user_id ?? null,
    winnersCount: a.winners_count ?? 0,
    payment_status: a.payment_status,
  }
}
