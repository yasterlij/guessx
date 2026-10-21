import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X, Check, ArrowLeft, ExternalLink, ShieldCheck, Loader2, Lock, BadgeCheck, Sparkles, ChevronRight } from "lucide-react"
import { useApp } from "../AppContext"
import { toast } from "../store/toast.store"
import { api, openSikinaPopup, closeSikinaPopup, isSikinaPopupOpen } from "../api"
import { formatCurrency, formatETB } from "../mockDataV0"
import { GuessXMark } from "../components/AuctionUI"

const POLL_INTERVAL = 2500
const TIMEOUT_MS = 120_000

const waitSteps = [
  "Select your payment method in the SikinaPay window",
  "Enter your details and confirm the payment",
  "Return here — we'll detect it automatically",
]

const stateVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
}

function PopupTargetIcon() {
  return (
    <div className="relative mb-6 flex size-28 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" style={{ animationDuration: "2.2s" }} />
      <span className="absolute inset-2 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "2.2s", animationDelay: "0.4s" }} />
      <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-awash-blue to-awash-blue-dark shadow-xl shadow-awash-blue/30 ring-1 ring-primary/40">
        <ShieldCheck className="size-11 text-primary" />
      </div>
    </div>
  )
}

export function SikinaPayCheckoutScreen() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, setSikinaProxyUrl, paymentContext, setFeePaid, userBid, pendingBidAmount, user } = useApp()
  const [status, setStatus] = useState<"waiting" | "paid" | "failed">("waiting")
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [popupClosed, setPopupClosed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (watchRef.current) clearInterval(watchRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const closeAndClear = useCallback(() => {
    clearAll()
    closeSikinaPopup()
  }, [clearAll])

  useEffect(() => {
    if (user?.role === "admin" && paymentContext === "bid-fee") {
      toast("Administrators are not allowed to participate in bidding.", "error")
      closeAndClear()
      go("product")
    }
  }, [user?.role, paymentContext, closeAndClear, go])

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = paymentContext === "bid-fee"
        ? await api.getBidFeePaymentStatus(selectedId!)
        : await api.getPaymentLinkStatus(selectedId!)
      if (res.status === "SUCCESSFUL") {
        closeAndClear()
        setStatus("paid")
        return true
      }
      if (["FAILED", "CANCELLED", "EXPIRED"].includes(res.status)) {
        closeAndClear()
        setStatus("failed")
        return true
      }
    } catch {
      // retry on next tick
    }
    return false
  }, [selectedId, paymentContext, closeAndClear])

  const openPaymentPopup = useCallback(() => {
    if (!sikinaPayUrl) return
    const popup = openSikinaPopup(sikinaPayUrl)
    if (!popup || popup.closed) {
      setPopupBlocked(true)
    } else {
      setPopupBlocked(false)
      setPopupClosed(false)
    }
  }, [sikinaPayUrl])

  const handleRelayResult = useCallback((result: string) => {
    localStorage.removeItem('sikina_payment_result')
    closeAndClear()
    if (result === 'success') setStatus('paid')
    else setStatus('failed')
  }, [closeAndClear])

  // Auto-open popup & start polling on mount
  useEffect(() => {
    if (!selectedId || !sikinaPayUrl) return

    // Clean up any stale localStorage result from a previous session
    localStorage.removeItem('sikina_payment_result')

    openPaymentPopup()

    // Instant detection via postMessage from the relay page
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'SIKINA_PAYMENT_RESULT') return
      handleRelayResult(e.data.result)
    }
    window.addEventListener('message', onMessage)

    // BroadcastChannel fallback (same-origin, different browsing context)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('sikina_payment')
      bc.onmessage = (e) => handleRelayResult(e.data?.result)
    } catch { /* not supported */ }

    // localStorage fallback (for browsers that block BroadcastChannel)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'sikina_payment_result' || !e.newValue) return
      try {
        const { result } = JSON.parse(e.newValue)
        handleRelayResult(result)
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)

    pollRef.current = setInterval(async () => {
      await checkStatus()
    }, POLL_INTERVAL)

    // Watch for the popup being closed by the user
    watchRef.current = setInterval(() => {
      if (!isSikinaPopupOpen()) setPopupClosed(true)
      else setPopupClosed(false)
    }, 800)

    timeoutRef.current = setTimeout(() => {
      closeAndClear()
      setStatus("failed")
    }, TIMEOUT_MS)

    return () => {
      clearAll()
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
      bc?.close()
    }
  }, [selectedId, sikinaPayUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }, [go, paymentContext, setSikinaPayUrl, setSikinaProxyUrl, closeAndClear])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleBack() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleBack])

  const handleContinuePaid = () => {
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    if (paymentContext === "bid-fee") {
      setFeePaid(true)
      go("place-bid")
    } else {
      go("delivery")
    }
  }

  const handleConfirmManually = async () => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    if (paymentContext === "bid-fee") {
      try {
        await api.confirmBidFeePayment(selectedId!)
        setFeePaid(true)
        go("place-bid")
      } catch {
        go("pay-fee")
      }
      return
    }
    try {
      await api.confirmPayment(selectedId!)
      go("delivery")
    } catch {
      go("pay-winning")
    }
  }

  const handleTryAgain = () => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }

  const contextLabel = paymentContext === "bid-fee" ? "Bid Service Fee" : "Winning Payment"

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md bg-dots"
      onClick={handleBack}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", damping: 24, stiffness: 300 }}
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl shadow-awash-blue/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold shimmer accent bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-awash-gold via-awash-gold-light to-awash-gold animate-shimmer-slide" />

        {/* Header */}
        <div className="relative flex items-center gap-3 bg-gradient-to-br from-awash-blue via-awash-blue to-awash-blue-dark px-4 py-3.5">
          <button
            onClick={handleBack}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex flex-1 items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-primary/40 overflow-hidden px-1">
              <GuessXMark size={20} />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-[15px] font-extrabold text-white">SikinaPay Checkout</h1>
                <BadgeCheck className="size-4 text-primary" />
              </div>
              <p className="text-[11px] font-medium text-white/70">{contextLabel}</p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="ml-auto flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          {/* ── Waiting state ── */}
          {status === "waiting" && (
            <motion.div
              key="waiting"
              variants={stateVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative flex flex-col items-center px-6 py-8 text-center"
            >
              <div className="pointer-events-none absolute -top-10 right-0 size-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-8 size-40 rounded-full bg-awash-blue/10 blur-3xl" />

              <PopupTargetIcon />

              {popupBlocked ? (
                <motion.div
                  key="blocked"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center"
                >
                  <h2 className="font-display text-lg font-extrabold text-awash-blue">Open Payment Page</h2>
                  <p className="mt-2 max-w-xs text-sm text-neutral-400">
                    Your browser blocked the payment popup. Click below to open it manually.
                  </p>
                  <button
                    onClick={openPaymentPopup}
                    className="btn-primary mt-6 animate-shine"
                  >
                    <ExternalLink className="size-4" />
                    Open SikinaPay Checkout
                    <ChevronRight className="size-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex w-full flex-col items-center"
                >
                  <h2 className="font-display text-lg font-extrabold text-awash-blue">
                    {popupClosed ? "Payment window closed" : "Complete payment in the opened window"}
                  </h2>
                  <p className="mt-2 max-w-xs text-sm text-neutral-400">
                    {popupClosed
                      ? "Did you complete the payment? You can reopen the window or confirm below."
                      : "A secure SikinaPay window has opened. Complete your payment there and we'll confirm it automatically."}
                  </p>

                  {!popupClosed && (
                    <ol className="stagger-enter mt-6 w-full space-y-3 text-left">
                      {waitSteps.map((step, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                              i === 0
                                ? "bg-gradient-to-br from-awash-gold to-awash-gold-light text-awash-blue shadow-md shadow-primary/30"
                                : "bg-awash-blue/10 text-awash-blue"
                            }`}
                          >
                            {i === 0 ? <span className="size-2 animate-pulse rounded-full bg-current" /> : i + 1}
                          </span>
                          <span className="text-sm text-neutral-500">{step}</span>
                      </li>
                    ))}
                    </ol>
                  )}

                  <button
                    onClick={openPaymentPopup}
                    className={`btn-primary mt-6 w-full ${popupClosed ? "animate-shine" : ""}`}
                  >
                    <ExternalLink className="size-4" />
                    {popupClosed ? "Reopen Payment Window" : "Reopen Window"}
                    <ChevronRight className="size-4" />
                  </button>
                </motion.div>
              )}

              {/* Footer polling indicator */}
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-neutral-400">
                <Loader2 className="size-3.5 animate-spin" />
                Waiting for payment confirmation…
              </div>

              <div className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-100">
                <Lock className="size-3" />
                Secured by SikinaPay · 256-bit encrypted
              </div>

              {/* Manual confirm for edge cases */}
              <button
                onClick={handleConfirmManually}
                className="mt-4 text-xs font-medium text-neutral-400 underline-offset-2 transition-colors hover:text-awash-blue hover:underline"
              >
                I've paid but not seeing confirmation
              </button>
            </motion.div>
          )}

          {/* ── Paid state ── */}
          {status === "paid" && (
            <motion.div
              key="paid"
              variants={stateVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative flex flex-col items-center overflow-hidden px-6 py-10 text-center"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-50/80 to-white" />
              <div className="pointer-events-none absolute -top-10 left-1/2 size-44 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />

              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti absolute top-2 size-2 rounded-sm"
                  style={{
                    left: `${(i * 7.2 + 4) % 100}%`,
                    backgroundColor: i % 3 === 0 ? "#0071e3" : i % 3 === 1 ? "#1d1d1f" : "#10B981",
                    animationDelay: `${(i % 5) * 0.08}s`,
                  }}
                />
              ))}

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="relative mt-2"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                <span className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-100">
                  <Check className="size-10" strokeWidth={3.5} />
                </span>
              </motion.div>

              <h1 className="mt-6 font-display text-2xl font-extrabold text-awash-blue">Payment Successful!</h1>

              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-[11px] font-bold text-primary ring-1 ring-primary/20">
                <Sparkles className="size-3.5" />
                Payment verified
              </div>

              <p className="mt-4 max-w-xs text-sm font-medium text-neutral-400">
                {paymentContext === "winning" && userBid != null ? (
                  <>Your payment of <span className="font-bold text-awash-blue">{formatCurrency(userBid)}</span> was received.</>
                ) : paymentContext === "bid-fee" && selectedId ? (
                  <>Your service fee was received. {pendingBidAmount != null ? <span className="font-bold text-awash-blue">Saved bid {formatCurrency(pendingBidAmount)}</span> : 'Your saved bid'} will be submitted next.</>
                ) : (
                  "Your payment was received successfully."
                )}
              </p>

              <button
                onClick={handleContinuePaid}
                className="btn-primary mt-8 animate-shine"
              >
                {paymentContext === "bid-fee" ? "Submit Saved Bid" : "Track Delivery"}
                <ChevronRight className="size-4" />
              </button>
            </motion.div>
          )}

          {/* ── Failed state ── */}
          {status === "failed" && (
            <motion.div
              key="failed"
              variants={stateVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative flex flex-col items-center overflow-hidden px-6 py-10 text-center"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-50/60 to-white" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 220 }}
                className="relative mt-2"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-red-300/30" />
                <span className="relative flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500 ring-4 ring-red-50">
                  <X className="size-10" strokeWidth={3} />
                </span>
              </motion.div>
              <h1 className="mt-6 font-display text-2xl font-extrabold text-awash-blue">Payment Not Confirmed</h1>
              <p className="mt-2 max-w-xs text-sm font-medium text-neutral-400">
                We couldn't automatically confirm your payment. If you've already paid, tap confirm below.
              </p>
              <button
                onClick={handleConfirmManually}
                className="btn-primary mt-8 w-full animate-shine"
              >
                I've Already Paid
              </button>
              <button
                onClick={handleTryAgain}
                className="btn-outline mt-3 w-full"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer brand strip */}
        <div className="flex items-center justify-center gap-1.5 border-t border-border/60 bg-white/70 px-4 py-2.5 backdrop-blur-sm">
          <ShieldCheck className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-neutral-400">
            Powered by <span className="font-bold text-awash-blue">SikinaPay</span> · GuessX
          </span>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
