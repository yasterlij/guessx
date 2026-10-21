import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  TrendingDown,
  ZoomIn,
  Bell,
  ArrowLeft,
  Heart,
  ShieldCheck,
  Wallet,
  Loader2,
  Minus,
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertTriangle,
  ShieldAlert,
  X,
} from "lucide-react";
import { useApp } from "../AppContext";
import { toast } from "../store/toast.store";
import { Badge } from "../components/AuctionUI";
import { useCountdown } from "../components/Countdown";
import {
  CURRENCY,
  formatCountdown,
  formatCurrency,
  getSpecEntries,
} from "../mockDataV0";
import { ImageCarousel } from "../components/ImageCarousel";
import { api } from "../api";
import { ProductHeroSection } from "../components/ProductHeroSection";
import { ProductPurchasePanel } from "../components/ProductPurchasePanel";
import { useProductBidPayment } from "../hooks/useProductBidPayment";

function Lightbox({
  images,
  idx,
  onClose,
}: {
  images: string[];
  idx: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(idx);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        setCurrent((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-scale-in">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <ZoomIn className="size-6 rotate-45" />
      </button>
      <div className="flex h-full w-full items-center justify-center">
        <ImageCarousel
          images={images}
          alt=""
          aspectRatio="h-full w-full"
          autoPlayInterval={0}
          showThumbnails
        />
      </div>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`size-2 rounded-full transition-all ${i === current % images.length ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-white/40 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProductScreen() {
  const {
    go,
    goBack,
    selectedId,
    getAuction,
    isFavorite,
    toggleFavorite,
    payFee,
    authError,
    setPaymentMethod,
    walletBalance,
    pendingBidAmount,
    setPendingBidAmount,
    myBids,
    user,
  } = useApp();
  const auction = getAuction(selectedId);
  const seconds = useCountdown(auction?.timeLeft ?? 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);

  const {
    loadingMethod,
    checkingPin,
    showPinModal,
    setShowPinModal,
    showPaymentMethods,
    setShowPaymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    pinLoading,
    attemptsRemaining,
    pinLocked,
    lockCountdown,
    needsPinSetup,
    setupPin,
    setSetupPin,
    setupConfirm,
    setSetupConfirm,
    setupError,
    setSetupError,
    setupLoading,
    bidStr,
    setBidStr,
    bidError,
    setBidError,
    bidFlash,
    showDuplicateModal,
    setShowDuplicateModal,
    bidAmount,
    hasValidBid,
    updateBid,
    adjustBid,
    handlePayment,
    handleVerifyPin,
    handleSetupPin,
  } = useProductBidPayment({
    bidFee: auction?.bidFee ?? 1,
    pendingBidAmount,
    payFee,
    setPaymentMethod,
    setPendingBidAmount,
    walletBalance,
    isAdmin: user?.role === "admin",
  });

  if (!auction) return null;

  const isDuplicate =
    bidAmount > 0 &&
    (myBids.some((b) => b.auctionId === selectedId && b.amount === bidAmount) ||
      serverBidAmounts.some((amount) => amount === bidAmount));

  const images = auction.images || [];
  const isEnding = seconds > 0 && seconds < 3600;
  const isOver = seconds <= 0;
  const auctionCode =
    auction.publicCode ||
    auction.productId ||
    auction.id.slice(0, 6).toUpperCase();
  const countdown = formatCountdown(seconds);
  const specEntries = getSpecEntries(auction.specs);
  const favorite = isFavorite(auction.id);

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
    if (isDuplicate) setShowDuplicateModal(true);
  }, [isDuplicate]);

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<"AWASH" | null>(null);

  const handleOpenPaymentConfirmation = useCallback(
    (method: "AWASH") => {
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
      setPendingPaymentMethod(method);
      setAgreementAccepted(false);
      setShowAgreementModal(true);
    },
    [hasValidBid, isDuplicate, setBidError, setShowDuplicateModal, toast, user?.role],
  );

  const handleConfirmPayment = useCallback(() => {
    if (!pendingPaymentMethod || !agreementAccepted) return;
    setShowAgreementModal(false);
    handlePayment(pendingPaymentMethod, isDuplicate);
  }, [agreementAccepted, handlePayment, isDuplicate, pendingPaymentMethod]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Back + Title ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => goBack()}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {auction.name}
          </h1>
          <p className="text-sm font-medium text-neutral-500">
            {auction.category}
          </p>
          {auction.specSummary && (
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              {auction.specSummary}
            </p>
          )}
        </div>
        <button
          onClick={() => toggleFavorite(auction.id)}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          className={`flex size-10 items-center justify-center rounded-xl border transition-all shadow-sm hover:-translate-y-0.5 active:scale-[0.97] ${favorite ? "border-red-200 bg-red-50 text-red-500" : "border-border/60 bg-white/80 text-neutral-500 hover:bg-white hover:text-red-500"}`}
        >
          <Heart className={`size-5 ${favorite ? "fill-current" : ""}`} />
        </button>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          idx={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="flex flex-col gap-6">
        <ProductHeroSection
          auction={auction}
          images={images}
          auctionCode={auctionCode}
          countdown={countdown}
          isEnding={isEnding}
          isOver={isOver}
          specEntries={specEntries}
          showSpecs={showSpecs}
          onToggleSpecs={() => setShowSpecs((value) => !value)}
          onOpenLightbox={(index) => {
            setLightboxIdx(index);
            setLightboxOpen(true);
          }}
        />

        {user?.role === "admin" && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-800 shadow-sm backdrop-blur-sm">
            <ShieldAlert className="size-5 flex-shrink-0 text-red-600" />
            <div className="text-sm font-semibold">
              Administrators are not allowed to participate in bidding.
            </div>
          </div>
        )}

        <ProductPurchasePanel
          bidValue={bidStr}
          bidFlash={bidFlash}
          bidError={bidError}
          onBidChange={(value) => {
            const clean = value
              .replace(/[^0-9.]/g, "")
              .replace(/(\..*)\./g, "$1")
              .replace(/^(\d*\.?\d{0,2}).*/, "$1")
              .slice(0, 13);
            if (clean && Number(clean) < 1) return;
            setBidStr(clean);
            setBidError(null);
          }}
          onBidBlur={() => {
            if (!bidStr) return;
            const normalized = Number(bidStr);
            if (normalized < 1) {
              setBidError("Minimum bid is 1.00");
              updateBid(1);
              return;
            }
            updateBid(normalized);
          }}
          onBidKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              adjustBid(0.01);
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              adjustBid(-0.01);
            }
          }}
          onDecrease={() => adjustBid(-0.01)}
          onIncrease={() => adjustBid(0.01)}
          selectedPaymentMethod={selectedPaymentMethod}
          showPaymentMethods={showPaymentMethods}
          onTogglePaymentMethods={() =>
            setShowPaymentMethods((value) => !value)
          }
          onSelectPaymentMethod={(method) => {
            setSelectedPaymentMethod(method);
            setShowPaymentMethods(false);
          }}
          loadingMethod={loadingMethod}
          checkingPin={checkingPin}
          walletBalance={walletBalance}
          bidFee={auction.bidFee}
          hasValidBid={hasValidBid}
          authError={authError}
          isEnding={isEnding}
          isAdmin={user?.role === "admin"}
          onSubmit={handleOpenPaymentConfirmation}
        />

        <div>
          <div className="flex flex-col gap-4">
            {auction.maxBid && (
              <div className="rounded-2xl border border-border/60 bg-white/80 p-4 shadow-[0_8px_32px_rgba(0,43,92,0.06)]">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-neutral-400">
                    Bid Progress
                  </span>
                  <span className="text-xs font-semibold text-neutral-400">
                    {auction.totalBids || auction.bidders}/{auction.maxBid}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) * 100}%`,
                      backgroundColor:
                        (auction.totalBids || auction.bidders) /
                          auction.maxBid >
                        0.8
                          ? "#C8A642"
                          : "#10B981",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Extension Risk */}
            {auction.minBid != null &&
              (auction.totalBids || auction.bidders) < auction.minBid && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 animate-slide-up">
                  <Bell className="size-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-800">
                    Only {auction.totalBids || auction.bidders}/{auction.minBid}{" "}
                    bids — auction may extend
                  </p>
                </div>
              )}

            {/* Highlights */}
            {auction.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {auction.highlights.map((h) => (
                  <div
                    key={h}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-all hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="flex items-start gap-2.5 rounded-xl bg-awash-blue/5 backdrop-blur-sm p-3.5 border border-awash-blue/10 transition-all hover:bg-awash-blue/10">
              <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-awash-gold" />
              <p className="text-xs font-medium leading-relaxed text-foreground/80">
                Place the{" "}
                <span className="font-bold text-awash-gold-dark">
                  lowest unique bid
                </span>{" "}
                — the smallest amount that no one else has chosen — to win.
              </p>
            </div>

            <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Terms and conditions will apply
            </p>
          </div>
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
            <h3 className="font-display text-xl font-extrabold text-foreground">
              {needsPinSetup ? "Set Wallet PIN" : "Confirm Wallet PIN"}
            </h3>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              {needsPinSetup
                ? "Create a 4-6 digit PIN to secure your wallet payment."
                : `Pay ${formatCurrency(auction.bidFee)} from your GuessX Wallet.`}
            </p>

            {needsPinSetup ? (
              <div className="mt-5 space-y-3">
                <input
                  value={setupPin}
                  onChange={(e) => {
                    setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Create PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                <input
                  value={setupConfirm}
                  onChange={(e) => {
                    setSetupConfirm(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    );
                    setSetupError(null);
                  }}
                  placeholder="Confirm PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                {setupError ? (
                  <p className="text-xs font-semibold text-destructive">
                    {setupError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetupPin}
                    disabled={setupLoading}
                    className="btn-primary flex-1"
                  >
                    {setupLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Set PIN & Pay"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <input
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Enter wallet PIN"
                  inputMode="numeric"
                  type="password"
                  className="input-full"
                />
                {pinLocked ? (
                  <p className="text-xs font-semibold text-destructive">
                    Wallet PIN locked. {lockCountdown || "Try again later."}
                  </p>
                ) : null}
                {!pinLocked && attemptsRemaining != null ? (
                  <p className="text-xs font-medium text-neutral-500">
                    Attempts remaining: {attemptsRemaining}
                  </p>
                ) : null}
                {pinError ? (
                  <p className="text-xs font-semibold text-destructive">
                    {pinError}
                  </p>
                ) : null}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPinModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPin}
                    disabled={pinLoading || pinLocked}
                    className="btn-primary flex-1"
                  >
                    {pinLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Pay with Wallet"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl">
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
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  You've already placed a bid of {formatCurrency(bidAmount)} on
                  this auction.
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
          </div>
        </div>
      )}

      {showAgreementModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-awash-blue">
                  Confirm Your Bid
                </h3>
                <p className="mt-1 text-sm font-medium text-neutral-500">
                  Review your bid and the service fee before proceeding to payment.
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
              <p className="text-sm font-medium text-neutral-500">Your Bid Item:</p>
              <p className="mt-2 text-3xl font-extrabold text-primary">{auction.name}</p>

              <div className="my-4 h-px bg-border" />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-neutral-500">Your Bid Amount:</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(bidAmount)}</p>
              </div>

              <div className="my-4 h-px bg-border" />

              <p className="text-sm font-medium text-neutral-500">Bid Service Fee:</p>
              <p className="mt-2 text-2xl font-bold text-destructive">
                {formatCurrency(auction.bidFee)} (Non-refundable)
              </p>

              <p className="mt-5 text-sm leading-7 text-neutral-600">
                The bid service fee is non-refundable and is paid to participate in the auction.
                The amount submitted as a bid is not charged at the time of placing the bid. In
                this auction, winners are determined based on the lowest unique bid submitted
                among all participants. Only participants who win the auction will be required to
                pay the amount of their winning bid, in addition to the participation fee.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAgreementAccepted((v) => !v)}
              className="mt-4 flex w-full items-center gap-3 text-left"
            >
              <span
                className={`flex size-6 items-center justify-center rounded-md border ${agreementAccepted ? "border-primary bg-primary text-white" : "border-border bg-white text-transparent"}`}
              >
                <ShieldCheck className="size-3.5" />
              </span>
              <span className="text-base font-medium text-foreground">I agree to continue</span>
            </button>

            <button
              onClick={handleConfirmPayment}
              disabled={!agreementAccepted}
              className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proceed to Payment · {formatCurrency(auction.bidFee)}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
