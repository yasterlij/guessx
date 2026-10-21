import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Wallet, Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { FormField } from "../components/FormField"
import { useForm } from "../hooks/useForm"
import { depositSchema, type DepositValues } from "../lib/validation"
import { CURRENCY, formatCurrency, formatETB } from "../mockDataV0"

const QUICK_AMOUNTS = [100, 250, 500, 1000]

export function DepositScreen() {
  const { go, goBack, refreshWallet, walletBalance } = useApp()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<DepositValues>(depositSchema, { amount: 0 })

  const onSubmit = async (values: DepositValues) => {
    setLoading(true)
    setFormError(null)
    try {
      await api.wallet.deposit(values.amount)
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => go("home"), 1600)
    } catch (e: unknown) {
      setFormError((e instanceof Error ? e.message : undefined) || "Deposit failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={goBack}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 text-awash-blue shadow-sm backdrop-blur-sm transition-all hover:bg-white"
        >
          <ArrowLeft className="size-5" />
        </motion.button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Top Up Wallet</h1>
          <p className="text-sm font-medium text-neutral-500">Add funds to your GuessX Wallet</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl bg-gradient-to-br from-awash-blue to-awash-blue-dark p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Current Balance</span>
            <Wallet className="size-5 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-white">
            {formatCurrency(walletBalance)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-white/70 p-6 shadow-[0_4px_20px_rgba(0,43,92,0.04)] backdrop-blur-sm"
        >
          <FormField
            label="Amount"
            error={form.errors.amount}
            touched={form.touched.amount}
            hint="Maximum 2 decimal places. Up to 1,000,000 birr."
          >
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl font-extrabold text-foreground">{CURRENCY}</span>
              <input
                value={form.values.amount ? String(form.values.amount) : ""}
                onChange={(e) => {
                  const clean = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1")
                  form.handleChange("amount", clean ? Number(clean) : 0)
                  setFormError(null)
                }}
                onBlur={() => form.handleBlur("amount")}
                onKeyDown={(e) => e.key === "Enter" && form.handleSubmit(onSubmit)}
                placeholder="0.00"
                inputMode="numeric"
                className={`w-full rounded-xl border bg-white px-10 py-4 font-display text-2xl font-extrabold text-foreground outline-none transition-all focus:ring-2 ${
                  form.errors.amount && form.touched.amount
                    ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                    : "border-border focus:border-primary focus:ring-primary/20"
                }`}
              />
            </div>
          </FormField>

          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
              >
                <AlertCircle className="size-4 shrink-0 text-destructive" />
                <p className="text-xs font-semibold text-destructive">{formError}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
              >
                <CheckCircle2 className="size-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">Deposit successful! Redirecting…</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => form.handleSubmit(onSubmit)}
            disabled={loading || !form.values.amount}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" /> Processing…</>
            ) : (
              <><Wallet className="size-4" /> Deposit{form.values.amount > 0 ? ` ${formatCurrency(form.values.amount)}` : ""}</>
            )}
          </motion.button>
        </motion.div>

        {/* Quick amounts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/60 bg-white/50 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Quick Deposit</h3>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((v, i) => (
              <motion.button
                key={v}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                onClick={() => {
                  form.handleChange("amount", v)
                  form.handleBlur("amount")
                  setFormError(null)
                }}
                className={`rounded-xl border bg-white py-2.5 text-sm font-bold transition-all hover:border-primary/40 hover:bg-primary/5 ${
                  form.values.amount === v ? "border-primary bg-primary/5 text-primary" : "border-border text-awash-blue"
                }`}
              >
                {v}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
