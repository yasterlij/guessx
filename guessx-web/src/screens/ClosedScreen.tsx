import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Gavel, Trophy, Shield, Loader2, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { ConfettiOverlay } from "../components/AuctionUI"
import { api } from "../api"
import { formatCurrency, formatETB } from "../mockDataV0"
import { isStaffRole } from "@guessx/api"

export function ClosedScreen() {
  const { go, goBack, selectedId, user, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const isAdmin = isStaffRole(user?.role)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + 4
      })
    }, 90)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => { setDone(true); setShowConfetti(true) }, 500)
      return () => clearTimeout(t)
    }
  }, [progress])

  useEffect(() => {
    if (showConfetti) {
      const t = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(t)
    }
  }, [showConfetti])

  const handleReveal = async () => {
    setRevealing(true)
    try {
      await api.closeAuction(selectedId!)
      go("winner")
    } catch {
      go("winner")
    } finally {
      setRevealing(false)
    }
  }

  if (!auction) return null

  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.06 } },
      }}
      className="flex flex-1 flex-col items-center justify-center gap-8 pb-16"
    >
      {/* ── Back ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
        className="flex w-full items-center"
      >
        <button onClick={goBack} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue shadow-sm transition-all hover:bg-white">
          <ArrowLeft className="size-5" />
        </button>
      </motion.div>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
        className="relative flex flex-col items-center text-center max-w-md"
      >
        {showConfetti && <ConfettiOverlay show={true} />}

        <motion.div
          animate={done ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`relative flex size-28 items-center justify-center rounded-full shadow-lg transition-all duration-700 ${
            done ? "bg-gradient-to-br from-primary to-awash-gold-light shadow-gold-glow-lg animate-breathe" : "bg-awash-blue shadow-blue-glow"
          }`}
        >
          {done ? <Trophy className="size-14 text-primary-foreground" /> : <Gavel className="size-14 text-primary" />}
        </motion.div>
        {done && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="absolute right-0 top-0 flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
          >
            <CheckCircle2 className="size-5" />
          </motion.span>
        )}

        <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">
          {done ? "Auction Closed!" : "Closing Auction..."}
        </h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-awash-blue/10 backdrop-blur-sm px-4 py-2 border border-awash-blue/20"
        >
          <Gavel className="size-4 text-awash-blue" />
          <span className="text-sm font-bold text-awash-blue">{auction.name}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 w-full max-w-sm"
        >
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-sm px-5 py-2 text-sm font-bold text-primary border border-primary/20">
                <Sparkles className="size-4" /> Result Ready
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Bid Amount</p>
                  <p className="font-display text-xl font-extrabold text-primary">{formatCurrency(auction.bidFee)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Savings</p>
                  <p className="font-display text-xl font-extrabold text-emerald-600">{savings}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Bidders</p>
                  <p className="font-display text-xl font-extrabold text-awash-blue">{auction.totalBids || auction.bidders}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full h-2.5 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-awash-gold-light transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold tabular-nums text-neutral-400">Analyzing bids... {progress}%</p>
              <div className="flex items-center gap-2 rounded-xl bg-awash-gold-bg backdrop-blur-sm border border-primary/20 p-3">
                <Loader2 className="size-4 animate-spin text-primary" />
                <p className="text-xs font-medium text-primary">Finding the lowest unique bid...</p>
              </div>
            </div>
          )}
        </motion.div>

        {done && !isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200 p-3 max-w-sm"
          >
            <Shield className="mt-0.5 size-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">Results are being reviewed by the admin. You will be notified once the winner is declared.</p>
          </motion.div>
        )}

        {done && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex items-center gap-2 rounded-full bg-awash-blue/10 backdrop-blur-sm px-4 py-2 border border-awash-blue/20"
          >
            <Shield className="size-4 text-awash-blue" />
            <p className="text-sm font-semibold text-awash-blue">Close to draw and reveal the winner</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 w-full max-w-sm"
        >
          {isAdmin ? (
            <button disabled={!done || revealing} onClick={handleReveal}
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold tracking-wide transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
                done ? "btn-primary" : "bg-neutral-100 text-neutral-400"
              }`}>
              {revealing ? <><Loader2 className="size-4 animate-spin" /> Closing & Drawing...</> : done ? <><Trophy className="size-4" /> Reveal Winner</> : "Determining..."}
            </button>
          ) : (
            <button onClick={() => goBack()}
              className="btn-outline">
              <ArrowLeft className="size-4" /> Back to Home
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
