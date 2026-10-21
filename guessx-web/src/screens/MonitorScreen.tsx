import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bell, Users, Radio, Eye, TrendingDown, Trophy } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { Countdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"

export function MonitorScreen() {
  const { go, goBack, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)

  const [seconds, setSeconds] = useState(auction?.timeLeft ?? 130)
  const [bidCount, setBidCount] = useState(auction?.totalBids || auction?.bidders || 0)

  useEffect(() => {
    setSeconds(auction?.timeLeft ?? 130)
    setBidCount(auction?.totalBids || auction?.bidders || 0)
  }, [auction])

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])



  useEffect(() => {
    if (seconds <= 0) {
      const t = setTimeout(() => go("closed"), 1200)
      return () => clearTimeout(t)
    }
  }, [seconds, go])

  if (!auction) return null

  const endingSoon = seconds <= 60
  const bidProgress = auction.maxBid ? Math.min(bidCount / auction.maxBid, 1) : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-1 flex-col overflow-y-auto"
    >
      
      <AppBar title="Auction in Progress" onBack={goBack} />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="flex-1 px-5 pb-20 lg:pb-6 pt-5"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="flex items-center justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 backdrop-blur-sm px-3 py-1 text-xs font-bold text-emerald-700 animate-pulse">
            <Radio className="size-3.5" /> LIVE
          </span>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="mt-4 items-center p-5 text-center">
            <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-awash-blue/10 via-white to-awash-gold/10 shadow-[0_8px_24px_rgba(0,43,92,0.14)] ring-1 ring-awash-blue/10">
              <img src={auction.images?.[0] || "/placeholder.svg"} alt={auction.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
            <h2 className="mt-3 font-display text-lg font-extrabold text-awash-blue">{auction.name}</h2>
            <span className="text-xs font-medium text-neutral-400">Time Left</span>
            <div className="mt-2 flex justify-center"><Countdown seconds={seconds} size="lg" /></div>
          </Card>
        </motion.div>

        {auction.maxBid && (
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            className="mt-3 px-1"
          >
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold text-neutral-400">Total bids: {bidCount}</span>
              <span className="text-[10px] font-semibold text-neutral-400">Capacity: {auction.maxBid}</span>
            </div>
            <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#F27A18" : "#10B981" }} />
            </div>
          </motion.div>
        )}

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="mt-4 grid grid-cols-3 gap-3"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-4 text-center">
              <Users className="mx-auto size-5 text-awash-blue" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-blue tabular-nums">{bidCount}</p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Total Bids</span>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-4 text-center">
              <Users className="mx-auto size-5 text-primary" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-gold-dark tabular-nums">{auction.uniqueBidders || auction.bidders}</p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Bidders</span>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-4 text-center">
              <TrendingDown className="mx-auto size-5 text-emerald-600" />
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">{formatETB(userBid ?? 0)}</p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Your Bid</span>
            </Card>
          </motion.div>
        </motion.div>

        {endingSoon && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mt-4 flex items-center gap-3 border-primary/40 bg-gradient-to-r from-primary/5 to-awash-gold-light/5 p-4">
              <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-awash-gold-light text-awash-blue shadow-lg shadow-primary/20 animate-pulse">
                <Bell className="size-5" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-primary">Auction Ending Soon!</p>
                <p className="text-xs font-medium text-awash-blue/70">{auction.name} is about to close. Stay tuned!</p>
              </div>
            </Card>
          </motion.div>
        )}

        {auction.minBid && bidCount < auction.minBid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="mt-3 flex items-center gap-2 border-amber-200 bg-amber-50/80 backdrop-blur-sm p-3">
              <Bell className="size-4 text-amber-600 flex-shrink-0" />
              <p className="text-[11px] font-medium text-amber-800">
                Only {bidCount}/{auction.minBid} bids — may extend if under minimum
              </p>
            </Card>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-center text-xs font-medium text-awash-blue/60"
        >
          Keep watching — you might be the lowest unique bidder!
        </motion.p>
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-white/90 p-4 backdrop-blur-xl lg:static">
        <CTAButton variant="navy" onClick={() => go("closed")}>
          <Eye className="size-[18px]" /> View Result Now
        </CTAButton>
      </div>
    </motion.div>
  )
}
