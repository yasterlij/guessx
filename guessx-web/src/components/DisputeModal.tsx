import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldQuestion, X, Loader2, Send } from "lucide-react"
import { api } from "../api"
import { toast } from "../store/toast.store"

export interface DisputeModalProps {
  isOpen: boolean
  auctionId: string
  auctionName: string
  onClose: () => void
  onSuccess?: () => void
}

export function DisputeModal({
  isOpen,
  auctionId,
  auctionName,
  onClose,
  onSuccess,
}: DisputeModalProps) {
  const [disputeType, setDisputeType] = useState("WINNER_DISPUTE")
  const [disputeDesc, setDisputeDesc] = useState("")
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disputeDesc.trim() || !auctionId) return
    setDisputeSubmitting(true)
    try {
      await api.createDispute({
        auction_id: auctionId,
        type: disputeType,
        description: disputeDesc.trim(),
      })
      toast("Your claim has been submitted to the governance audit team.", "success")
      setDisputeDesc("")
      onClose()
      onSuccess?.()
    } catch (err: unknown) {
      toast((err instanceof Error ? err.message : String(err)) || "Failed to submit inquiry", "error")
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldQuestion className="size-5 text-primary" />
              <h3 className="font-display text-base font-bold">Submit Auction Inquiry</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-neutral-400 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="mt-2 text-xs text-neutral-500">
            File an inquiry or transparency review for{" "}
            <strong className="text-foreground">{auctionName}</strong>. Our audit committee reviews all bid frequency logs.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground">Inquiry Type</label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none shadow-sm"
              >
                <option value="WINNER_DISPUTE">Winner Determination / Unique Bid Verification</option>
                <option value="BID_DISPUTE">Bid Registration or Nonce Dispute</option>
                <option value="PAYMENT_DISPUTE">Participation Fee / Payment Inquiry</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Explanation / Claim</label>
              <textarea
                required
                rows={4}
                value={disputeDesc}
                onChange={(e) => setDisputeDesc(e.target.value)}
                placeholder="Describe what you observed (e.g. Your bid amount, transaction details)..."
                className="mt-1.5 w-full rounded-xl border border-border/60 bg-white p-3 text-xs text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disputeSubmitting || !disputeDesc.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {disputeSubmitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                Submit Claim
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
