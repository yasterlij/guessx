import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { Check, X, ExternalLink, Loader2, ArrowRight, Gavel, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { toast } from "../store/toast.store"
import { api } from "../api"
import { CTAButton, Card } from "../components/AuctionUI"
import { formatCurrency, formatETB } from "../mockDataV0"

type ResultType = "success" | "failed" | "pending"

export function PaymentResultScreen() {
  const { go, goBack, selectedId, userBid, pendingBidAmount, getAuction, paymentContext, setFeePaid, user } = useApp()
  const auction = getAuction(selectedId)
  const [polling, setPolling] = useState(true)
  const [result, setResult] = useState<ResultType>("pending")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isBidFee = paymentContext === 'bid-fee'
  const amount = isBidFee ? (auction?.bidFee ?? 0) : (userBid ?? 0)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        if (selectedId) {
          const status = isBidFee
            ? await api.getBidFeePaymentStatus(selectedId)
            : await api.getPaymentLinkStatus(selectedId)
          if (!cancelled) {
            if (status.status === "SUCCESSFUL") {
              setResult("success")
              setPolling(false)
              return true
            } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(status.status)) {
              setResult("failed")
              setPolling(false)
              return true
            }
          }
        } else {
          if (!cancelled) {
            setResult("success")
            setPolling(false)
            return true
          }
        }
      } catch {
        if (!cancelled) {
          setResult("failed")
        }
      }
      return false
    }

    check().then((done) => {
      if (!done && !cancelled) {
        pollRef.current = setInterval(async () => {
          const finished = await check()
          if (finished && pollRef.current) {
            clearInterval(pollRef.current)
          }
        }, 3000)
        setTimeout(() => {
          if (pollRef.current) clearInterval(pollRef.current)
          if (!cancelled) setPolling(false)
        }, 60000)
      }
    })

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId, isBidFee])

  const handleSuccessAction = () => {
    if (isBidFee) {
      if (user?.role === "admin") {
        toast("Administrators are not allowed to participate in bidding.", "error")
        go("product")
        return
      }
      setFeePaid(true)
      go('place-bid')
    } else {
      go('delivery')
    }
  }

  if (polling && result === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="size-10 text-primary" />
          </motion.div>
          <p className="text-sm font-medium text-neutral-400">Verifying payment status...</p>
        </div>
      </motion.div>
    )
  }

  if (result === "success") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 flex-col overflow-y-auto"
      >
        <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="relative"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Check className="size-10" strokeWidth={3} />
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 font-display text-2xl font-extrabold text-awash-blue"
          >
            Payment Successful!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-2 max-w-xs text-sm font-medium text-neutral-400"
          >
            Your payment of <span className="font-bold text-awash-blue">{formatCurrency(amount)}</span> was received.
          </motion.p>
          {isBidFee && pendingBidAmount != null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 max-w-xs text-xs font-semibold text-emerald-700"
            >
              Saved bid {formatCurrency(pendingBidAmount)} will be submitted next.
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-6 w-full max-w-xs"
          >
            <Card className="p-5 text-left">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Product</dt>
                  <dd className="font-semibold text-awash-blue">{auction?.name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Amount</dt>
                  <dd className="font-semibold text-awash-blue">{formatCurrency(amount)}</dd>
                </div>
                {isBidFee && pendingBidAmount != null && (
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Saved bid</dt>
                    <dd className="font-semibold text-awash-blue">{formatCurrency(pendingBidAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-neutral-400">Status</dt>
                  <dd className="font-semibold text-emerald-600">Completed</dd>
                </div>
              </dl>
            </Card>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="border-t border-border/60 bg-white/90 p-4 backdrop-blur-xl"
        >
          <CTAButton onClick={handleSuccessAction}>
            {isBidFee ? <><Gavel className="size-[18px]" /> Submit Saved Bid</> : <><ArrowRight className="size-[18px]" /> Track Delivery</>}
          </CTAButton>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col overflow-y-auto"
    >
      <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3 backdrop-blur-md">
        <button onClick={goBack} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
        >
          <span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500">
            <X className="size-10" strokeWidth={3} />
          </span>
        </motion.div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-awash-blue">Payment Not Completed</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-neutral-400">
          The payment was not completed. You can try again or contact support.
        </p>
      </div>
      <div className="border-t border-border/60 bg-white/90 p-4 backdrop-blur-xl">
        <CTAButton
          onClick={() => {
            if (isBidFee && user?.role === "admin") {
              toast("Administrators are not allowed to participate in bidding.", "error")
              go("product")
              return
            }
            go(isBidFee ? "pay-fee" : "pay-winning")
          }}
        >
          <ExternalLink className="size-[18px]" /> Try Again
        </CTAButton>
      </div>
    </motion.div>
  )
}