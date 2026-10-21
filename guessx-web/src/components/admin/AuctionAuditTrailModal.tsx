import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, History } from "lucide-react"
import { api } from "../../api"
import type { Auction } from "../../mockDataV0"

export function AuctionAuditTrailModal({
  auction,
  onClose,
}: {
  auction: Auction | null
  onClose: () => void
}) {
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auction) return
    let active = true
    setLoading(true)
    api
      .adminListAuditLogs({ entity_id: auction.id, limit: 50 })
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res) ? res : (res as any)?.data || []
        setAuditLogs(list)
      })
      .catch(() => {
        if (active) setAuditLogs([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [auction])

  return (
    <AnimatePresence>
      {auction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200/60 text-awash-blue">
                <History className="size-5.5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-awash-blue">
                  Auction Lifecycle Audit Trail
                </h2>
                <p className="text-xs font-medium text-neutral-500">
                  {auction.name} (Code: {auction.publicCode || auction.id.slice(0, 8)})
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Payment Window</span>
                <span className="font-bold text-awash-blue">
                  {auction.payment_deadline_hours || 720}h ({Math.round((auction.payment_deadline_hours || 720) / 24)}d)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Escalation Rule</span>
                <span className="font-bold text-neutral-700">
                  {auction.escalation_rule || "LOWEST_UNIQUE_BID"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Payment Status</span>
                <span className="font-bold text-emerald-700">
                  {auction.payment_status || "UNSET"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">2nd Winner Reassigned</span>
                <span className="font-bold text-neutral-700">
                  {auction.second_winner_assigned ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Audit Event History ({auditLogs.length} events)
              </h3>
              {loading ? (
                <div className="py-8 text-center text-xs text-neutral-400">Loading audit history...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">No recorded audit log events yet.</div>
              ) : (
                <div className="divide-y divide-border/60 border border-border/70 rounded-2xl bg-white overflow-hidden max-h-72 overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3 text-xs hover:bg-neutral-50/80">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-awash-blue">{log.action}</span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500 flex items-center gap-3">
                        <span>
                          Actor: <strong className="font-mono">{log.actor_phone || log.actor_id?.slice(0, 8)}</strong>
                        </span>
                        <span>Entity: {log.entity_type}</span>
                      </div>
                      {log.details && (
                        <pre className="mt-1.5 p-2 bg-neutral-100 rounded-lg text-[10px] font-mono text-neutral-600 overflow-x-auto whitespace-pre-wrap">
                          {typeof log.details === "object" ? JSON.stringify(log.details, null, 2) : log.details}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
