import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  Crown,
  Briefcase,
  Users,
  Wrench,
  Microscope,
  Eye,
  User,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Plus,
  X,
  Trash2,
  AlertTriangle,
  Sparkles,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { api, type ApiAccessDecision, type ApiRbacOverride, ENTERPRISE_ROLES } from "../api"
import { toast } from "../store/toast.store"

const OVERRIDE_TEMPLATES: Record<
  string,
  { label: string; permissions: Record<string, string[]>; description: string }
> = {
  auction: {
    label: "Emergency Auction Operator",
    description: "Grant ability to manage, update, or force-close active auctions",
    permissions: { Auction: ["read", "update", "force-close", "draw-winner"] },
  },
  settlement: {
    label: "Settlement & Finance Auditor",
    description: "Access to export and review settlements and transaction flows",
    permissions: { Settlement: ["read", "export"], Transaction: ["read", "export"] },
  },
  products: {
    label: "Product Quality Approver",
    description: "Review and approve/reject pending auction product inventory",
    permissions: { Product: ["read", "approve", "reject"] },
  },
  disputes: {
    label: "Dispute Investigator",
    description: "Investigate and resolve participant complaints and disputes",
    permissions: { Dispute: ["read", "update", "manage"] },
  },
}

function GrantOverrideModal({
  onClose,
  onGranted,
}: {
  onClose: () => void
  onGranted: () => void
}) {
  const [userId, setUserId] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("auction")
  const [durationHours, setDurationHours] = useState("24")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) {
      toast("Target User ID is required", "error")
      return
    }
    if (!reason.trim()) {
      toast("Reason for temporary access elevation is required", "error")
      return
    }

    const template = OVERRIDE_TEMPLATES[selectedTemplate]
    const expiresAt = new Date(Date.now() + parseInt(durationHours, 10) * 3600 * 1000).toISOString()

    setSubmitting(true)
    try {
      await api.adminGrantRbacOverride({
        user_id: userId.trim(),
        permissions: template.permissions,
        reason: reason.trim(),
        expires_at: expiresAt,
      })
      toast("Temporary permission override granted successfully", "success")
      onGranted()
      onClose()
    } catch (err: unknown) {
      toast(`Failed to grant override: ${err instanceof Error ? err.message : String(err)}`, "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Grant Temporary Capability Override
              </h3>
              <p className="text-xs text-neutral-400">
                Elevate a staff member&apos;s capabilities with auto-expiration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-700">Target User ID *</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="mt-1 w-full rounded-xl border border-border/80 px-3.5 py-2 text-xs font-medium text-foreground outline-none focus:border-primary shadow-sm"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">Capability Template</label>
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(OVERRIDE_TEMPLATES).map(([key, t]) => {
                const active = selectedTemplate === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTemplate(key)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/70 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground">{t.label}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-500 leading-tight">
                      {t.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">Duration (Auto-Expires)</label>
            <div className="mt-1 flex gap-2">
              {[
                { label: "1 Hour", value: "1" },
                { label: "4 Hours", value: "4" },
                { label: "24 Hours", value: "24" },
                { label: "7 Days", value: "168" },
              ].map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDurationHours(d.value)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all ${
                    durationHours === d.value
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/70 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">
              Reason / Operational Justification *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Weekend on-call escalation, incident INC-492 investigation..."
              className="mt-1 w-full rounded-xl border border-border/80 px-3.5 py-2 text-xs font-medium text-foreground outline-none focus:border-primary shadow-sm resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Grant Override
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function RbacScreen() {
  const [tab, setTab] = useState<"roles" | "overrides" | "access">("roles")
  const [overrides, setOverrides] = useState<ApiRbacOverride[]>([])
  const [accessDecisions, setAccessDecisions] = useState<ApiAccessDecision[]>([])
  const [loading, setLoading] = useState(false)
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ovRes, accRes] = await Promise.allSettled([
        api.adminGetRbacOverrides(),
        api.adminGetAccessDecisions(1, 100),
      ])
      if (ovRes.status === "fulfilled" && Array.isArray(ovRes.value)) setOverrides(ovRes.value)
      if (accRes.status === "fulfilled" && accRes.value) {
        const list = Array.isArray(accRes.value) ? accRes.value : accRes.value.decisions || []
        setAccessDecisions(list)
      }
    } catch {
      toast("Failed to load RBAC telemetry", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRevoke = async (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this permission override immediately?")) return
    setRevokingId(id)
    try {
      await api.adminRevokeRbacOverride(id)
      toast("Permission override revoked", "success")
      loadData()
    } catch (e: unknown) {
      toast(`Failed to revoke override: ${e instanceof Error ? e.message : String(e)}`, "error")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <AdminLayout
      title="Roles & Access Control (RBAC)"
      subtitle="Enterprise role hierarchy, fine-grained permission overrides, and CASL policy auditing"
      actions={
        <div className="flex items-center gap-2">
          {tab === "overrides" && (
            <button
              onClick={() => setGrantModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all"
            >
              <Plus className="size-3.5" />
              New Override
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-neutral-50 shadow-sm"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: "roles", label: "Role Hierarchy", icon: Crown },
            { key: "overrides", label: "Permission Overrides", icon: KeyRound },
            { key: "access", label: "Access Audit Log", icon: Eye },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-neutral-600 hover:text-foreground border border-border/80"
              }`}
            >
              <t.icon className="size-3.5" /> {t.label}
              {t.key === "overrides" && overrides.filter((o) => o.active).length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {overrides.filter((o) => o.active).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: ROLE HIERARCHY */}
        {tab === "roles" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ENTERPRISE_ROLES.map((r, i) => (
              <motion.div
                key={r.role}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-100 font-mono text-xs font-extrabold text-foreground">
                      L{r.level}
                    </span>
                    <h3 className="font-display text-base font-bold text-foreground">{r.label}</h3>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 font-mono uppercase">
                    {r.role}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed min-h-[36px]">
                  {r.description}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] font-semibold text-neutral-400">
                  <span>Tier Level {r.level}</span>
                  <span className="text-primary font-bold">Standard Policy</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* TAB 2: PERMISSION OVERRIDES */}
        {tab === "overrides" && (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border/70 bg-white p-12 text-center text-neutral-400 shadow-sm">
                <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                Loading permission overrides...
              </div>
            ) : overrides.length === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-white p-12 text-center text-neutral-400 shadow-sm">
                <KeyRound className="mx-auto size-8 text-neutral-300 mb-2" />
                <p className="text-sm font-semibold text-neutral-600">
                  No active permission overrides configured.
                </p>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Standard organizational hierarchy policies apply. Click &quot;New Override&quot; to grant temporary elevated capabilities.
                </p>
                <button
                  onClick={() => setGrantModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
                >
                  <Plus className="size-3.5" />
                  Grant Temporary Override
                </button>
              </div>
            ) : (
              overrides.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-border/70 bg-white p-5 shadow-sm hover:border-border transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          User ID: {o.user_id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            o.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {o.active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                          {o.active ? "Active" : "Expired / Revoked"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-neutral-600 font-medium">
                        <span className="font-bold text-neutral-700">Reason:</span> {o.reason}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {Object.entries(o.permissions || {}).map(([subject, actions]) => (
                          <span
                            key={subject}
                            className="rounded-lg bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-[11px] font-mono text-neutral-800"
                          >
                            <span className="font-bold text-primary">{subject}</span>:{" "}
                            {Array.isArray(actions) ? actions.join(", ") : String(actions)}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-400">
                        Expires: {o.expires_at ? new Date(o.expires_at).toLocaleString() : "Never"}
                      </p>
                    </div>

                    {o.active && (
                      <button
                        onClick={() => handleRevoke(o.id)}
                        disabled={revokingId === o.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                      >
                        {revokingId === o.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Revoke Now
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: ACCESS DECISIONS AUDIT TRAIL */}
        {tab === "access" && (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            <div className="border-b border-border/60 bg-neutral-50/80 px-4 py-3 flex items-center justify-between">
              <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                CASL Authorization Enforcement Trail
              </h3>
              <span className="text-xs text-neutral-400">
                {accessDecisions.length} decisions evaluated
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-neutral-50/50 font-semibold text-neutral-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Actor / User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target Subject</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                        Loading access logs...
                      </td>
                    </tr>
                  ) : accessDecisions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        No authorization access decisions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    accessDecisions.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                          {log.user_id ? log.user_id.slice(0, 16) : "System"}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 font-semibold">
                          {log.user_role || "user"}
                        </td>
                        <td className="px-4 py-3 text-neutral-800 font-mono">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 text-neutral-800 font-mono">
                          {log.subject}
                        </td>
                        <td className="px-4 py-3">
                          {log.granted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="size-3" /> Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
                              <XCircle className="size-3" /> Denied
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-400 font-mono text-[11px]">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AnimatePresence>
          {grantModalOpen && (
            <GrantOverrideModal
              onClose={() => setGrantModalOpen(false)}
              onGranted={loadData}
            />
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}