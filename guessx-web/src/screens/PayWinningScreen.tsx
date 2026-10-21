import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ShieldCheck, Info, Loader2, Wallet, Building2, ChevronDown, ChevronUp, ArrowLeft, AlertTriangle, X, Lock, Trophy } from "lucide-react"
import { useApp } from "../AppContext"
import { formatCurrency } from "../mockDataV0"
import { api } from "../api"

const paymentMethods = [
  {
    id: "AWASH" as const,
    label: "Awash Wallet",
    desc: "Pay from your Awash Wallet after PIN confirmation",
    icon: Building2,
    gradient: "from-awash-blue/10 to-awash-blue/5 border-awash-blue/20",
    iconBg: "bg-awash-blue/10 text-awash-blue",
  },
]

export function PayWinningScreen() {
  const { go, goBack, selectedId, userBid, payWinning, getAuction, authError, setPaymentMethod, walletBalance, refreshWallet } = useApp()
  const auction = getAuction(selectedId)
  const [loading, setLoading] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [selected, setSelected] = useState<'AWASH'>('AWASH')
  const [checkingPin, setCheckingPin] = useState(false)

  useEffect(() => {
    refreshWallet()
  }, [refreshWallet])

  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [pinLocked, setPinLocked] = useState(false)
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null)
  const [lockCountdown, setLockCountdown] = useState("")

  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [setupPin, setSetupPin] = useState("")
  const [setupConfirm, setSetupConfirm] = useState("")
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  useEffect(() => {
    if (!showPinModal) return
    setPinInput("")
    setPinError(null)
  }, [showPinModal])

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown("")
      return
    }

    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now()
      if (ms <= 0) {
        setLockCountdown("")
        setPinLocked(false)
        setPinLockedUntil(null)
        setAttemptsRemaining(5)
        return
      }

      const totalSec = Math.ceil(ms / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60

      if (h > 0) {
        setLockCountdown(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`)
      } else {
        setLockCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}s`)
      }
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [pinLocked, pinLockedUntil])

  if (!auction) return null

  const amount = auction.winning_bid_amount ?? userBid ?? 0
  const deadline = (auction as any).payment_deadline ? new Date((auction as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : 30 * 24
  const deadlineMins = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000)) : 30 * 24 * 60
  const deadlineDays = Math.floor(deadlineHrs / 24)
  const isSecondWinnerAssigned = Boolean(auction.second_winner_assigned || (auction as any).second_winner_assigned)
  const isPaymentExpired = (deadline !== null && deadlineHrs <= 0) || auction.payment_status === "PAYMENT_DEFAULTED" || (auction as any).payment_status === "PAYMENT_DEFAULTED" || (auction as any).status === "PAYMENT_DEFAULTED"
  const urgent = deadlineHrs < 24 && !isPaymentExpired

  const deadlineMessage = deadlineHrs <= 0
    ? "Payment deadline has expired."
    : deadlineDays >= 30
      ? `Complete payment within ${Math.floor(deadlineDays / 30)} month${Math.floor(deadlineDays / 30) > 1 ? "s" : ""} (${deadlineDays} days) to claim your prize.`
      : deadlineDays >= 1
        ? `Complete payment within ${deadlineDays} days ${deadlineHrs % 24}h to claim your prize.`
        : `Complete payment within ${deadlineHrs}h ${deadlineMins % 60}m to claim your prize.`
  const hasSufficientBalance = walletBalance >= amount
  const SelectedIcon = paymentMethods.find((m) => m.id === selected)?.icon || ShieldCheck

  const handlePayClick = useCallback(async () => {
    setPaymentMethod("AWASH")
    setCheckingPin(true)
    try {
      const status = await api.wallet.pinStatus()
      setPinLocked(status.locked)
      setPinLockedUntil(status.lockedUntil)
      setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining)
      setNeedsPinSetup(!status.hasPin)
      setShowPinModal(true)
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Failed to check wallet PIN status")
      setNeedsPinSetup(false)
      setPinLocked(false)
      setShowPinModal(true)
    } finally {
      setCheckingPin(false)
    }
  }, [setPaymentMethod])

  const handleVerifyPin = useCallback(async () => {
    if (!pinInput) {
      setPinError("Please enter your wallet PIN")
      return
    }
    if (pinLocked) return

    setPinLoading(true)
    setPinError(null)
    try {
      const res = await api.wallet.verifyPin(pinInput)
      if (res.valid) {
        setShowPinModal(false)
        setLoading(true)
        try {
          await payWinning(amount, "AWASH")
        } finally {
          setLoading(false)
        }
        return
      }

      if (res.locked) {
        setPinLocked(true)
        setPinLockedUntil(res.lockedUntil)
        setAttemptsRemaining(0)
        setPinError("Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.")
      } else {
        setAttemptsRemaining(res.attemptsRemaining)
        if (res.attemptsRemaining <= 2) {
          setPinError(`Invalid PIN - ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`)
        } else {
          setPinError("Invalid wallet PIN")
        }
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Unable to verify PIN. Please try again.")
    } finally {
      setPinLoading(false)
    }
  }, [amount, payWinning, pinInput, pinLocked])

  const handleSetupPin = useCallback(async () => {
    if (!setupPin || setupPin.length < 4 || setupPin.length > 6 || !/^\d+$/.test(setupPin)) {
      setSetupError("PIN must be 4-6 digits")
      return
    }
    if (setupPin !== setupConfirm) {
      setSetupError("PINs do not match")
      return
    }

    setSetupLoading(true)
    setSetupError(null)
    try {
      await api.wallet.setPin(setupPin)
      setShowPinModal(false)
      setNeedsPinSetup(false)
      setLoading(true)
      try {
        await payWinning(amount, "AWASH")
      } finally {
        setLoading(false)
      }
    } catch {
      setSetupError("Failed to set wallet PIN. Please try again.")
    } finally {
      setSetupLoading(false)
    }
  }, [amount, payWinning, setupConfirm, setupPin])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("winner")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Pay Winning Amount</h1>
          <p className="text-sm font-medium text-neutral-500">Claim your prize by completing payment</p>
        </div>
      </div>

      {/* ── Second Winner Reassignment Banner ── */}
      {isSecondWinnerAssigned && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left shadow-sm"
        >
          <div className="flex items-center gap-2 text-primary font-extrabold text-sm">
            <Trophy className="size-4" />
            <span>Second Winner Assigned</span>
          </div>
          <p className="mt-1 text-xs font-medium text-foreground leading-relaxed">
            You have been awarded this auction because the original winner did not complete payment within the specified timeframe.
          </p>
        </motion.div>
      )}

      {/* ── Urgency or Expired Banner ── */}
      {isPaymentExpired ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-center"
        >
          <p className="text-sm font-bold text-destructive">
            This auction is no longer eligible for payment. The payment deadline has expired.
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-xl p-3 ${urgent ? "bg-red-50 border border-red-200" : "bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 border border-primary/20"
            }`}
        >
          <Clock className={`size-[18px] flex-shrink-0 ${urgent ? "text-red-500 animate-pulse" : "text-primary"}`} />
          <p className={`text-xs font-semibold ${urgent ? "text-red-700" : "text-foreground/80"}`}>
            {deadlineMessage}
          </p>
        </motion.div>
      )}

      {/* ── Winning Amount ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 text-center shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="size-4 text-awash-gold" />
          <span className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">Winning Bid</span>
        </div>
        <p className="mt-1 font-display text-4xl font-extrabold text-gradient-gold tabular-nums">{formatCurrency(amount)}</p>
        <span className="mt-2 inline-block text-xs font-medium text-neutral-500">for {auction.name}</span>
      </motion.div>

      {/* ── Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 shadow-sm"
      >
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">Winning amount</span>
          <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-neutral-500">Delivery</span>
          <span className="font-semibold text-emerald-600">Free ✓</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border/60 pt-3">
          <span className="text-sm font-bold text-foreground">Total</span>
          <span className="font-display text-sm font-extrabold text-gradient-gold">{formatCurrency(amount)}</span>
        </div>
      </motion.div>

      {/* ── Payment Method Selector ── */}
      <div>
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 text-left transition-all hover:bg-white hover:shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SelectedIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {paymentMethods.find((m) => m.id === selected)?.label}
              </p>
              <p className="text-xs text-neutral-500">Change payment method</p>
            </div>
          </div>
          {showMethods ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
        </button>

        <AnimatePresence>
          {showMethods && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-2">
                {paymentMethods.map((method) => {
                  const isActive = selected === method.id
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => { setSelected(method.id); setShowMethods(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 ${isActive
                        ? "bg-primary/10 ring-1 ring-primary shadow-sm"
                        : "hover:bg-neutral-50"
                        }`}
                    >
                      <span className={`flex size-10 items-center justify-center rounded-xl ${isActive ? method.iconBg : "bg-neutral-100 text-neutral-500"}`}>
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{method.label}</p>
                        <p className="text-xs text-neutral-500">{method.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Awash Wallet Balance ── */}
      {selected === "AWASH" && (
        <div className="rounded-2xl border border-awash-blue/20 bg-awash-blue/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-awash-blue">GuessX Wallet Balance</p>
              <p className="text-xs font-medium text-neutral-500">{formatCurrency(walletBalance)}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-awash-blue border border-awash-blue/20">
              <Lock className="size-3" /> PIN required
            </span>
          </div>
        </div>
      )}


      <div className="flex items-start gap-2.5 rounded-2xl bg-awash-blue/5 backdrop-blur-sm border border-awash-blue/10 p-3.5">
        <Info className="mt-0.5 size-4 flex-shrink-0 text-awash-blue/60" />
        <p className="text-xs font-medium leading-relaxed text-foreground/70">
          Complete payment before the deadline to claim your prize. A payment receipt will be issued instantly.
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
        <ShieldCheck className="size-4 text-emerald-600" />
        Secured by {paymentMethods.find((m) => m.id === selected)?.label}
      </div>

      {authError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">{authError}</p>
        </div>
      )}

      {/* ── CTA ── */}
      {selected === "AWASH" && !hasSufficientBalance && !isPaymentExpired && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">
            Insufficient wallet balance. Top up your wallet before paying with GuessX Mobile Wallet.
          </p>
        </div>
      )}

      {isPaymentExpired ? (
        <div className="space-y-2">
          <button disabled className="btn-primary opacity-50 cursor-not-allowed">
            Payment Expired
          </button>
          <button onClick={() => goBack()} className="btn-outline">
            Back to Dashboard
          </button>
        </div>
      ) : (
        <button
          onClick={handlePayClick}
          disabled={loading || checkingPin || (selected === "AWASH" && !hasSufficientBalance)}
          className="btn-primary animate-shine group"
        >
          {loading || checkingPin ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <Wallet className="size-[18px] group-hover:scale-110 transition-transform" />
          )}
          {loading
            ? "Processing..."
            : checkingPin
              ? "Checking wallet PIN status..."
              : `Proceed to Payment · ${formatCurrency(amount)}`}
        </button>
      )}

      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-awash-blue">
                  {needsPinSetup ? "Set Wallet PIN" : "Enter Wallet PIN"}
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {needsPinSetup ? (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">Create a 4-6 digit PIN to secure your GuessX wallet payments.</p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupPin}
                    onChange={(e) => setSetupPin(e.target.value)}
                    placeholder="New PIN"
                    className="input-full text-center tracking-[0.35em]"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    placeholder="Confirm PIN"
                    className="input-full text-center tracking-[0.35em]"
                  />
                  {setupError && <p className="text-center text-xs font-semibold text-destructive">{setupError}</p>}
                  <button onClick={handleSetupPin} disabled={setupLoading} className="btn-primary w-full">
                    {setupLoading ? <Loader2 className="size-4 animate-spin" /> : "Set PIN & Pay"}
                  </button>
                </div>
              ) : pinLocked ? (
                <div className="space-y-3 text-center">
                  <AlertTriangle className="mx-auto size-9 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">PIN Locked</p>
                  <p className="text-xs text-neutral-600">
                    Too many incorrect attempts. Try again in {lockCountdown || "05:00s"}.
                  </p>
                  <button onClick={() => setShowPinModal(false)} className="w-full rounded-xl border border-border bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-neutral-200">
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    Enter your wallet PIN to confirm payment of {formatCurrency(amount)}.
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter PIN"
                    autoFocus
                    className="input-full text-center tracking-[0.35em]"
                  />
                  {pinError && <p className="text-center text-xs font-semibold text-destructive">{pinError}</p>}
                  {attemptsRemaining != null && attemptsRemaining <= 3 && (
                    <p className="text-center text-xs font-medium text-amber-600">
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                  <button onClick={handleVerifyPin} disabled={pinLoading || !pinInput.trim()} className="btn-primary w-full">
                    {pinLoading ? <Loader2 className="size-4 animate-spin" /> : "Confirm Payment"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
