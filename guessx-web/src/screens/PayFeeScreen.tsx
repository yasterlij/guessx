import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Info,
  Loader2,
  Wallet,
  Building2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertTriangle,
  X,
  Lock,
  Minus,
  Plus,
} from "lucide-react";
import { useApp } from "../AppContext";
import { toast } from "../store/toast.store";
import { CURRENCY, formatCurrency, formatETB } from "../mockDataV0";
import { api } from "../api";

const paymentMethods = [
  {
    id: "AWASH" as const,
    label: "Awash Wallet",
    desc: "Pay from your Awash Wallet after PIN confirmation",
    icon: Building2,
    gradient: "from-awash-blue/10 to-awash-blue/5 border-awash-blue/20",
    iconBg: "bg-awash-blue/10 text-awash-blue",
  },
];

export function PayFeeScreen() {
  const {
    go,
    goBack,
    payFee,
    getAuction,
    selectedId,
    authError,
    paymentMethod,
    setPaymentMethod,
    walletBalance,
    pendingBidAmount,
    setPendingBidAmount,
    myBids,
    user,
  } = useApp();
  const auction = getAuction(selectedId);
  const [loading, setLoading] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [selected, setSelected] = useState<"AWASH">("AWASH");
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      toast("Administrators are not allowed to participate in bidding.", "error");
      goBack();
    }
  }, [user?.role, toast, goBack]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [pinLocked, setPinLocked] = useState(false);
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState("");

  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [bidStr, setBidStr] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  );
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const STEP = 0.01;
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.bid
      .myBids(selectedId)
      .then((res) => {
        if (active) setServerBidAmounts(res.bids.map((b) => b.amount));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "";
    setBidStr((current) => (current === nextBid ? current : nextBid));
  }, [pendingBidAmount]);

  const hasPlacedBid = useCallback(
    (amount: number) =>
      myBids.some((b) => b.auctionId === selectedId && b.amount === amount) ||
      serverBidAmounts.some((a) => a === amount),
    [myBids, serverBidAmounts, selectedId],
  );

  useEffect(() => {
    if (!showPinModal) return;
    setPinInput("");
    setPinError(null);
  }, [showPinModal]);

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown("");
      return;
    }

    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now();
      if (ms <= 0) {
        setLockCountdown("");
        setPinLocked(false);
        setPinLockedUntil(null);
        setAttemptsRemaining(5);
        return;
      }

      const totalSec = Math.ceil(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      if (h > 0) {
        setLockCountdown(
          `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`,
        );
      } else {
        setLockCountdown(
          `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}s`,
        );
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [pinLocked, pinLockedUntil]);

  useEffect(() => {
    if (!bidFlash) return;
    const id = window.setTimeout(() => setBidFlash(false), 240);
    return () => window.clearTimeout(id);
  }, [bidFlash]);

  const bidAmount = bidStr ? Number(bidStr) : 0;
  const hasValidBid = bidAmount >= 1 && /^\d+(\.\d{1,2})?$/.test(bidStr);
  const isDuplicate = bidAmount > 0 && hasPlacedBid(bidAmount);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  if (!auction) return null;

  const updateBid = useCallback(
    (next: number) => {
      const safe = Math.max(1, Number(next.toFixed(2)));
      setBidStr(safe.toFixed(2));
      setBidError(null);
      setPendingBidAmount(safe);
      setBidFlash(true);
    },
    [setPendingBidAmount],
  );

  const adjustBid = useCallback(
    (delta: number) => {
      updateBid((bidStr ? Number(bidStr) : 1) + delta);
    },
    [bidStr, updateBid],
  );

  const handlePayClick = useCallback(async () => {
    if (user?.role === "admin") {
      const msg = "Administrators are not allowed to participate in bidding.";
      setBidError(msg);
      toast(msg, "error");
      return;
    }
    if (!hasValidBid) {
      setBidError("Enter a valid bid amount to continue");
      return;
    }
    if (isDuplicate) {
      setShowDuplicateModal(true);
      return;
    }
    setAgreementAccepted(false);
    setShowAgreementModal(true);
  }, [hasValidBid, isDuplicate, toast, user?.role]);

  const handleConfirmAgreement = useCallback(async () => {
    if (!agreementAccepted) return;
    setShowAgreementModal(false);
    setPendingBidAmount(bidAmount);
    setPaymentMethod("AWASH");
    setCheckingPin(true);
    try {
      const status = await api.wallet.pinStatus();
      setPinLocked(status.locked);
      setPinLockedUntil(status.lockedUntil);
      setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining);
      setNeedsPinSetup(!status.hasPin);
      setShowPinModal(true);
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Failed to check wallet PIN status");
      setNeedsPinSetup(false);
      setPinLocked(false);
      setShowPinModal(true);
    } finally {
      setCheckingPin(false);
    }
  }, [
    agreementAccepted,
    bidAmount,
    setPaymentMethod,
    setPendingBidAmount,
  ]);

  const handleVerifyPin = useCallback(async () => {
    if (!pinInput) {
      setPinError("Please enter your wallet PIN");
      return;
    }
    if (pinLocked) return;

    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.wallet.verifyPin(pinInput);
      if (res.valid) {
        setShowPinModal(false);
        setLoading(true);
        try {
          await payFee(auction.bidFee, "AWASH");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (res.locked) {
        setPinLocked(true);
        setPinLockedUntil(res.lockedUntil);
        setAttemptsRemaining(0);
        setPinError(
          "Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.",
        );
      } else {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.attemptsRemaining <= 2) {
          setPinError(
            `Invalid PIN - ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`,
          );
        } else {
          setPinError("Invalid wallet PIN");
        }
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Unable to verify PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  }, [auction.bidFee, payFee, pinInput, pinLocked]);

  const handleSetupPin = useCallback(async () => {
    if (
      !setupPin ||
      setupPin.length < 4 ||
      setupPin.length > 6 ||
      !/^\d+$/.test(setupPin)
    ) {
      setSetupError("PIN must be 4-6 digits");
      return;
    }
    if (setupPin !== setupConfirm) {
      setSetupError("PINs do not match");
      return;
    }

    setSetupLoading(true);
    setSetupError(null);
    try {
      await api.wallet.setPin(setupPin);
      setShowPinModal(false);
      setNeedsPinSetup(false);
      setLoading(true);
      try {
        await payFee(auction.bidFee, "AWASH");
      } finally {
        setLoading(false);
      }
    } catch {
      setSetupError("Failed to set wallet PIN. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  }, [auction.bidFee, payFee, setupConfirm, setupPin]);

  const SelectedIcon =
    paymentMethods.find((m) => m.id === selected)?.icon || ShieldCheck;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Place Bid & Pay
          </h1>
          <p className="text-sm font-medium text-neutral-500">
            Enter your bid amount and choose how to pay
          </p>
        </div>
      </div>

      {/* ── Fee Display ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 text-center shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">
          Service Fee
        </span>
        <p className="mt-2 font-display text-4xl font-extrabold text-gradient-gold tabular-nums">
          {formatCurrency(auction.bidFee)}
        </p>
        <span className="mt-2 inline-block text-xs font-medium text-neutral-500">
          for {auction.name}
        </span>
      </motion.div>

      <div className="rounded-2xl border border-awash-blue/15 bg-awash-blue/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-awash-blue/75">
              Bid amount required before payment
            </p>
            <p className="mt-1 text-sm font-medium text-neutral-600">
              Enter your bid amount to continue.
            </p>
          </div>
          {hasValidBid && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">
              Saved
            </span>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-white/85 p-4 shadow-[0_8px_24px_rgba(0,43,92,0.05)]">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Your bid amount
          </label>
          <div
            className={`mt-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-2 transition-all ${bidFlash ? "ring-2 ring-emerald-200 border-emerald-300" : ""}`}
          >
            <button
              type="button"
              onClick={() => adjustBid(-STEP)}
              disabled={bidAmount <= 1}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-neutral-50 text-awash-blue transition-colors hover:bg-awash-blue/5 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease bid amount"
            >
              <Minus className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <input
                value={bidStr}
                onChange={(e) => {
                  const clean = e.target.value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1")
                    .replace(/^(\d*\.?\d{0,2}).*/, "$1")
                    .slice(0, 13);
                  setBidStr(clean);
                  setBidError(null);
                }}
                onBlur={() => {
                  if (!bidStr) return;
                  const normalized = Number(bidStr);
                  if (normalized < 1) {
                    setBidError("Minimum bid is 1.00");
                    updateBid(1);
                    return;
                  }
                  updateBid(normalized);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    adjustBid(STEP);
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    adjustBid(-STEP);
                  }
                }}
                placeholder="0.00"
                className="w-full border-0 bg-transparent text-center font-display text-2xl font-extrabold tabular-nums text-foreground outline-none"
              />
              <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                {CURRENCY}
              </p>
            </div>
            <button
              type="button"
              onClick={() => adjustBid(STEP)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-neutral-50 text-awash-blue transition-colors hover:bg-awash-blue/5"
              aria-label="Increase bid amount"
            >
              <Plus className="size-4" />
            </button>
          </div>
          {bidError && (
            <p className="mt-2 text-xs font-semibold text-destructive">
              {bidError}
            </p>
          )}
          <p className="mt-2 text-[11px] font-medium text-neutral-500">
            Minimum bid is 1.00 {CURRENCY}. Amounts you've already bid are
            blocked before payment.
          </p>
        </div>
      </div>

      {hasValidBid && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700/80">
            Preview before payment
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Your bid</dt>
              <dd className="font-semibold text-awash-blue">
                {formatCurrency(bidAmount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Service fee (charged now)</dt>
              <dd className="font-semibold text-awash-blue">
                {formatCurrency(auction.bidFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-2">
              <dt className="text-neutral-500">Total charged today</dt>
              <dd className="font-semibold text-emerald-700">
                {formatCurrency(auction.bidFee)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] font-medium text-neutral-500">
            Your bid is saved and will be submitted automatically after payment
            confirmation.
          </p>
        </div>
      )}

      {/* ── Payment Method Selector ── */}
      <div>
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 text-left transition-all hover:bg-white hover:shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SelectedIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {paymentMethods.find((m) => m.id === selected)?.label}
              </p>
              <p className="text-xs text-neutral-500">Change payment method</p>
            </div>
          </div>
          {showMethods ? (
            <ChevronUp className="size-4 text-neutral-400" />
          ) : (
            <ChevronDown className="size-4 text-neutral-400" />
          )}
        </button>

        <AnimatePresence>
          {showMethods && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-2">
                {paymentMethods.map((method) => {
                  const isActive = selected === method.id;
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelected(method.id);
                        setShowMethods(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 ${
                        isActive
                          ? "bg-primary/10 ring-1 ring-primary shadow-sm"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl ${isActive ? method.iconBg : "bg-neutral-100 text-neutral-500"}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}
                        >
                          {method.label}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {method.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info ── */}
      {selected === "AWASH" && (
        <div className="rounded-2xl border border-awash-blue/20 bg-awash-blue/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-awash-blue">
                GuessX Wallet Balance
              </p>
              <p className="text-xs font-medium text-neutral-500">
                {formatCurrency(walletBalance)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-awash-blue border border-awash-blue/20">
              <Lock className="size-3" /> PIN required
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-2xl bg-awash-blue/5 backdrop-blur-sm border border-awash-blue/10 p-3.5">
        <Info className="mt-0.5 size-4 flex-shrink-0 text-awash-blue/60" />
        <p className="text-xs font-medium leading-relaxed text-foreground/70">
          The service fee is non-refundable and confirms your participation.
          Your saved bid will be submitted after payment confirmation.
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
        <ShieldCheck className="size-4 text-emerald-600" />
        Secured by {paymentMethods.find((m) => m.id === selected)?.label}
      </div>

      {authError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">{authError}</p>
        </div>
      )}

      {/* ── CTA ── */}
      {selected === "AWASH" && walletBalance < auction.bidFee && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">
            Insufficient wallet balance. Top up your wallet before paying with
            GuessX Mobile Wallet.
          </p>
        </div>
      )}

      <button
        onClick={handlePayClick}
        disabled={
          !hasValidBid ||
          loading ||
          checkingPin ||
          (selected === "AWASH" && walletBalance < auction.bidFee)
        }
        className="btn-primary animate-shine group"
      >
        {loading || checkingPin ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : (
          <Wallet className="size-[18px] group-hover:scale-110 transition-transform" />
        )}
        {loading
          ? "Processing..."
          : checkingPin
            ? "Checking wallet PIN status..."
            : `Proceed to Payment · ${formatCurrency(auction.bidFee)}`}
      </button>

      <AnimatePresence>
        {showAgreementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="w-full max-w-md rounded-3xl border border-border bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-bold text-awash-blue">
                    Confirm Your Bid
                  </h3>
                  <p className="mt-1 text-sm font-medium text-neutral-500">
                    Review your bid and the service fee before proceeding to
                    payment.
                  </p>
                </div>
                <button
                  onClick={() => setShowAgreementModal(false)}
                  className="rounded-full bg-neutral-100 p-2 text-neutral-500 hover:bg-neutral-200"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="rounded-3xl border border-border bg-neutral-50/80 p-5">
                <p className="text-sm font-medium text-neutral-500">
                  Your Bid Item:
                </p>
                <p className="mt-2 text-3xl font-extrabold text-primary">
                  {auction.name}
                </p>

                <div className="my-4 h-px bg-border" />

                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-neutral-500">
                    Your Bid Amount:
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(bidAmount)}
                  </p>
                </div>

                <div className="my-4 h-px bg-border" />

                <p className="text-sm font-medium text-neutral-500">
                  Bid Service Fee:
                </p>
                <p className="mt-2 text-2xl font-bold text-destructive">
                  {formatCurrency(auction.bidFee)} (Non-refundable)
                </p>

                <p className="mt-5 text-sm leading-7 text-neutral-600">
                  The bid service fee is non-refundable and is paid to
                  participate in the auction. The amount submitted as a bid is
                  not charged at the time of placing the bid. In this auction,
                  winners are determined based on the lowest unique bid
                  submitted among all participants. Only participants who win
                  the auction will be required to pay the amount of their
                  winning bid, in addition to the participation fee.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAgreementAccepted((value) => !value)}
                className="mt-4 flex w-full items-center gap-3 text-left"
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-md border ${agreementAccepted ? "border-primary bg-primary text-white" : "border-border bg-white text-transparent"}`}
                >
                  <ShieldCheck className="size-3.5" />
                </span>
                <span className="text-base font-medium text-foreground">
                  I agree to continue
                </span>
              </button>

              <button
                onClick={handleConfirmAgreement}
                disabled={!agreementAccepted}
                className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proceed to Payment · {formatCurrency(auction.bidFee)}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-awash-blue">
                  {needsPinSetup ? "Set Wallet PIN" : "Enter Wallet PIN"}
                </h3>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {needsPinSetup ? (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    Create a 4-6 digit PIN to secure your GuessX wallet payments.
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupPin}
                    onChange={(e) => setSetupPin(e.target.value)}
                    placeholder="New PIN"
                    className="input-full text-center tracking-[0.35em]"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    placeholder="Confirm PIN"
                    className="input-full text-center tracking-[0.35em]"
                  />
                  {setupError && (
                    <p className="text-center text-xs font-semibold text-destructive">
                      {setupError}
                    </p>
                  )}
                  <button
                    onClick={handleSetupPin}
                    disabled={setupLoading}
                    className="btn-primary w-full"
                  >
                    {setupLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Set PIN & Pay"
                    )}
                  </button>
                </div>
              ) : pinLocked ? (
                <div className="space-y-3 text-center">
                  <AlertTriangle className="mx-auto size-9 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">
                    PIN Locked
                  </p>
                  <p className="text-xs text-neutral-600">
                    Too many incorrect attempts. Try again in{" "}
                    {lockCountdown || "05:00s"}.
                  </p>
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="w-full rounded-xl border border-border bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-neutral-200"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600">
                    Enter your wallet PIN to confirm payment of{" "}
                    {formatCurrency(auction.bidFee)}.
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter PIN"
                    autoFocus
                    className="input-full text-center tracking-[0.35em]"
                  />
                  {pinError && (
                    <p className="text-center text-xs font-semibold text-destructive">
                      {pinError}
                    </p>
                  )}
                  {attemptsRemaining != null && attemptsRemaining <= 3 && (
                    <p className="text-center text-xs font-medium text-amber-600">
                      {attemptsRemaining} attempt
                      {attemptsRemaining !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                  <button
                    onClick={handleVerifyPin}
                    disabled={pinLoading || !pinInput.trim()}
                    className="btn-primary w-full"
                  >
                    {pinLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Confirm Payment"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDuplicateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-amber-700">
                  Duplicate Bid
                </h3>
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200/60 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-neutral-800">
                    You've already placed a bid of {formatCurrency(bidAmount)}{" "}
                    on this auction.
                  </p>
                  <p className="mt-1 text-xs font-medium text-neutral-600">
                    Please enter a different bid amount.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="btn-primary mt-4 w-full"
              >
                Change Bid Amount
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
