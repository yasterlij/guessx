import { motion } from "framer-motion"
import { Check, Download, Truck, Wallet, ShieldCheck, Building2, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Card } from "../components/AuctionUI"
import { formatCurrency, formatETB } from "../mockDataV0"

const METHOD_LABELS: Record<string, { label: string; icon: any }> = {
  WALLET: { label: "Wallet", icon: Wallet },
  AWASH: { label: "Awash Wallet", icon: Wallet },
}

export function PaymentConfirmedScreen() {
  const { go, goBack, selectedId, userBid, getAuction, lastPaymentMethod } = useApp()
  const methodInfo = METHOD_LABELS[lastPaymentMethod || ''] || { label: "Mobile Money", icon: ShieldCheck }
  const PayIcon = methodInfo.icon
  const auction = getAuction(selectedId)
  if (!auction) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-1 flex-col overflow-y-auto"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3 backdrop-blur-md"
      >
        <button onClick={goBack} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-awash-blue">Payment Confirmed</h1>
      </motion.div>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="flex flex-1 flex-col items-center px-6 pb-20 lg:pb-6 pt-10 text-center"
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
          Thank you. Your payment of{" "}
          <span className="font-bold text-awash-blue">
            {formatCurrency(userBid ?? 0)}
          </span>{" "}
          was successful.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 w-full max-w-xs"
        >
          <Card className="p-5 text-left">
            <div className="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
              <span className="font-display text-sm font-bold text-awash-blue">Digital Receipt</span>
              <span className="text-[11px] font-semibold text-emerald-600">PAID</span>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-neutral-400">Product</dt>
                <dd className="font-semibold text-awash-blue">{auction.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-400">Amount</dt>
                <dd className="font-semibold text-awash-blue">
                  {formatCurrency(userBid ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-400">Paid via</dt>
                <dd className="flex items-center gap-1 font-semibold text-awash-blue"><PayIcon className="size-3.5" /> {methodInfo.label}</dd>
              </div>
            </dl>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/60 py-2 text-xs font-bold text-awash-blue transition-all hover:bg-neutral-50 active:scale-95">
              <Download className="size-3.5" /> Download Receipt
            </button>
          </Card>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-white/90 p-4 backdrop-blur-xl lg:static"
      >
        <CTAButton onClick={() => go("delivery")}>
          <Truck className="size-[18px]" /> Track Delivery
        </CTAButton>
      </motion.div>
    </motion.div>
  )
}
