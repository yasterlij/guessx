import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Target,
  Minus,
  Plus,
  ArrowLeft,
  X,
  Info,
} from "lucide-react";
import { useApp } from "../AppContext";
import { toast } from "../store/toast.store";
import { useForm } from "../hooks/useForm";
import { placeBidSchema, type PlaceBidValues } from "../lib/validation";
import { CURRENCY, formatCurrency, formatETB } from "../mockDataV0";
import { api } from "../api";

export function PlaceBidScreen() {
  const {
    go,
    goBack,
    selectedId,
    submitBid,
    getAuction,
    authError,
    feePaid,
    pendingBidAmount,
    setPendingBidAmount,
    myBids,
    user,
  } = useApp();
  const auction = getAuction(selectedId);
  const [bidStr, setBidStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);
  const [bidFlash, setBidFlash] = useState(false);
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);
  const [duplicateAmount, setDuplicateAmount] = useState<number | null>(null);
  const [debouncedAmount, setDebouncedAmount] = useState(0);

  useEffect(() => {
    if (user?.role === "admin") {
      toast("Administrators are not allowed to participate in bidding.", "error");
      goBack();
    }
  }, [user?.role, toast, goBack]);

  const STEP = 0.01;

  const form = useForm<PlaceBidValues>(placeBidSchema, { amount: 0 });

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedAmount(form.values.amount),
      500,
    );
    return () => window.clearTimeout(id);
  }, [form.values.amount]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.bid
      .myBids(selectedId)
      .then((res) => {
        if (active) setServerBidAmounts(res.bids.map((b) => b.amount));
      })
      .catch((err) => {
        console.warn("Failed to fetch my existing bids for duplicate check:", err);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const hasPlacedBid = useCallback(
    (amount: number) =>
      myBids.some((b) => b.auctionId === selectedId && b.amount === amount) ||
      serverBidAmounts.some((a) => a === amount),
    [myBids, serverBidAmounts, selectedId],
  );

  const isDuplicate =
    debouncedAmount > 0 && hasPlacedBid(debouncedAmount);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const adjustAmount = useCallback(
    (delta: number) => {
      const current = form.values.amount;
      const next = Math.max(1, +(current + delta).toFixed(2));
      setBidStr(next.toFixed(2));
      form.handleChange("amount", next);
      setSubmitError(null);
      setBidFlash(true);
    },
    [form],
  );

  useEffect(() => {
    if (!bidFlash) return;
    const id = window.setTimeout(() => setBidFlash(false), 240);
    return () => window.clearTimeout(id);
  }, [bidFlash]);

  if (!auction) return null;

  const onSubmit = async (values: PlaceBidValues) => {
    if (hasPlacedBid(values.amount)) {
      setDuplicateAmount(values.amount);
      setShowDuplicateModal(true);
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      await submitBid(values.amount);
    } catch (e: unknown) {
      setSubmitError((e instanceof Error ? e.message : undefined) || "Bid submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      !auction ||
      !feePaid ||
      pendingBidAmount == null ||
      autoSubmittedRef.current
    )
      return;
    if (hasPlacedBid(pendingBidAmount)) {
      setBidStr(pendingBidAmount.toFixed(2));
      form.handleChange("amount", pendingBidAmount);
      setDuplicateAmount(pendingBidAmount);
      setShowDuplicateModal(true);
      setPendingBidAmount(null);
      return;
    }
    autoSubmittedRef.current = true;
    setBidStr(pendingBidAmount.toFixed(2));
    form.handleChange("amount", pendingBidAmount);
    setLoading(true);
    setSubmitError(null);
    submitBid(pendingBidAmount)
      .catch((e: any) => {
        autoSubmittedRef.current = false;
        setSubmitError(
          (e instanceof Error ? e.message : undefined) || "Bid submission failed. Please try again.",
        );
      })
      .finally(() => setLoading(false));
  }, [
    auction,
    feePaid,
    pendingBidAmount,
    submitBid,
    hasPlacedBid,
    form.handleChange,
  ]);

  const displayedDuplicateAmount = duplicateAmount ?? form.values.amount;

  const bidProgress = auction.maxBid
    ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1)
    : 0;
  const isUrgent = bidProgress > 0.8;

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
            Place Your Bid
          </h1>
          <p className="text-sm font-medium text-neutral-500">
            Choose the lowest unique amount to win
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/60 bg-white/90 p-4 shadow-[0_18px_48px_rgba(0,43,92,0.08)]">
        <div className="rounded-[1.5rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark p-4 text-white shadow-[0_16px_40px_rgba(0,43,92,0.18)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
              Ready to bid
            </span>
            <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/80">
              Code{" "}
              {auction.publicCode ||
                auction.productId ||
                auction.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <h2 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">
            {auction.name}
          </h2>
          {auction.specSummary && (
            <p className="mt-2 text-sm font-semibold text-white/85">
              {auction.specSummary}
            </p>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 p-3"
      >
        <CheckCircle2 className="size-[18px] shrink-0 text-emerald-600" />
        <p className="text-xs font-semibold text-emerald-700">
          Bid fee paid. You're in the auction for {auction.name}!
        </p>
      </motion.div>

      {feePaid && pendingBidAmount != null && (
        <div className="rounded-xl border border-awash-blue/10 bg-awash-blue/5 px-4 py-3 text-sm font-semibold text-awash-blue">
          Saved bid {formatCurrency(pendingBidAmount)} detected. Submitting
          automatically after payment.
        </div>
      )}

      {/* ── Bid Progress ── */}
      {auction.maxBid && (
        <div className="rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm p-3 shadow-[0_8px_24px_rgba(0,43,92,0.05)]">
          <div className="mb-2 flex justify-between">
            <span className="text-[10px] font-semibold text-neutral-400">
              Total bids: {auction.totalBids || auction.bidders}
            </span>
            <span className="text-[10px] font-semibold text-neutral-400">
              Capacity: {auction.maxBid}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bidProgress * 100}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: isUrgent ? "#F27A18" : "#10B981" }}
            />
          </div>
        </div>
      )}

      {/* ── Bid Amount Section ── */}
      <div className="text-center">
        <h2 className="font-display text-lg font-extrabold text-foreground">
          Enter your bid amount
        </h2>
        <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-neutral-500">
          Your bid must be a unique lowest amount to win.
        </p>
      </div>

      {/* ── Bid Input Card ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-5 shadow-[0_4px_20px_rgba(200,166,66,0.06)]">
        <div
          className={`flex items-end justify-center gap-2 rounded-2xl p-1 transition-all ${bidFlash ? "bg-emerald-50/80 ring-2 ring-emerald-200" : ""}`}
        >
          <button
            type="button"
            onClick={() => adjustAmount(-STEP)}
            disabled={form.values.amount <= 1}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-primary/20 bg-white/80 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease bid amount"
          >
            <Minus className="size-5" />
          </button>

          <div className="relative">
            <input
              value={bidStr}
              onChange={(e) => {
                const raw = e.target.value;
                const clean = raw
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1")
                  .replace(/^(\d*\.?\d{0,2}).*/, "$1")
                  .slice(0, 13);
                setBidStr(clean);
                form.handleChange("amount", clean ? +clean : 0);
                setSubmitError(null);
              }}
              onBlur={() => {
                const num = form.values.amount;
                if (num < 1) {
                  form.handleChange("amount", 1);
                  setBidStr("1.00");
                  setSubmitError("Minimum bid is 1.00");
                  return;
                }
                setBidStr(num > 0 ? num.toFixed(2) : "");
                form.handleBlur("amount");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") form.handleSubmit(onSubmit);
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  adjustAmount(STEP);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  adjustAmount(-STEP);
                }
              }}
              aria-label="Bid amount"
              placeholder="0.00"
              className={`w-40 rounded-xl border-2 bg-white/80 px-3 py-3 text-center font-display text-4xl font-extrabold text-foreground outline-none transition-all focus:ring-2 tabular-nums ${
                isDuplicate
                  ? "border-amber-400 focus:border-amber-400 focus:ring-amber-400/20"
                  : form.errors.amount && form.touched.amount
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-primary/20 focus:border-primary focus:ring-primary/20"
              }`}
            />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-neutral-400">
              {CURRENCY}
            </span>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-100 border border-amber-200/50 px-1.5 py-[1px] text-[9px] font-bold text-amber-700">
              Min 1.00
            </span>
          </div>

          <button
            type="button"
            onClick={() => adjustAmount(STEP)}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-primary/20 bg-white/80 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-90"
            aria-label="Increase bid amount"
          >
            <Plus className="size-5" />
          </button>
        </div>

        <AnimatePresence>
          {form.errors.amount && form.touched.amount && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-destructive"
            >
              <AlertCircle className="size-3" />
              {form.errors.amount}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDuplicate && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-600"
            >
              <Info className="size-3" />
              You've already bid {formatCurrency(form.values.amount)} — pick a different amount.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 px-3 py-2">
          <TrendingDown className="size-4 text-primary" />
          <span className="text-xs font-semibold text-awash-gold-dark">
            Lower & unique = better chance to win
          </span>
        </div>

        {/* ── Bid Preview ── */}
        <AnimatePresence>
          {form.values.amount > 0 && !form.errors.amount && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 flex items-center justify-between rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-awash-gold/10 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Target className="size-3.5" />
                Your bid
              </span>
              <span className="font-display text-lg font-extrabold text-gradient-gold tabular-nums">
                {formatCurrency(form.values.amount)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── How It Works ── */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-awash-blue/5 backdrop-blur-sm border border-awash-blue/10 p-3.5">
        <Sparkles className="mt-0.5 size-[18px] shrink-0 text-primary" />
        <p className="text-xs font-medium leading-relaxed text-foreground/80">
          The winner is the person with the{" "}
          <span className="font-bold text-awash-gold-dark">
            lowest bid that nobody else picked
          </span>
          . Choose an unexpected amount!
        </p>
      </div>

      {/* ── Bid Participation Limit ── */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/60 p-3.5">
        <Info className="mt-0.5 size-[18px] shrink-0 text-amber-600" />
        <p className="text-xs font-medium leading-relaxed text-neutral-700">
          Limited Auction Bid Participation — To ensure fair play and prevent
          monopolization, each participant is limited to a maximum of{" "}
          <span className="font-bold">150 bids</span> within a single auction.
          This promotes broader participation and a more dynamic bidding
          environment.
        </p>
      </div>

      {/* ── Errors ── */}
      <AnimatePresence>
        {(submitError || authError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3"
          >
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <p className="text-xs font-semibold text-destructive">
              {submitError || authError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit ── */}
      <button
        disabled={loading || !form.isValid || isDuplicate}
        onClick={() => form.handleSubmit(onSubmit)}
        className="btn-primary animate-shine group"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit Bid Amount"
        )}
      </button>

      <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-400">
        Terms and conditions will apply
      </p>

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
                    You've already placed a bid of{" "}
                    {formatCurrency(displayedDuplicateAmount)} on this auction.
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
