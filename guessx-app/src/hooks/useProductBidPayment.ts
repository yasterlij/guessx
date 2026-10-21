import { useCallback, useEffect, useState } from "react"
import { Alert } from "react-native"
import { api } from "../api"
import { formatCurrency } from "../mockDataV0"

type PaymentMethod = "AWASH"

export function useProductBidPayment({
  bidFee,
  pendingBidAmount,
  payFee,
  setPaymentMethod,
  setPendingBidAmount,
  isAdmin,
}: {
  bidFee: number
  pendingBidAmount: number | null
  payFee: (fee: number, paymentMethod?: PaymentMethod) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setPendingBidAmount: (amount: number | null) => void
  isAdmin?: boolean
}) {
  const [loadingMethod, setLoadingMethod] = useState<PaymentMethod | null>(null)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("AWASH")
  const [checkingPin, setCheckingPin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [pinLocked, setPinLocked] = useState(false)
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null)
  const [lockCountdown, setLockCountdown] = useState("")
  const [pinLoading, setPinLoading] = useState(false)
  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [setupPin, setSetupPin] = useState("")
  const [setupConfirm, setSetupConfirm] = useState("")
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [bidAmount, setBidAmount] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  )
  const [bidError, setBidError] = useState<string | null>(null)
  const [bidFlash, setBidFlash] = useState(false)

  const numericBid = bidAmount ? Number(bidAmount) : 0
  const hasValidBid = numericBid >= 1 && /^\d+(\.\d{1,2})?$/.test(bidAmount)

  useEffect(() => {
    if (showPinModal) {
      setPinInput("")
      setPinError(null)
    }
  }, [showPinModal])

  useEffect(() => {
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : ""
    setBidAmount((current) => (current === nextBid ? current : nextBid))
  }, [pendingBidAmount])

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
        setLockCountdown(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`)
      } else {
        setLockCountdown(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`)
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [pinLocked, pinLockedUntil])

  useEffect(() => {
    if (!bidFlash) return
    const id = setTimeout(() => setBidFlash(false), 240)
    return () => clearTimeout(id)
  }, [bidFlash])

  const updateBid = useCallback((next: number) => {
    const safe = Math.max(1, Number(next.toFixed(2)))
    setBidAmount(safe.toFixed(2))
    setBidError(null)
    setPendingBidAmount(safe)
    setBidFlash(true)
  }, [setPendingBidAmount])

  const adjustBid = useCallback((delta: number) => {
    updateBid((bidAmount ? Number(bidAmount) : 1) + delta)
  }, [bidAmount, updateBid])

  const handlePayment = useCallback(async (method: PaymentMethod, isDuplicate: boolean) => {
    if (isAdmin) {
      Alert.alert(
        "Bidding Restricted",
        "Administrators are not allowed to participate in bidding.",
      )
      return
    }

    if (!hasValidBid) {
      setBidError("Enter a valid bid amount to continue")
      return
    }

    if (isDuplicate) {
      Alert.alert(
        "Duplicate Bid",
        `You've already placed a bid of ${formatCurrency(numericBid)} on this auction. Please enter a different bid amount.`,
        [{ text: "Change Bid Amount" }],
      )
      return
    }

    setPendingBidAmount(numericBid)
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
  }, [bidFee, hasValidBid, isAdmin, numericBid, payFee, setPaymentMethod, setPendingBidAmount])

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
          await Promise.resolve(payFee(bidFee, "AWASH"))
        } finally {
          setLoadingMethod(null)
        }
      } else if (res.locked) {
        setPinLocked(true)
        setPinLockedUntil(res.lockedUntil)
        setAttemptsRemaining(0)
        setPinError("Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.")
      } else {
        setAttemptsRemaining(res.attemptsRemaining)
        if (res.attemptsRemaining <= 2) {
          setPinError(`Invalid PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`)
        } else {
          setPinError("Invalid wallet PIN")
        }
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Unable to verify PIN. Please try again.")
    } finally {
      setPinLoading(false)
    }
  }, [bidFee, payFee, pinInput, pinLocked])

  const handleSetupPin = useCallback(async () => {
    if (!setupPin || setupPin.length < 4 || setupPin.length > 6 || !/^\d+$/.test(setupPin)) {
      setSetupError("PIN must be 4–6 digits")
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
        await Promise.resolve(payFee(bidFee, "AWASH"))
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
    showPaymentMethods,
    setShowPaymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    checkingPin,
    showPinModal,
    setShowPinModal,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    attemptsRemaining,
    pinLocked,
    pinLockedUntil,
    lockCountdown,
    pinLoading,
    needsPinSetup,
    setupPin,
    setSetupPin,
    setupConfirm,
    setSetupConfirm,
    setupError,
    setSetupError,
    setupLoading,
    bidAmount,
    setBidAmount,
    bidError,
    setBidError,
    bidFlash,
    numericBid,
    hasValidBid,
    updateBid,
    adjustBid,
    handlePayment,
    handleVerifyPin,
    handleSetupPin,
  }
}
