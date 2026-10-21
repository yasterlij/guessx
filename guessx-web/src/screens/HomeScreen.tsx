import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Gavel, Wallet, ArrowRight, Eye, EyeOff, Trophy, Sparkles, ChevronLeft, ChevronRight, TrendingDown, Users, Flame, ShieldCheck, Lock, Eye as EyeIcon, Headset, Search, CreditCard, Award, Clock, Zap, Package, CheckCircle2, Heart, Calendar, Bell } from "lucide-react"
import { useApp } from "../AppContext"
import { formatCurrency, formatCountdown, COMING_SOON_ITEMS } from "../mockDataV0"
import { useCountdown } from "../components/Countdown"
import { SmartImage } from "../components/SmartImage"
import { AuctionCard, SkeletonCard } from "./AuctionsScreen"
import { LiveAuctionsHero } from "../components/LiveAuctionsHero"


function maskPhone(p: string | null): string | null {
  return p ? p.slice(0, 4) + "XXXX" + p.slice(-2) : null
}

function LiveAuctionsCarousel({ auctions, onJoin }: { auctions: any[]; onJoin: (id: string) => void }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = auctions.length
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const auction = auctions[safeIndex]

  const goTo = useCallback((i: number) => {
    setIndex(((i % total) + total) % total)
  }, [total])

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total])
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total])

  useEffect(() => {
    if (paused || total <= 1) return
    timerRef.current = setTimeout(next, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [index, paused, total, next])

  const t = useCountdown(auction?.timeLeft ?? 0)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = auction?.status === "ending-soon" || (t > 0 && t < 3600)
  const publicCode = auction?.publicCode || auction?.productId || auction?.id?.slice(0, 6).toUpperCase()

  if (total === 0 || !auction) return null

  return (
    <div
      className="group relative h-full w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={auction.id}
            initial={{ opacity: 0, scale: 1.08, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.02, x: -30 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {auction.images?.length ? (
              <motion.div
                className="h-full w-full"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                <SmartImage src={auction.images[0]} alt={auction.name} loading="eager" className="h-full w-full object-cover" />
              </motion.div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ink">
                <Gavel className="size-14 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-start gap-3">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink backdrop-blur-md">
              <Flame className="size-3.5 text-ember" /> Live Auction
            </span>
            <span className="inline-flex items-center rounded-full bg-white/14 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
              Code {publicCode}
            </span>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.022em] text-white sm:text-3xl">{auction.name}</h2>
          {auction.specSummary && <p className="mt-1.5 text-sm font-normal text-white/85 sm:text-base">{auction.specSummary}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${urgent ? "bg-ember text-white" : "bg-white/85 text-ink"}`}>
              {d !== "00" ? `${parseInt(d)}d ` : ""}{h}:{m}:{s}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink">
              Bid Amount: {formatCurrency(auction.bidFee)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/14 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white">
              <Users className="size-3.5" /> {auction.totalBids || auction.bidders} bidders
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button onClick={() => onJoin(auction.id)} className="auction-hero-btn !w-auto px-7">
              Join Auction <ArrowRight className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              {auctions.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => goTo(i)}
                  aria-label={`Show auction ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
              <span className="ml-1 text-[11px] font-bold tabular-nums text-white/60">{index + 1} / {total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-y-0 left-2 flex items-center z-20">
        <button onClick={prev} aria-label="Previous live auction" className="hidden sm:flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/50">
          <ChevronLeft className="size-5" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center z-20">
        <button onClick={next} aria-label="Next live auction" className="hidden sm:flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/50">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/10">
        <motion.div
          key={`${auction.id}-${index}`}
          className="h-full bg-white"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: paused ? 60 : 6, ease: "linear" }}
        />
      </div>
    </div>
  )
}

function WinnerShowcaseSlide({ auction, index }: { auction: any; index: number }) {
  const winnerInfo = auction.winners?.[0]
  const maskedPhone = winnerInfo?.phone ? maskPhone(winnerInfo.phone) : null
  const firstName = winnerInfo?.name ? winnerInfo.name.split(" ")[0] : null
  const bidAmount = auction.winning_bid_amount ?? winnerInfo?.amount ?? 0

  return (
    <div className="group relative flex w-[280px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white transition-colors duration-200 hover:border-border/60 border border-transparent">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
        <SmartImage src={auction.images?.[0]} alt={auction.name} className="transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-ink">
            <Trophy className="size-3.5 text-primary" /> #{index + 1}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold text-ink">
              {firstName}
              {firstName && maskedPhone && <span className="text-[10px] font-normal text-neutral-400 ml-1.5">{maskedPhone}</span>}
              {!firstName && (maskedPhone || `Winner #${index + 1}`)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold tabular-nums text-ink">
            {formatCurrency(bidAmount)}
          </span>
        </div>
        <p className="text-xs font-medium text-neutral-500 leading-tight">{auction.name}</p>
        {auction.specSummary && <p className="truncate text-[11px] font-medium text-neutral-400">{auction.specSummary}</p>}
        <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
          <Sparkles className="size-3 text-primary" />
          <span className="text-[11px] font-semibold text-primary">Lowest unique bid won!</span>
        </div>
      </div>
    </div>
  )
}

function ComingSoonShowcaseSlide({
  item,
  isWatched,
  onToggleWatch,
}: {
  item: any
  isWatched: boolean
  onToggleWatch: () => void
}) {
  return (
    <div className="group relative flex w-[280px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white border border-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
        <SmartImage
          src={item.images?.[0]}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-awash-blue/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white border border-primary/40">
          <Clock className="size-3 text-primary" /> Coming Soon
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleWatch()
          }}
          className={`absolute top-3 right-3 flex size-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
            isWatched
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-black/40 text-white hover:bg-black/60"
          }`}
        >
          <Heart className="size-4" fill={isWatched ? "currentColor" : "none"} />
        </button>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-ink">
            <Calendar className="size-3 text-awash-blue" /> {item.dropTime}
          </span>
          <span className="rounded-full bg-primary/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-primary-foreground uppercase">
            {item.category}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <div>
          <h3 className="truncate font-display text-base font-bold text-ink">{item.name}</h3>
          <p className="line-clamp-2 text-xs text-neutral-500 mt-0.5 leading-relaxed">{item.specSummary}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">Est. Bid Fee</span>
            <span className="font-display text-sm font-bold text-primary tabular-nums">
              {formatCurrency(item.bidFee)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400">Retail Value</span>
            <span className="text-xs font-semibold text-neutral-500 line-through tabular-nums">
              {formatCurrency(item.marketPrice)}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleWatch}
          className={`w-full mt-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
            isWatched
              ? "bg-awash-blue text-white shadow-sm"
              : "bg-primary text-primary-foreground hover:bg-[#B89A38] shadow-sm"
          }`}
        >
          <Heart className="size-3.5" fill={isWatched ? "currentColor" : "none"} />
          {isWatched ? "Added to Watchlist" : "Notify Me (Watch)"}
        </button>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const { go, walletBalance, auctions, auctionsLoading, selectAuction, myBids, getAuction, favoriteAuctionIds, toggleFavorite } = useApp()
  const [showBalance, setShowBalance] = useState(true)
  const winnerScrollRef = useRef<HTMLDivElement>(null)
  const comingSoonScrollRef = useRef<HTMLDivElement>(null)

  const activeAuctions = useMemo(
    () => auctions.filter((a) => a.status !== "closed"),
    [auctions],
  )
  const closedAuctions = useMemo(
    () => auctions.filter((a) => a.status === "closed"),
    [auctions],
  )
  const endingSoon = useMemo(
    () => activeAuctions.filter((a) => a.status === "ending-soon" || a.timeLeft < 3600),
    [activeAuctions],
  )
  const displayHero = useMemo(
    () => (endingSoon.length > 0 ? endingSoon : activeAuctions),
    [endingSoon, activeAuctions],
  )
  const heroIds = useMemo(
    () => new Set(displayHero.slice(0, 10).map((a) => a.id)),
    [displayHero],
  )
  const liveGrid = useMemo(
    () => activeAuctions.filter((a) => !heroIds.has(a.id)),
    [activeAuctions, heroIds],
  )

  const bidAuctionIds = useMemo(
    () => new Set(myBids.map((b) => b.auctionId)),
    [myBids],
  )
  const bidCategories = useMemo(
    () =>
      new Set(
        myBids.map((b) => getAuction(b.auctionId)?.category).filter((c): c is string => !!c),
      ),
    [myBids, getAuction],
  )
  const suggestedAuctions = useMemo(
    () =>
      activeAuctions.filter(
        (a) => !heroIds.has(a.id) && !bidAuctionIds.has(a.id) && bidCategories.has(a.category),
      ),
    [activeAuctions, heroIds, bidAuctionIds, bidCategories],
  )
  const showSuggested = myBids.length > 0 && suggestedAuctions.length > 0

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: "left" | "right", amount: number) => {
    ref.current?.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-8 pb-8 stagger-enter"
    >
      {/* ── Live Auctions Hero Showcase ── */}
      <LiveAuctionsHero
        auctions={activeAuctions}
        loading={auctionsLoading}
        onSelectAuction={(id) => selectAuction(id)}
        onViewAll={() => go("auctions")}
      />

      {/* ── Suggested For You ── */}
      {showSuggested && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-canvas text-foreground">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.022em] text-foreground">Suggested For You</h2>
                <p className="text-sm font-normal text-neutral-500">Based on the auctions you've joined — bid low, be unique!</p>
              </div>
            </div>
            <button onClick={() => go("auctions")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-normal text-primary-foreground transition-colors hover:bg-[#B89A38] active:opacity-80">
              View All <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {suggestedAuctions.slice(0, 8).map((a, i) => (
              <AuctionCard key={a.id} auction={a} index={i} onOpen={() => selectAuction(a.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Auction Winners ── */}
      <section className="relative overflow-hidden rounded-2xl bg-canvas px-4 py-5 sm:px-6 sm:py-6">
        <div className="relative mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-ink text-white sm:size-11">
              <Trophy className="size-4 sm:size-[18px]" />
            </span>
            <div className="space-y-1.5 sm:space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ember sm:text-[11px] sm:tracking-[0.22em]">
                <span className="size-1.5 rounded-full bg-ember" />
                Winner Spotlight
              </div>
              <div className="hidden sm:block">
                <h2 className="font-display text-[1.72rem] font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-[2rem]">Latest Winners</h2>
                <p className="mt-1 max-w-xl text-[15px] font-normal leading-relaxed text-neutral-500 sm:text-[15px]">
                  Winning bids from recently closed auctions.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-row sm:items-center lg:justify-end">
            {closedAuctions.length > 0 && (
              <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 sm:inline-flex">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="size-3" />
                </span>
                {closedAuctions.length} winners showcased
              </div>
            )}
            <button onClick={() => go("closed-auctions")} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-normal text-primary-foreground transition-colors hover:bg-[#B89A38] active:opacity-80">
              View All Winners <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          {closedAuctions.length > 2 && (
            <>
              <button onClick={() => scroll(winnerScrollRef, "left", 300)} className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white border border-border/60 text-foreground hover:bg-cool-wash transition-colors opacity-0 hover:opacity-100">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={() => scroll(winnerScrollRef, "right", 300)} className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white border border-border/60 text-foreground hover:bg-cool-wash transition-colors opacity-0 hover:opacity-100">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          {closedAuctions.length > 0 ? (
            <div ref={winnerScrollRef} className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
              {closedAuctions.slice(0, 5).map((a, i) => (
                <WinnerShowcaseSlide key={a.id} auction={a} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Trophy className="size-6 text-primary" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-ink">Winners announced soon</p>
                <p className="mt-1 text-sm font-normal text-neutral-500">The lowest unique bid wins. Keep an eye on the live auctions!</p>
              </div>
            </div>
          )}
        </div>

      </section>

      {/* ── Coming Soon Section ── */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-awash-blue text-primary shadow-sm">
              <Sparkles className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  Coming Soon to Guess X!
                </h2>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                  Preview Drops
                </span>
              </div>
              <p className="text-sm font-medium text-neutral-500">
                Preview upcoming Guess X drops & set early launch alerts
              </p>
            </div>
          </div>
          <button
            onClick={() => go("favorites")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-[#B89A38] active:opacity-80 shadow-sm"
          >
            <Heart className="size-3.5" /> View Watchlist ({favoriteAuctionIds.length})
          </button>
        </div>

        {/* Teaser Banner */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-awash-blue via-[#001D40] to-ink p-4 text-white shadow-md border border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Bell className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">🚀 Get Early Drop Alerts</p>
              <p className="text-xs text-white/70">
                Tap the heart on any upcoming drop to receive instant notifications the moment bidding opens.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary bg-white/10 px-3 py-1 rounded-full shrink-0">
            Lowest Unique Bid Wins
          </span>
        </div>

        {/* Horizontal Carousel of Coming Soon Slides */}
        <div className="relative">
          <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
            {COMING_SOON_ITEMS.map((item) => (
              <ComingSoonShowcaseSlide
                key={item.id}
                item={item}
                isWatched={favoriteAuctionIds.includes(item.id)}
                onToggleWatch={() => toggleFavorite(item.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Promo ── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-ink p-7 text-white">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="size-4 text-white" />
                </span>
                <p className="font-display text-base font-semibold text-white">GuessX Auctions</p>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Premium phones, TVs, and laptops waiting for their lowest unique bid. The lower your bid, the better your chance to win.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-normal text-white/60">
                <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-white" /> {activeAuctions.length} live auctions</span>
                <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5 text-white" /> {closedAuctions.length} winners crowned</span>
                <span className="inline-flex items-center gap-1.5"><TrendingDown className="size-3.5 text-white" /> Lowest unique bid wins</span>
              </div>
            </div>
            <div className="flex gap-3 lg:shrink-0">
              <button onClick={() => go("auctions")} className="rounded-full bg-primary px-6 py-2.5 text-sm font-normal text-primary-foreground transition-colors hover:bg-[#B89A38] active:opacity-80">
                Browse Auctions
              </button>
              <button onClick={() => go("my-bids")} className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-normal text-white transition-colors hover:bg-white hover:text-ink">
                My Bids
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Banner ── */}
      <StatsBanner
        totalAuctions={auctions.length}
        happyWinners={closedAuctions.length}
        totalBids={auctions.reduce((sum, a) => sum + (a.totalBids || a.bidders), 0)}
        productsListed={new Set(auctions.map((a) => a.productId || a.id)).size}
      />

      {/* ── How It Works ── */}
      <HowItWorks />

      {/* ── Trust Badges ── */}
      <TrustBadges />
    </motion.div>
  )
}

function StatsBanner({ totalAuctions, happyWinners, totalBids, productsListed }: { totalAuctions: number; happyWinners: number; totalBids: number; productsListed: number }) {
  const stats = [
    { icon: Gavel, label: "Total Auctions", value: totalAuctions, color: "bg-canvas text-foreground" },
    { icon: Trophy, label: "Happy Winners", value: happyWinners, color: "bg-canvas text-foreground" },
    { icon: Zap, label: "Total Bids", value: totalBids, color: "bg-canvas text-foreground" },
    { icon: Package, label: "Products Listed", value: productsListed, color: "bg-canvas text-foreground" },
  ]
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-canvas p-5 sm:p-6"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col items-center text-center gap-2"
          >
            <div className={`flex size-12 items-center justify-center rounded-2xl ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-ink">{s.value.toLocaleString()}</p>
              <p className="text-[11px] font-medium text-neutral-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

const howItWorksSteps = [
  { icon: Search, label: "Browse", desc: "Explore live auctions across premium products", color: "bg-white text-foreground" },
  { icon: CreditCard, label: "Pay Fee", desc: "Pay a small bid fee to enter the auction", color: "bg-white text-foreground" },
  { icon: Gavel, label: "Place Bid", desc: "Submit your lowest unique bid amount", color: "bg-white text-foreground" },
  { icon: Trophy, label: "Win", desc: "Lowest unique bid takes home the prize!", color: "bg-white text-foreground" },
]

function HowItWorks() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-canvas p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-foreground">
          <Zap className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.022em] text-foreground">How It Works</h2>
          <p className="text-sm font-medium text-neutral-500">Four simple steps to win premium products</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorksSteps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative flex flex-col gap-3 rounded-2xl bg-white p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-11 items-center justify-center rounded-2xl ${step.color}`}>
                <step.icon className="size-5" />
              </div>
              <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                {i + 1}
              </span>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">{step.label}</p>
              <p className="mt-0.5 text-xs font-medium text-neutral-500 leading-relaxed">{step.desc}</p>
            </div>
            {i < howItWorksSteps.length - 1 && (
              <ArrowRight className="absolute -right-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/40 hidden lg:block" />
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

const trustBadgeItems = [
  { icon: Lock, label: "Secure Payments", desc: "Bank-grade encryption" },
  { icon: Award, label: "Fair Play Guarantee", desc: "Transparent algorithm" },
  { icon: EyeIcon, label: "Transparent Results", desc: "Verifiable outcomes" },
  { icon: Headset, label: "24/7 Support", desc: "Always here to help" },
]

function TrustBadges() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-canvas text-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.022em] text-foreground">Why Trust Guess X?</h2>
          <p className="text-sm font-medium text-neutral-500">Built on transparency, security, and fairness</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {trustBadgeItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }}
            className="group flex flex-col items-center gap-2.5 rounded-2xl bg-canvas p-5 text-center transition-colors hover:bg-cool-wash"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-foreground">
              <item.icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-400">{item.desc}</p>
            </div>
            <CheckCircle2 className="size-4 text-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
