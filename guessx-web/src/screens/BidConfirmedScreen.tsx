import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Check, Eye, Home, MessageSquareText, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { formatCurrency, formatETB } from "../mockDataV0"
import { isStaffRole } from "@guessx/api"

const particles = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 0.6}s`,
  duration: `${0.8 + Math.random() * 0.8}s`,
  color: i % 3 === 0 ? "#0071e3" : i % 3 === 1 ? "#1d1d1f" : "#86868b",
}))

export function BidConfirmedScreen() {
  const { go, goBack, selectedId, userBid, bidTicketNumber, getAuction, user } = useApp()
  const isAdmin = isStaffRole(user?.role)
  const auction = getAuction(selectedId)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!auction) return null

  const smsMessage = bidTicketNumber
    ? `Your bid of ${formatCurrency(userBid ?? 0)} on '${auction.name}' has been placed successfully. Your BID ticket number is: ${bidTicketNumber}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="flex flex-1 flex-col overflow-y-auto relative"
    >
      {/* ── Confetti Particles ── */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute size-2 rounded-sm"
              style={{
                left: p.left,
                top: "-10px",
                backgroundColor: p.color,
                animation: `confetti ${p.duration} ${p.delay} ease-out forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 backdrop-blur-md px-4 py-3">
        <button onClick={goBack} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-all hover:bg-neutral-100 hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-foreground">Bid Submitted</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        {/* ── Success Animation ── */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
          <motion.span
            initial={{ rotate: -90 }}
            animate={{ rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)]"
          >
            <Check className="size-12" strokeWidth={3} />
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 font-display text-2xl font-extrabold text-foreground"
        >
          Bid Submitted Successfully!
        </motion.h1>

        {smsMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 flex w-full max-w-xs items-start gap-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 p-3 text-left shadow-sm"
          >
            <MessageSquareText className="mt-0.5 size-4 flex-shrink-0 text-blue-600" />
            <p className="text-xs font-medium leading-relaxed text-blue-800">{smsMessage}</p>
          </motion.div>
        )}

        {/* ── Bid Summary Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 w-full max-w-xs rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 backdrop-blur-sm p-5 shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">
            Your Bid
          </span>
          <p className="mt-1 font-display text-4xl font-extrabold text-gradient-gold tabular-nums">
            {formatCurrency(userBid ?? 0)}
          </p>
          <div className="mt-4 border-t border-primary/10 pt-3 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Product</span>
              <span className="font-semibold text-foreground">{auction.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-neutral-500">Status</span>
              <span className="font-semibold text-emerald-600">Recorded ✓</span>
            </div>
            {bidTicketNumber && (
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-neutral-500">Ticket</span>
                <span className="font-mono text-[11px] font-bold text-awash-blue">{bidTicketNumber}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 max-w-xs text-sm font-medium text-neutral-500"
        >
          Keep watching — you might be the lowest unique bidder!
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="border-t border-border/60 bg-white/80 backdrop-blur-md p-4 pb-8"
      >
        <div className="flex flex-col gap-2">
            <button onClick={() => goBack()} className="btn-primary animate-shine">
            <Home className="size-[18px]" /> Back to Auctions
          </button>
          {isAdmin && (
            <button onClick={() => go("monitor")} className="btn-navy">
              <Eye className="size-[18px]" /> Monitor Auction
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
