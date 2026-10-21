import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Lock,
  AlertCircle,
  Loader2,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Target,
  KeyRound,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { useApp } from "../AppContext";
import { GuessXLogo } from "../components/AuctionUI";
import { FormField, FormPasswordInput } from "../components/FormField";
import { useForm } from "../hooks/useForm";
import { loginSchema, type LoginValues } from "../lib/validation";

const SESSION_END_MESSAGES: Record<string, string> = {
  idle: "Your session ended because you were inactive. Please sign in to continue.",
  absolute: "Your session expired after 12 hours. Please sign in again.",
  "refresh-failed": "Your session has expired. Please sign in again.",
  expired: "Your session has expired. Please sign in again.",
};

const STAT_ITEMS = [
  { value: "24/7", label: "Live Auctions" },
  { value: "100%", label: "Fair Play Verified" },
  { value: "256-bit", label: "Encrypted Sessions" },
];

const FEATURE_POINTS = [
  {
    icon: Target,
    title: "Lowest Unique Bid Engine",
    desc: "Guess the single lowest unique amount. Pure skill and strategy, zero luck.",
  },
  {
    icon: Zap,
    title: "Real-Time Outbid Alerts",
    desc: "Instant live notifications keep you ahead of competing bidders every second.",
  },
  {
    icon: ShieldCheck,
    title: "Dedicated PIN-Protected Wallet",
    desc: "Bank-grade Sikina & Awash payment gateways with 4-digit PIN authentication.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function BrandPanel() {
  return (
    <div className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#040a14] via-[#071324] to-[#03070f] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
      {/* ── Ambient Background Lighting ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.32, 0.2] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-28 -left-28 h-[480px] w-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(200,166,66,0.7) 0%, rgba(200,166,66,0.05) 50%, transparent 70%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-24 -right-24 h-[440px] w-[440px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,112,255,0.45) 0%, rgba(0,43,92,0.1) 55%, transparent 75%)",
          }}
        />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="login-grid"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-grid)" />
        </svg>
      </div>

      {/* ── Top Logo ── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center"
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-[#C8A642]/15 blur-lg" />
          <GuessXLogo variant="light" size={62} />
        </div>
      </motion.div>

      {/* ── Middle Hero Content ── */}
      <div className="relative z-10 my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C8A642]/30 bg-[#C8A642]/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-[#E2C772] backdrop-blur-md">
            <Sparkles className="size-3.5 text-[#C8A642]" />
            <span>ETHIOPIA'S PREMIER UNIQUE BID PLATFORM</span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white lg:text-4xl xl:text-5xl leading-[1.12]">
            Bid Smart. <br />
            <span className="bg-gradient-to-r from-white via-neutral-100 to-[#E2C772] bg-clip-text text-transparent">
              Win For Pennies.
            </span>
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-neutral-300/80">
            Guess the lowest unique amount and win flagship smartphones, luxury electronics, and vehicles at a tiny fraction of retail value.
          </p>

          {/* ── Key Feature Highlights ── */}
          <div className="mt-8 space-y-4 pt-2">
            {FEATURE_POINTS.map((feat, idx) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.45,
                  delay: 0.3 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 backdrop-blur-sm transition-colors hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8A642]/25 to-awash-blue/30 text-[#E2C772]">
                  <feat.icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {feat.title}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400 leading-normal">
                    {feat.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Stats ── */}
      <div className="relative z-10 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-3 sm:grid-cols-3"
        >
          {STAT_ITEMS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md transition-all hover:bg-white/[0.07]"
            >
              <div className="font-display text-lg font-bold text-white tracking-tight">
                {s.value}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/40">
          <span>&copy; {new Date().getFullYear()} GuessX. All rights reserved.</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Certified Fair Play
          </span>
        </div>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { login, go, authError, sessionEndReason } = useApp();
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const form = useForm<LoginValues>(loginSchema, {
    phone_number: "",
    password: "",
  });

  const onSubmit = async (values: LoginValues) => {
    const ok = await login(values.phone_number, values.password);
    if (!ok) {
      form.setErrors({ _form: "Invalid phone number or password" } as any);
    }
  };

  const handleQuickFill = (phone: string, pass: string) => {
    form.handleChange("phone_number", phone);
    form.handleChange("password", pass);
    form.setErrors({} as any);
  };

  const displayError = (form.errors as any)._form || authError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-screen flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-[#f4f7fc]"
    >
      {/* ── Background Ambient Blobs ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(200,166,66,0.18)_0%,transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-6%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(0,43,92,0.14)_0%,transparent_68%)] blur-3xl" />
      </div>

      {/* ── Desktop Brand Panel (Left) ── */}
      <div className="hidden lg:block lg:w-[48%] xl:w-[46%] lg:flex-shrink-0 lg:order-1">
        <BrandPanel />
      </div>

      {/* ── Login Form Column (Right) ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:order-2 lg:px-12 xl:px-16">
        {/* Mobile Header Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-col items-center lg:hidden"
        >
          <div className="relative flex items-center justify-center p-2">
            <div className="absolute -inset-1 rounded-2xl bg-awash-blue/10 blur-md" />
            <GuessXLogo variant="dark" size={54} />
          </div>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Unique Bid Auctions
          </span>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Header Title */}
          <motion.div variants={itemVariants} className="mb-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-awash-blue/10 px-3 py-1 text-xs font-semibold text-awash-blue">
              <Sparkles className="size-3 text-awash-blue" />
              Welcome Back
            </span>
            <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Enter your credentials to manage bids, wallet, and awards.
            </p>
          </motion.div>

          {/* Session Termination Notice */}
          <AnimatePresence>
            {sessionEndReason && SESSION_END_MESSAGES[sessionEndReason] && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 18 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-start gap-3 rounded-2xl border border-[#C8A642]/35 bg-[#FFF9EB] p-4 text-sm text-[#08111f] shadow-sm"
              >
                <LogOut className="mt-0.5 size-4 shrink-0 text-[#C8A642]" />
                <span className="leading-snug">
                  {SESSION_END_MESSAGES[sessionEndReason]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 18 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-[13px] font-semibold text-destructive shadow-sm"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{displayError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form Card ── */}
          <motion.div
            variants={itemVariants}
            className="rounded-[2rem] border border-white/80 bg-white/95 p-6 sm:p-8 shadow-[0_20px_60px_rgba(8,17,31,0.07)] backdrop-blur-2xl"
          >
            <div className="space-y-4">
              {/* Phone Field */}
              <FormField
                label="Phone Number"
                error={form.errors.phone_number}
                touched={form.touched.phone_number}
                icon={<Smartphone className="size-4" />}
                hint="Your registered Ethiopian mobile number"
              >
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-500 pointer-events-none select-none">
                    <span className="text-sm">🇪🇹</span>
                    <span>+251</span>
                    <span className="text-neutral-300">|</span>
                  </div>
                  <input
                    id="login-phone"
                    ref={phoneRef}
                    value={form.values.phone_number}
                    onChange={(e) => {
                      form.handleChange(
                        "phone_number",
                        e.target.value.replace(/\D/g, ""),
                      );
                      form.setErrors({} as any);
                    }}
                    onBlur={() => form.handleBlur("phone_number")}
                    onKeyDown={(e) => e.key === "Enter" && pwRef.current?.focus()}
                    placeholder="091 XXX XXXX"
                    maxLength={15}
                    autoComplete="tel"
                    inputMode="numeric"
                    className={`w-full rounded-2xl border bg-[#f8fafc] py-3.5 pl-24 pr-4 text-sm font-semibold tracking-wide text-[#08111f] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:bg-white focus:ring-4 ${
                      form.errors.phone_number && form.touched.phone_number
                        ? "border-destructive/50 focus:border-destructive focus:ring-destructive/15"
                        : "border-border/60 focus:border-awash-blue focus:ring-awash-blue/15"
                    }`}
                  />
                </div>
              </FormField>

              {/* Password Field */}
              <FormField
                label="Password"
                error={form.errors.password}
                touched={form.touched.password}
                icon={<Lock className="size-4" />}
              >
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <FormPasswordInput
                    id="login-password"
                    ref={pwRef}
                    theme="light"
                    hasIcon
                    value={form.values.password}
                    onChange={(e) => {
                      form.handleChange("password", e.target.value);
                      form.setErrors({} as any);
                    }}
                    onBlur={() => form.handleBlur("password")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && form.handleSubmit(onSubmit)
                    }
                    invalid={!!form.errors.password && !!form.touched.password}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                    className={`bg-[#f8fafc] py-3.5 pl-11 text-sm font-medium transition-all duration-200 focus:bg-white focus:ring-4 ${
                      form.errors.password && form.touched.password
                        ? "focus:ring-destructive/15"
                        : "focus:ring-awash-blue/15 focus:border-awash-blue"
                    }`}
                  />
                </div>
              </FormField>

              {/* Remember Me & Help */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex cursor-pointer items-center gap-2 select-none text-neutral-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded-md border-border/80 text-awash-blue focus:ring-awash-blue/20"
                  />
                  <span>Remember this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                  className="inline-flex items-center gap-1 font-medium text-awash-blue hover:text-awash-blue-dark transition-colors"
                >
                  <KeyRound className="size-3" />
                  <span>Demo Logins</span>
                </button>
              </div>

              {/* Demo Helper Drawer */}
              <AnimatePresence>
                {showDemoCredentials && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-awash-blue/20 bg-awash-blue/[0.04] p-3 text-xs"
                  >
                    <div className="font-semibold text-awash-blue mb-2 flex items-center justify-between">
                      <span>Quick Test Accounts:</span>
                      <HelpCircle className="size-3.5 text-neutral-400" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickFill("0913320018", "0000")}
                        className="flex items-center justify-between rounded-xl bg-white p-2 text-left shadow-xs transition-colors hover:bg-neutral-50"
                      >
                        <span className="font-medium text-neutral-700">Standard User: 0913320018</span>
                        <span className="text-[11px] font-mono text-awash-blue">0000</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickFill("0911111111", "1234")}
                        className="flex items-center justify-between rounded-xl bg-white p-2 text-left shadow-xs transition-colors hover:bg-neutral-50"
                      >
                        <span className="font-medium text-neutral-700">Admin Account: 0911111111</span>
                        <span className="text-[11px] font-mono text-amber-600">1234</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Submit Button ── */}
            <motion.button
              onClick={() => form.handleSubmit(onSubmit)}
              disabled={form.isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-awash-blue via-[#003875] to-[#00224b] py-4 text-base font-bold tracking-wide text-white shadow-[0_12px_32px_rgba(0,43,92,0.28)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_16px_36px_rgba(0,43,92,0.36)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-awash-blue/30"
            >
              {form.isSubmitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ArrowRight className="size-5" />
              )}
              <span>{form.isSubmitting ? "Authenticating…" : "Sign In to GuessX"}</span>
            </motion.button>
          </motion.div>

          {/* ── Register Switch ── */}
          <motion.div
            variants={itemVariants}
            className="mt-6 text-center text-sm text-neutral-500"
          >
            <span>Don't have an account yet? </span>
            <button
              onClick={() => go("register")}
              className="font-bold text-awash-blue hover:text-awash-blue-dark hover:underline transition-colors focus-visible:outline-none"
            >
              Create Account
            </button>
          </motion.div>

          {/* ── Security Trust Footer ── */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-400"
          >
            <ShieldCheck className="size-4 text-[#C8A642]" />
            <span>256-Bit SSL Encrypted &bull; PIN-Protected Wallet &bull; Fair Play Certified</span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
