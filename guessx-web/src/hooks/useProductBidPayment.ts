import { useCallback, useEffect, useState } from "react"
import { api } from "../api"
import { formatCurrency } from "../mockDataV0"

type PaymentMethod = "AWASH"

export function useProductBidPayment({
  bidFee,
  pendingBidAmount,
  payFee,
  setPaymentMethod,
  setPendingBidAmount,
  walletBalance,
  isAdmin,
}: {
  bidFee: number
  pendingBidAmount: number | null
  payFee: (fee: number, paymentMethod?: PaymentMethod) => Promise<void>
  setPaymentMethod: (method: PaymentMethod | "WALLET") => void
  setPendingBidAmount: (amount: number | null) => void
  walletBalance: number
  isAdmin?: boolean
}) {
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null)
  const [checkingPin, setCheckingPin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("AWASH")
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
  const [bidStr, setBidStr] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  )
  const [bidError, setBidError] = useState<string | null>(null)
  const [bidFlash, setBidFlash] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  const bidAmount = bidStr ? Number(bidStr) : 0
  const hasValidBid = bidAmount >= 1 && /^\d+(\.\d{1,2})?$/.test(bidStr)

  useEffect(() => {
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : ""
    setBidStr((current) => (current === nextBid ? current : nextBid))
  }, [pendingBidAmount])

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
      setLockCountdown(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}s`,
      )
    }

    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [pinLocked, pinLockedUntil])

  useEffect(() => {
    if (!bidFlash) return
    const id = window.setTimeout(() => setBidFlash(false), 240)
    return () => window.clearTimeout(id)
  }, [bidFlash])

  const updateBid = useCallback((next: number) => {
    const safe = Math.max(1, Number(next.toFixed(2)))
    setBidStr(safe.toFixed(2))
    setBidError(null)
    setPendingBidAmount(safe)
    setBidFlash(true)
  }, [setPendingBidAmount])

  const adjustBid = useCallback((delta: number) => {
    updateBid((bidStr ? Number(bidStr) : 1) + delta)
  }, [bidStr, updateBid])

  const handlePayment = useCallback(async (method: PaymentMethod, isDuplicate: boolean) => {
    if (isAdmin) {
      setBidError("Administrators are not allowed to participate in bidding.")
      return
    }

    if (!hasValidBid) {
      setBidError("Enter a valid bid amount to continue")
      return
    }

    if (isDuplicate) {
      setShowDuplicateModal(true)
      return
    }

    setPendingBidAmount(bidAmount)
    setPaymentMethod(method)

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
  }, [bidAmount, bidFee, hasValidBid, isAdmin, payFee, setPaymentMethod, setPendingBidAmount])

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
        setLoadingMethod("AWASH")
        try {
          await payFee(bidFee, "AWASH")
        } finally {
          setLoadingMethod(null)
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
        setPinError(
          res.attemptsRemaining <= 2
            ? `Invalid PIN - ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`
            : "Invalid wallet PIN",
        )
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Unable to verify PIN. Please try again.")
    } finally {
      setPinLoading(false)
    }
  }, [bidFee, payFee, pinInput, pinLocked])

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
      setLoadingMethod("AWASH")
      try {
        await payFee(bidFee, "AWASH")
      } finally {
        setLoadingMethod(null)
      }
    } catch {
      setSetupError("Failed to set wallet PIN. Please try again.")
    } finally {
      setSetupLoading(false)
    }
  }, [bidFee, payFee, setupConfirm, setupPin])

  return {
    loadingMethod,
    checkingPin,
    showPinModal,
    setShowPinModal,
    showPaymentMethods,
    setShowPaymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    pinLoading,
    attemptsRemaining,
    pinLocked,
    pinLockedUntil,
    lockCountdown,
    needsPinSetup,
    setupPin,
    setSetupPin,
    setupConfirm,
    setSetupConfirm,
    setupError,
    setSetupError,
    setupLoading,
    bidStr,
    setBidStr,
    bidError,
    setBidError,
    bidFlash,
    showDuplicateModal,
    setShowDuplicateModal,
    bidAmount,
    hasValidBid,
    updateBid,
    adjustBid,
    handlePayment,
    handleVerifyPin,
    handleSetupPin,
  }
}
