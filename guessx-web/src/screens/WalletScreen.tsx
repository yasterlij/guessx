import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet,
  Eye,
  EyeOff,
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  Gavel,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Headphones,
  RefreshCw,
} from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { formatCurrency, CURRENCY } from "../mockDataV0"
import { FormField } from "../components/FormField"
import { useForm } from "../hooks/useForm"
import { depositSchema, type DepositValues } from "../lib/validation"

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500, 5000]

export function WalletScreen() {
  const { user, walletBalance, refreshWallet, myBids, getAuction, go, goBack } = useApp()
  const [showBalance, setShowBalance] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<"deposit" | "activity">("deposit")

  const form = useForm<DepositValues>(depositSchema, { amount: 500 })

  const onSubmit = async (values: DepositValues) => {
    setLoading(true)
    setFormError(null)
    try {
      await api.wallet.deposit(values.amount)
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        form.handleChange("amount", 0)
      }, 2500)
    } catch (e: unknown) {
      setFormError((e instanceof Error ? e.message : undefined) || "Deposit failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const phoneLast4 = user?.phone ? user.phone.slice(-4) : "8980"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-8 pb-12 max-w-5xl mx-auto w-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => goBack ? goBack() : go("home")}
            className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 text-awash-blue shadow-sm backdrop-blur-sm transition-all hover:bg-white"
          >
            <ArrowLeft className="size-5" />
          </motion.button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                My Wallet
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-200">
                <ShieldCheck className="size-3.5" /> Verified
              </span>
            </div>
            <p className="text-sm font-medium text-neutral-500">
              GuessX Secure Escrow & Instant Bidding Balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshWallet()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border/60 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors shadow-sm"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002B5C] via-[#001D40] to-[#0B1528] p-6 sm:p-7 text-white shadow-xl border border-white/10">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#004B99]/30 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-56 sm:h-60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E6AF2E]">
                      GuessX Escrow
                    </span>
                    <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">
                      VIRTUAL
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 font-medium">Bidding & Escrow Card</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-[#E6AF2E]/20 border border-[#E6AF2E]/40 flex items-center justify-center">
                    <Wallet className="size-4 text-[#E6AF2E]" />
                  </div>
                </div>
              </div>

              <div className="my-auto py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/70">Available Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition-colors"
                  >
                    {showBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {showBalance ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                    {showBalance ? formatCurrency(walletBalance) : "••••••••"}
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <p className="text-[10px] font-mono tracking-widest text-white/60">
                    •••• •••• •••• {phoneLast4}
                  </p>
                  <p className="text-xs font-semibold tracking-wide text-white uppercase mt-0.5">
                    {user?.name || "GuessX Member"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/60 uppercase tracking-wider block">Status</span>
                  <span className="text-xs font-semibold text-emerald-400">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Bank-Grade Security
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs text-neutral-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Instant Escrow Refunds:</strong> Returned instantly if outbid or when auction resolves.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Zero Delay:</strong> Instant bidding pass with real-time settlement on every round.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Protected:</strong> Regulated by GuessX financial compliance infrastructure.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-[#002B5C]/5 border border-[#002B5C]/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#002B5C]/10 flex items-center justify-center text-awash-blue">
                <Headphones className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">GuessX Support 24/7</p>
                <p className="text-[11px] text-neutral-500">Call 8980 toll-free from any network</p>
              </div>
            </div>
            <span className="text-xs font-bold text-awash-blue">8980</span>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex border-b border-border/60 pb-1 gap-4">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`pb-3 text-sm font-semibold transition-colors relative ${
                activeTab === "deposit" ? "text-awash-blue" : "text-neutral-500 hover:text-foreground"
              }`}
            >
              Top Up / Deposit
              {activeTab === "deposit" && (
                <motion.div
                  layoutId="walletTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-awash-blue rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-sm font-semibold transition-colors relative ${
                activeTab === "activity" ? "text-awash-blue" : "text-neutral-500 hover:text-foreground"
              }`}
            >
              Recent Activity ({myBids.length})
              {activeTab === "activity" && (
                <motion.div
                  layoutId="walletTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-awash-blue rounded-full"
                />
              )}
            </button>
          </div>

          {activeTab === "deposit" ? (
            <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm flex flex-col gap-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Add Funds to GuessX Wallet</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select a quick top-up amount or enter custom amount to deposit instantly.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide block mb-2">
                  Quick Amounts
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {QUICK_AMOUNTS.map((amt) => {
                    const isSelected = form.values.amount === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          form.handleChange("amount", amt)
                          setFormError(null)
                        }}
                        className={`rounded-xl py-2.5 px-2 text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-awash-blue text-white border-awash-blue shadow-md"
                            : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        +{amt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <FormField
                label="Deposit Amount"
                error={form.errors.amount}
                touched={form.touched.amount}
                hint="Up to 1,000,000 Birr per transaction."
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg font-bold text-foreground">
                    {CURRENCY}
                  </span>
                  <input
                    value={form.values.amount ? String(form.values.amount) : ""}
                    onChange={(e) => {
                      const clean = e.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1")
                        .replace(/(\.\d{2})\d+/g, "$1")
                      form.handleChange("amount", clean ? Number(clean) : 0)
                      setFormError(null)
                    }}
                    onBlur={() => form.handleBlur("amount")}
                    placeholder="0.00"
                    inputMode="numeric"
                    className={`w-full rounded-xl border bg-white pl-14 pr-4 py-3.5 font-display text-xl font-bold text-foreground outline-none transition-all focus:ring-2 ${
                      form.errors.amount && form.touched.amount
                        ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                        : "border-border/60 focus:border-awash-blue focus:ring-awash-blue/20"
                    }`}
                  />
                </div>
              </FormField>

              <AnimatePresence>
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive"
                  >
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{formError}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-700"
                  >
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Deposit completed successfully! Balance updated.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={loading || form.values.amount <= 0}
                onClick={() => form.handleSubmit(onSubmit)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-4 text-sm font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing Deposit...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="size-4" />
                    Deposit {form.values.amount > 0 ? formatCurrency(form.values.amount) : "Now"}
                  </>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Recent Wallet Activity</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Your bid fees and participation transactions.
                </p>
              </div>

              {myBids.length > 0 ? (
                <div className="space-y-3">
                  {myBids.map((b, idx) => {
                    const auction = getAuction(b.auctionId)
                    return (
                      <div
                        key={b.ticketNumber || `${b.auctionId}-${b.placedAt}-${idx}`}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-awash-blue/10 flex items-center justify-center text-awash-blue">
                            <Gavel className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                              {auction?.name || `Auction #${b.auctionId.slice(0, 6)}`}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Bid: {formatCurrency(b.amount)} • Ticket #{b.ticketNumber || String(idx + 1).padStart(6, "0")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-red-600">
                            -{formatCurrency(auction?.bidFee ?? 50)}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-neutral-200/60 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                            Fee Paid
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center text-neutral-400">
                  <Clock className="size-10 stroke-1 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No Transactions Yet</p>
                  <p className="text-xs text-neutral-500 max-w-xs mt-1">
                    When you enter Guess X auctions, bid fees and escrow activity will show here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
