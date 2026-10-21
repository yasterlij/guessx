import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Gavel, Clock, TicketCheck, Trophy, ChevronRight, Hash, TrendingDown, TrendingUp, Search, X, Copy, Check } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge } from "../components/AuctionUI"
import { useCountdown } from "../components/Countdown"
import { formatCurrency, formatETB, formatCountdown } from "../mockDataV0"
import { usePagination, PaginationBar } from "../components/Pagination"

function TimeLeft({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const { h, m, s } = formatCountdown(t)
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-awash-blue">
      <Clock className="size-3" />
      {h}:{m}:{s} left
    </span>
  )
}

export function MyBidsScreen() {
  const { go, goBack, myBids, selectAuction, getAuction } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState<"all" | "active" | "ended">("all")
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null)

  const handleCopyTicket = (ticket: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ticket)
    setCopiedTicket(ticket)
    setTimeout(() => setCopiedTicket(null), 2000)
  }

  const { filteredBids, stats } = useMemo(() => {
    let activeCount = 0
    let endedCount = 0

    const processed = myBids.map((b) => {
      const a = getAuction(b.auctionId)
      const isClosed = a?.status === "closed"
      if (isClosed) endedCount++
      else activeCount++
      return { bid: b, auction: a, isClosed }
    })

    let filtered = processed

    if (filterTab === "active") {
      filtered = filtered.filter((item) => !item.isClosed)
    } else if (filterTab === "ended") {
      filtered = filtered.filter((item) => item.isClosed)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((item) =>
        item.auction?.name.toLowerCase().includes(q) ||
        (item.bid.ticketNumber && item.bid.ticketNumber.toLowerCase().includes(q)) ||
        (item.auction?.publicCode && item.auction.publicCode.toLowerCase().includes(q))
      )
    }

    return {
      filteredBids: filtered,
      stats: {
        total: myBids.length,
        active: activeCount,
        ended: endedCount,
      },
    }
  }, [myBids, getAuction, filterTab, searchQuery])

  const { page, setPage, perPage, setPerPage, totalPages, paginated, resetPage } = usePagination(filteredBids, 10)

  useEffect(() => {
    resetPage()
  }, [searchQuery, filterTab, resetPage])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">My Bids</h1>
            <p className="text-sm font-medium text-neutral-500">Track every auction you've entered.</p>
          </div>
        </div>
        <Badge tone="gold">
          <TicketCheck className="size-3" />
          {myBids.length} placed
        </Badge>
      </motion.div>

      {/* ── Stats Summary Row ── */}
      {myBids.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="flex flex-col rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
              <Gavel className="size-3.5 text-awash-gold" />
              <span>Total Bids</span>
            </div>
            <span className="mt-1 font-display text-lg font-extrabold text-foreground">{stats.total}</span>
          </div>

          <div className="flex flex-col rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
              <TrendingUp className="size-3.5 text-emerald-600" />
              <span>Active</span>
            </div>
            <span className="mt-1 font-display text-lg font-extrabold text-foreground">{stats.active}</span>
          </div>

          <div className="flex flex-col rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
              <Trophy className="size-3.5 text-awash-blue" />
              <span>Ended</span>
            </div>
            <span className="mt-1 font-display text-lg font-extrabold text-foreground">{stats.ended}</span>
          </div>
        </motion.div>
      )}

      {/* ── Search & Filter Controls ── */}
      {myBids.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bids by item, code or ticket..."
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 bg-neutral-100/80 p-1 rounded-xl border border-border/40">
            {(["all", "active", "ended"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === tab
                    ? "bg-white text-awash-blue shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tab === "all" ? `All (${stats.total})` : tab === "active" ? `Active (${stats.active})` : `Ended (${stats.ended})`}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {myBids.length === 0 ? (
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
          className="flex flex-col items-center gap-4 py-20"
        >
          <span className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-awash-blue/10 to-awash-blue/5 border border-awash-blue/20 text-awash-blue">
            <Gavel className="size-10" />
          </span>
          <div className="text-center">
            <p className="font-display text-lg font-bold text-foreground">No bids yet</p>
            <p className="mt-1 text-sm font-medium text-neutral-500 max-w-xs">
              Browse the live auctions and place your first unique lowest bid to start winning.
            </p>
          </div>
          <button onClick={() => go("auctions")} className="btn-primary !w-auto !px-8 !h-11 !text-sm">
            Browse Auctions
          </button>
        </motion.div>
      ) : filteredBids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-display text-base font-bold text-neutral-700">No matching bids found</p>
          <p className="mt-1 text-xs text-neutral-500">Try changing your search query or switching tabs.</p>
          <button
            onClick={() => {
              setSearchQuery("")
              setFilterTab("all")
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-neutral-100 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-col gap-3"
        >
          {paginated.map(({ bid, auction, isClosed }, i) => {
            if (!auction) return null
            const isCopied = copiedTicket === bid.ticketNumber

            return (
              <motion.div
                key={`${bid.auctionId}-${bid.placedAt}-${bid.amount}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={() => selectAuction(bid.auctionId)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white hover:shadow-[0_8px_32px_rgba(200,166,66,0.08)] active:scale-[0.98]"
                >
                  <div className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 border border-border/40 shadow-[0_6px_18px_rgba(0,43,92,0.12)]">
                    <img
                      src={auction.images?.[0] || "/placeholder.svg"}
                      alt={auction.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-foreground">{auction.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-neutral-400">Your bid</span>
                      <span className="font-display text-sm font-extrabold text-gradient-gold tabular-nums">
                        {formatCurrency(bid.amount)}
                      </span>
                    </div>

                    {bid.ticketNumber && (
                      <div
                        onClick={(e) => handleCopyTicket(bid.ticketNumber!, e)}
                        className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 transition-colors border border-border/40 cursor-pointer"
                        title="Click to copy ticket"
                      >
                        <Hash className="size-2.5 text-neutral-500" />
                        <span className="font-mono text-[10px] font-semibold text-neutral-600">
                          {bid.ticketNumber}
                        </span>
                        {isCopied ? (
                          <Check className="size-2.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-2.5 text-neutral-400 group-hover:text-neutral-600" />
                        )}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center gap-2">
                      {!isClosed ? (
                        <TimeLeft seconds={auction.timeLeft} />
                      ) : (
                        <span className="text-[11px] font-medium text-neutral-400">Ended</span>
                      )}
                      {isClosed ? (
                        <Badge tone="muted">Closed</Badge>
                      ) : (
                        <Badge tone="green">
                          <Trophy className="size-3" />
                          Live
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-neutral-400 tabular-nums">{auction.totalBids || auction.bidders} bids</span>
                    <ChevronRight className="size-4 text-neutral-400 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {filteredBids.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={filteredBids.length}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      )}

      {myBids.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-2xl bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-5 text-white shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="relative z-10 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <TrendingDown className="size-5 text-awash-gold" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-white">Lowest Unique Bid Strategy</p>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                The lower and more unique your bid, the higher your chance of winning. Choose an amount no one else would think of!
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
