import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smartphone, Lock, User, AlertCircle, Loader2, Sparkles, Check } from "lucide-react"
import { useApp } from "../AppContext"
import { GuessXLogo } from "../components/AuctionUI"
import { FormField } from "../components/FormField"
import { useForm } from "../hooks/useForm"
import { registerSchema, passwordStrength, type RegisterValues } from "../lib/validation"

export function RegisterScreen() {
  const { register, go, authError } = useApp()
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const form = useForm<RegisterValues>(registerSchema, {
    full_name: "",
    phone_number: "",
    password: "",
  })

  const onSubmit = async (values: RegisterValues) => {
    await register(values.phone_number, values.password, values.full_name)
  }

  const displayError = authError || (form.errors as any)._form
  const strength = passwordStrength(form.values.password)
  const showStrength = form.values.password.length > 0

  return (
    <div className="relative flex min-h-screen flex-col overflow-y-auto bg-white px-6">

      <div className="relative flex flex-1 flex-col items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="animate-float-rotate"
        >
          <GuessXLogo variant="dark" size={46} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 text-center"
        >
          <h1 className="font-display text-3xl font-semibold tracking-[-0.022em] text-ink">Create Account</h1>
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-normal text-neutral-500">
            <Sparkles className="size-3.5 text-primary" />
            Join the Guess X auction platform
          </p>
        </motion.div>

        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 flex w-full max-w-xs items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/15 p-3 text-xs font-semibold text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{displayError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 w-full max-w-xs space-y-4"
        >
          <FormField
            label="Full Name"
            error={form.errors.full_name}
            touched={form.touched.full_name}
            icon={<User className="size-4" />}
          >
            <input
              ref={nameRef}
              value={form.values.full_name}
              onChange={(e) => {
                form.handleChange("full_name", e.target.value)
                form.setErrors({} as any)
              }}
              onBlur={() => form.handleBlur("full_name")}
              onKeyDown={(e) => e.key === "Enter" && phoneRef.current?.focus()}
              placeholder="Selam Tesfaye"
              className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm font-normal text-ink outline-none transition-colors placeholder:text-neutral-400 ${
                form.errors.full_name && form.touched.full_name
                  ? "border-destructive/60 focus:border-destructive"
                  : "border-border/60 focus:border-primary/50"
              }`}
            />
          </FormField>

          <FormField
            label="Phone Number"
            error={form.errors.phone_number}
            touched={form.touched.phone_number}
            icon={<Smartphone className="size-4" />}
          >
            <input
              ref={phoneRef}
              value={form.values.phone_number}
              onChange={(e) => {
                form.handleChange("phone_number", e.target.value.replace(/\D/g, ""))
                form.setErrors({} as any)
              }}
              onBlur={() => form.handleBlur("phone_number")}
              onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()}
              placeholder="091 XXX XXXX"
              maxLength={15}
              className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm font-normal text-ink outline-none transition-colors placeholder:text-neutral-400 ${
                form.errors.phone_number && form.touched.phone_number
                  ? "border-destructive/60 focus:border-destructive"
                  : "border-border/60 focus:border-primary/50"
              }`}
            />
          </FormField>

          <FormField
            label="Password"
            error={form.errors.password}
            touched={form.touched.password}
            icon={<Lock className="size-4" />}
          >
            <input
              ref={pwRef}
              type="password"
              value={form.values.password}
              onChange={(e) => {
                form.handleChange("password", e.target.value)
                form.setErrors({} as any)
              }}
              onBlur={() => form.handleBlur("password")}
              onKeyDown={(e) => e.key === "Enter" && form.handleSubmit(onSubmit)}
              placeholder="min 4 characters"
              className={`w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm font-normal text-ink outline-none transition-colors placeholder:text-neutral-400 ${
                form.errors.password && form.touched.password
                  ? "border-destructive/60 focus:border-destructive"
                  : "border-border/60 focus:border-primary/50"
              }`}
            />
          </FormField>

          {/* Password strength meter */}
          <AnimatePresence>
            {showStrength && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="h-1 flex-1 origin-left rounded-full"
                      style={{
                        backgroundColor: i < strength.score ? strength.color : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <p className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: strength.color }}>
                  {strength.score >= 3 && <Check className="size-2.5" />}
                  {strength.label}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          onClick={() => form.handleSubmit(onSubmit)}
          disabled={form.isSubmitting}
          whileTap={{ scale: 0.98 }}
          className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[17px] font-normal tracking-[-0.022em] text-primary-foreground transition-colors hover:bg-[#B89A38] disabled:opacity-60"
        >
          {form.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {form.isSubmitting ? "Creating account…" : "Create Account"}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xs font-normal text-neutral-500"
        >
          Already have an account?{" "}
          <button onClick={() => go("login")} className="font-medium text-link-blue hover:underline">
            Sign In
          </button>
        </motion.p>
      </div>
    </div>
  )
}
