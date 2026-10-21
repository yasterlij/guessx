import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  RotateCcw,
  X,
  Layers,
  AlertTriangle,
  Calendar,
  Gavel,
  Sparkles,
} from "lucide-react"
import { useApp } from "../../AppContext"
import type { Auction } from "../../mockDataV0"

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AuctionBulkReopenModal({
  isOpen,
  selectedAuctions,
  onClose,
  onToggleSelect,
  onClearSelection,
  onSuccess,
}: {
  isOpen: boolean
  selectedAuctions: Auction[]
  onClose: () => void
  onToggleSelect: (id: string) => void
  onClearSelection: () => void
  onSuccess?: () => void
}) {
  const { bulkReopenAuctions } = useApp()
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkReopening, setBulkReopening] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    durationDays: 7,
    startTime: toDatetimeLocal(new Date()),
    endTime: toDatetimeLocal(new Date(Date.now() + 7 * 86400000)),
    overrideBidFee: false,
    bidFee: "10",
    customDates: false,
  })

  useEffect(() => {
    if (!isOpen) {
      setBulkConfirming(false)
      return
    }
    const start = toDatetimeLocal(new Date())
    const end = toDatetimeLocal(new Date(Date.now() + 7 * 86400000))
    setBulkForm({
      durationDays: 7,
      startTime: start,
      endTime: end,
      overrideBidFee: false,
      bidFee: "10",
      customDates: false,
    })
    setBulkConfirming(false)
  }, [isOpen])

  const selectedIds = selectedAuctions.map((a) => a.id)

  const handleBulkReopenSubmit = async () => {
    if (selectedIds.length === 0) return
    setBulkReopening(true)
    try {
      const startTime = new Date(bulkForm.startTime).toISOString()
      const endTime = bulkForm.customDates
        ? new Date(bulkForm.endTime).toISOString()
        : new Date(
            new Date(bulkForm.startTime).getTime() + bulkForm.durationDays * 86400000,
          ).toISOString()

      await bulkReopenAuctions(selectedIds, {
        startTime,
        endTime,
        bidFee:
          bulkForm.overrideBidFee && bulkForm.bidFee
            ? Number(bulkForm.bidFee)
            : undefined,
        durationDays: bulkForm.durationDays,
      })

      onClose()
      onSuccess?.()
    } catch {
    } finally {
      setBulkReopening(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && selectedIds.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => {
            if (!bulkReopening) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={bulkReopening}
              onClick={() => {
                onClose()
                setBulkConfirming(false)
              }}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40 cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700">
                <RotateCcw className="size-5.5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-awash-blue">
                  Bulk Reopen Auctions
                </h2>
                <p className="text-xs font-medium text-neutral-500">
                  Re-list {selectedIds.length} unsold product{selectedIds.length > 1 ? "s" : ""}{" "}
                  simultaneously
                </p>
              </div>
            </div>

            {!bulkConfirming ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-awash-blue">
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" /> Selected Auctions ({selectedIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className="text-[10px] font-semibold text-neutral-400 hover:text-red-500 cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                    {selectedAuctions.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-2xs"
                      >
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        <span className="max-w-[180px] truncate">{a.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleSelect(a.id)}
                          className="text-neutral-400 hover:text-red-500 ml-0.5 cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 text-xs text-amber-900">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">Lifecycle State Reset Notice</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                      All {selectedIds.length} selected auctions will be reset and transitioned to{" "}
                      <strong>ACTIVE</strong>. All previous bids and winner records will be permanently removed (bid fees are not refunded), and Redis frequency tallies will be cleared for each auction.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                    <Calendar className="size-3.5 text-primary" /> Relist Duration & Schedule
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { days: 3, label: "3 Days" },
                      { days: 7, label: "7 Days (Std)" },
                      { days: 14, label: "14 Days" },
                      { days: 30, label: "30 Days" },
                    ].map((preset) => {
                      const isSelected =
                        !bulkForm.customDates && bulkForm.durationDays === preset.days
                      return (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => {
                            const start = new Date(bulkForm.startTime)
                            const newEnd = toDatetimeLocal(
                              new Date(start.getTime() + preset.days * 86400000),
                            )
                            setBulkForm({
                              ...bulkForm,
                              durationDays: preset.days,
                              endTime: newEnd,
                              customDates: false,
                            })
                          }}
                          className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs"
                              : "border-border/70 bg-white text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setBulkForm({ ...bulkForm, customDates: !bulkForm.customDates })
                      }
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {bulkForm.customDates
                        ? "← Use duration presets"
                        : "Set custom start & end date / time →"}
                    </button>
                  </div>

                  {bulkForm.customDates && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                          Start Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={bulkForm.startTime}
                          onChange={(e) =>
                            setBulkForm({ ...bulkForm, startTime: e.target.value })
                          }
                          className="input-full bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                          End Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={bulkForm.endTime}
                          onChange={(e) =>
                            setBulkForm({ ...bulkForm, endTime: e.target.value })
                          }
                          className="input-full bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                      <Gavel className="size-3.5 text-primary" /> Bid Fee Policy
                    </div>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkForm.overrideBidFee}
                        onChange={(e) =>
                          setBulkForm({ ...bulkForm, overrideBidFee: e.target.checked })
                        }
                        className="size-3.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                      />
                      Override bid fee for all items
                    </label>
                  </div>

                  {bulkForm.overrideBidFee ? (
                    <div className="max-w-xs">
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                        Uniform Bid Fee (ETB)
                      </label>
                      <input
                        value={bulkForm.bidFee}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            bidFee: e.target.value.replace(/[^\d.]/g, ""),
                          })
                        }
                        placeholder="e.g. 10"
                        className="input-full bg-white text-xs"
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-500">
                      Each item will retain its current configured bid fee.
                    </p>
                  )}
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
                    onClick={() => setBulkConfirming(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] cursor-pointer"
                  >
                    Review & Reopen ({selectedIds.length}) <Sparkles className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                  <RotateCcw className="size-7" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-awash-blue">
                    Confirm Bulk Reopening
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 max-w-md mx-auto">
                    Are you sure you want to reopen all <strong>{selectedIds.length}</strong> selected auctions?
                    They will immediately appear in the <strong>Active / Live</strong> feed for user bidding.
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 border border-border/70 p-3.5 text-left text-xs space-y-1.5 text-neutral-600 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Total Items:</span>
                    <span className="font-bold text-awash-blue">{selectedIds.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Duration:</span>
                    <span className="font-semibold">
                      {bulkForm.customDates
                        ? `${new Date(bulkForm.startTime).toLocaleDateString()} to ${new Date(bulkForm.endTime).toLocaleDateString()}`
                        : `${bulkForm.durationDays} Days`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Bid Fee Policy:</span>
                    <span className="font-semibold">
                      {bulkForm.overrideBidFee
                        ? `${bulkForm.bidFee} ETB (Uniform)`
                        : "Original Product Fees"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-400">Target Tab:</span>
                    <span className="font-bold text-emerald-700">Active / Live</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setBulkConfirming(false)}
                    disabled={bulkReopening}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer"
                  >
                    Go Back & Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkReopenSubmit}
                    disabled={bulkReopening}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
                  >
                    {bulkReopening ? (
                      <>Reopening {selectedIds.length} items...</>
                    ) : (
                      <>
                        <RotateCcw className="size-3.5" /> Confirm & Reopen All Now
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
