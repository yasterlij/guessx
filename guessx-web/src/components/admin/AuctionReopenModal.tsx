import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  RotateCcw,
  X,
  AlertTriangle,
  Calendar,
  Gavel,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { useApp } from "../../AppContext"
import type { Auction } from "../../mockDataV0"

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AuctionReopenModal({
  auction,
  onClose,
  onSuccess,
}: {
  auction: Auction | null
  onClose: () => void
  onSuccess?: () => void
}) {
  const { reopenAuction } = useApp()
  const [reopenConfirming, setReopenConfirming] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [reopenForm, setReopenForm] = useState({
    startTime: toDatetimeLocal(new Date()),
    endTime: toDatetimeLocal(new Date(Date.now() + 7 * 86400000)),
    minBid: "",
    maxBid: "",
    bidFee: "10",
    name: "",
    category: "",
    marketPrice: "",
    description: "",
    imageUrl: "",
  })

  useEffect(() => {
    if (!auction) {
      setReopenConfirming(false)
      return
    }
    const defaultStart = toDatetimeLocal(new Date())
    const defaultEnd = toDatetimeLocal(new Date(Date.now() + 7 * 86400000))
    setReopenForm({
      startTime: defaultStart,
      endTime: defaultEnd,
      minBid: auction.minBid != null ? String(auction.minBid) : "",
      maxBid: auction.maxBid != null ? String(auction.maxBid) : "",
      bidFee: auction.bidFee != null ? String(auction.bidFee) : "10",
      name: auction.name || "",
      category: auction.category || "",
      marketPrice: auction.marketPrice != null ? String(auction.marketPrice) : "",
      description: auction.description || "",
      imageUrl: auction.images?.[0] || "",
    })
    setReopenConfirming(false)
  }, [auction])

  const handleReopenSubmit = async () => {
    if (!auction) return
    setReopening(true)
    try {
      await reopenAuction(auction.id, {
        start_time: new Date(reopenForm.startTime).toISOString(),
        end_time: new Date(reopenForm.endTime).toISOString(),
        min_bid: reopenForm.minBid ? Number(reopenForm.minBid) : undefined,
        max_bid: reopenForm.maxBid ? Number(reopenForm.maxBid) : undefined,
        bid_fee: reopenForm.bidFee ? Number(reopenForm.bidFee) : undefined,
        name: reopenForm.name || undefined,
        category: reopenForm.category || undefined,
        current_market_price: reopenForm.marketPrice ? Number(reopenForm.marketPrice) : undefined,
        description: reopenForm.description || undefined,
        image_urls: reopenForm.imageUrl ? [reopenForm.imageUrl] : undefined,
      })
      onClose()
      onSuccess?.()
    } catch {
    } finally {
      setReopening(false)
    }
  }

  return (
    <AnimatePresence>
      {auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                onClose()
                setReopenConfirming(false)
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700">
                <RotateCcw className="size-5.5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-awash-blue">Reopen / Relist Auction</h2>
                <p className="text-xs font-medium text-neutral-500">
                  Re-list "{auction.name}" with updated dates and bidding parameters
                </p>
              </div>
            </div>

            {!reopenConfirming ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 text-xs text-amber-900">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Lifecycle State Reset Notice</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                      Reopening will transition this auction back to <strong>ACTIVE</strong>. All previous bids and winner records will be permanently removed (bid fees are not refunded), and Redis bidding frequency tallies will be wiped for a clean start.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                    <Calendar className="size-3.5 text-primary" /> Schedule New Duration
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        New Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={reopenForm.startTime}
                        onChange={(e) => setReopenForm({ ...reopenForm, startTime: e.target.value })}
                        className="input-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                        New End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={reopenForm.endTime}
                        onChange={(e) => setReopenForm({ ...reopenForm, endTime: e.target.value })}
                        className="input-full bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                    <Gavel className="size-3.5 text-primary" /> Pricing & Bid Rules (Optional)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Market Price</label>
                      <input
                        value={reopenForm.marketPrice}
                        onChange={(e) => setReopenForm({ ...reopenForm, marketPrice: e.target.value.replace(/[^\d.]/g, "") })}
                        placeholder="e.g. 50000"
                        className="input-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Bid Fee (ETB)</label>
                      <input
                        value={reopenForm.bidFee}
                        onChange={(e) => setReopenForm({ ...reopenForm, bidFee: e.target.value.replace(/[^\d.]/g, "") })}
                        placeholder="e.g. 10"
                        className="input-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Min Bids (Reserve)</label>
                      <input
                        value={reopenForm.minBid}
                        onChange={(e) => setReopenForm({ ...reopenForm, minBid: e.target.value.replace(/[^\d]/g, "") })}
                        placeholder="None"
                        className="input-full bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">Max Bids (Cap)</label>
                      <input
                        value={reopenForm.maxBid}
                        onChange={(e) => setReopenForm({ ...reopenForm, maxBid: e.target.value.replace(/[^\d]/g, "") })}
                        placeholder="None"
                        className="input-full bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Product Title
                    </label>
                    <input
                      value={reopenForm.name}
                      onChange={(e) => setReopenForm({ ...reopenForm, name: e.target.value })}
                      className="input-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                      Description
                    </label>
                    <textarea
                      value={reopenForm.description}
                      onChange={(e) => setReopenForm({ ...reopenForm, description: e.target.value })}
                      rows={2}
                      className="input-full text-xs"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenConfirming(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-5 py-2.5 text-xs font-bold text-awash-blue shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                  >
                    Review & Reopen <Sparkles className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-awash-blue">Confirm Auction Reopening</h3>
                  <p className="mt-1 text-xs text-neutral-600 max-w-md mx-auto">
                    Are you sure you want to reopen <strong>"{auction.name}"</strong> until{" "}
                    <span className="font-bold text-awash-blue">
                      {new Date(reopenForm.endTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>?
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 border border-border/70 p-3 text-left text-xs space-y-1 text-neutral-600 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Start Time:</span>
                    <span className="font-semibold">{new Date(reopenForm.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">End Time:</span>
                    <span className="font-semibold">{new Date(reopenForm.endTime).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Bid Fee:</span>
                    <span className="font-semibold">{reopenForm.bidFee} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Target Tab:</span>
                    <span className="font-bold text-emerald-700">Active / Live</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setReopenConfirming(false)}
                    disabled={reopening}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Go Back & Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleReopenSubmit}
                    disabled={reopening}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    {reopening ? (
                      <>Reopening...</>
                    ) : (
                      <>
                        <RotateCcw className="size-3.5" /> Confirm & Reopen Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
