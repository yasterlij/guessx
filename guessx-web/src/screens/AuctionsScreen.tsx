import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  TicketCheck,
  ShieldCheck,
  Trophy,
  Sparkles,
  PiggyBank,
  RefreshCw,
  Gavel,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  LayoutGrid,
  Filter,
  ArrowLeft,
  TrendingDown,
  Users,
  Eye,
  Star,
  Tag,
  Minus,
  Plus,
  Shield,
  CheckCircle2,
  Loader2,
  X,
  Wallet,
  Lock,
  Clock,
  Copy,
} from "lucide-react";
import { useApp, type PlacedBid } from "../AppContext";
import { Badge } from "../components/AuctionUI";
import { useCountdown } from "../components/Countdown";
import { api, getUserFriendlyMessage } from "../api";
import { toast } from "../store/toast.store";
import { buildAuctionCategoryOptions } from "../lib/auctionCategories";
import { CATEGORY_ICONS } from "../components/CategoriesNavDropdown";
import {
  CURRENCY,
  formatCurrency,
  formatETB,
  formatCountdown,
  type Auction,
} from "../mockDataV0";

const sessionViewedAuctions = new Set<string>();

import { SmartImage } from "../components/SmartImage";

function AuctionImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
    />
  );
}

function GavelSoundblockIcon({
  className = "size-6",
  color = "#16A34A",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="19" width="13" height="3" rx="1.5" fill={color} />
      <rect
        x="4.2"
        y="8.2"
        width="9"
        height="5.2"
        rx="1.4"
        transform="rotate(-45 4.2 8.2)"
        fill={color}
      />
      <rect
        x="10.8"
        y="8"
        width="2.6"
        height="12"
        rx="1.3"
        transform="rotate(45 10.8 8)"
        fill={color}
      />
    </svg>
  );
}

function SolidPriceTagIcon({
  className = "size-6",
  color = "#F97316",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.6 9.4L9.4 4.6a1.5 1.5 0 0 1 2.12 0l8.48 8.48a1.5 1.5 0 0 1 0 2.12l-4.24 4.24a1.5 1.5 0 0 1-2.12 0L5.16 11A1.5 1.5 0 0 1 4.6 9.4zM8.5 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"
        fill={color}
      />
    </svg>
  );
}

function TimePill({
  seconds,
  endingSoon,
}: {
  seconds: number;
  endingSoon: boolean;
}) {
  const t = useCountdown(seconds);
  const { d, h, m, s } = formatCountdown(t);
  const urgent = endingSoon || (t > 0 && t < 3600);
  return (
    <span
      className={`countdown-pill ${
        urgent
          ? "bg-awash-gold/90 text-white border border-awash-gold/50"
          : "bg-black/55 backdrop-blur-sm text-white border border-white/10"
      }`}
    >
      {d !== "00" && <>{parseInt(d)}d </>}
      {h}:{m}:{s}
    </span>
  );
}

export type PriorityBadgeConfig = {
  label: string;
  icon?: "flame" | "trophy" | "sparkles" | "clock";
  color?: "ember" | "primary" | "emerald" | "blue";
};

export function AuctionCard({
  auction,
  onOpen,
  index = 0,
  variant = "default",
  priorityBadge,
  className = "",
  onFocusChange,
  onInteraction,
}: {
  auction: Auction;
  onOpen?: () => void;
  index?: number;
  variant?: "default" | "glass" | "hero";
  priorityBadge?: PriorityBadgeConfig;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
  onInteraction?: () => void;
}) {
  const {
    isFavorite,
    toggleFavorite,
    user,
    walletBalance,
    refreshWallet,
    refreshAuctions,
    myBids,
    go,
    recordSuccessfulBid,
  } = useApp();
  const [internalFav, setInternalFav] = useState(false);
  const isFav = isFavorite ? isFavorite(auction.id) : internalFav;

  const [amountStr, setAmountStr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Bid confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Wallet PIN payment modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [pinLocked, setPinLocked] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  useEffect(() => {
    if (showConfirmModal || showPinModal || (amountStr && amountStr.trim() !== "")) {
      onFocusChange?.(true);
      onInteraction?.();
    }
  }, [showConfirmModal, showPinModal, amountStr, onFocusChange, onInteraction]);

  useEffect(() => {
    const isModalOpen = showConfirmModal || showPinModal;
    if (isModalOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (!loading && !pinLoading) {
            setShowConfirmModal(false);
            setShowPinModal(false);
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showConfirmModal, showPinModal, loading, pinLoading]);

  const t = useCountdown(auction.timeLeft);
  const { d, h, m, s } = formatCountdown(t);
  const formattedCountdown = `${parseInt(d) || 0}d : ${h}h : ${m}m : ${s}s`;

  const rawCodeStr = String(auction.publicCode ?? auction.productId ?? auction.id ?? "LIVE");
  const cleanCode = rawCodeStr.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const shortCode = cleanCode.length > 8
    ? `GX-${cleanCode.slice(0, 6)}`
    : cleanCode || "GX-LIVE";
  const publicCode = shortCode;

  const minBid = 1;
  const bidStep = 0.01;

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggleFavorite) {
      toggleFavorite(auction.id);
    } else {
      setInternalFav((v) => !v);
    }
  };

  const handleStep = (direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineError(null);
    const current = parseFloat(amountStr || "0");
    if (direction === "up") {
      const next =
        current <= 0 ? minBid : Number((current + bidStep).toFixed(2));
      setAmountStr(next.toFixed(2));
    } else {
      if (current <= minBid) {
        setAmountStr("");
      } else {
        const next = Math.max(minBid, Number((current - bidStep).toFixed(2)));
        setAmountStr(next.toFixed(2));
      }
    }
  };

  const handleBidSuccess = (amount: number, ticket?: string) => {
    setTicketNumber(ticket || null);
    setSubmittedSuccess(true);
    setPendingAmount(null);
    setInlineError(null);
    setAmountStr("");
    recordSuccessfulBid(auction.id, amount, ticket);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setTicketNumber(null);
    }, 4500);
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let val = parseFloat(amountStr || "0");
    if (!amountStr || isNaN(val) || val < minBid) {
      setAmountStr(minBid.toFixed(2));
      setInlineError(
        `Bid set to minimum ${minBid.toFixed(2)} Br. Tap submit to confirm.`
      );
      return;
    }

    if (!user) {
      setInlineError("Please sign in to place a bid.");
      go("login");
      return;
    }

    if (user.role === "admin") {
      setInlineError("Administrators are not allowed to participate in bidding.");
      return;
    }

    const isDuplicate = myBids.some(
      (b) => b.auctionId === auction.id && b.amount === val
    );
    if (isDuplicate) {
      setInlineError(`You have already placed a bid of ${val.toFixed(2)} Br on this auction.`);
      return;
    }

    setInlineError(null);
    setPendingAmount(val);
    setAgreementAccepted(false);
    setShowConfirmModal(true);
  };

  const handleProceedFromConfirmation = async () => {
    if (pendingAmount == null || !agreementAccepted) return;
    setShowConfirmModal(false);
    setLoading(true);

    try {
      const fee = Number(auction.bidFee ?? 1);
      if (walletBalance < fee) {
        setInlineError(`Insufficient wallet balance (${walletBalance.toFixed(2)} Br). Service fee is ${fee.toFixed(2)} Br.`);
        setLoading(false);
        return;
      }

      const pinStatus = await api.wallet.pinStatus();
      setPinLocked(pinStatus.locked);
      setAttemptsRemaining(pinStatus.locked ? 0 : pinStatus.attemptsRemaining);
      setNeedsPinSetup(!pinStatus.hasPin);
      setPinInput("");
      setPinError(null);
      setShowPinModal(true);
    } catch (err: any) {
      const msg = getUserFriendlyMessage(err) || "Failed to process bid. Please try again.";
      setInlineError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWalletPayment = async () => {
    if (pendingAmount == null) return;
    const fee = Number(auction.bidFee ?? 1);

    if (needsPinSetup) {
      if (!setupPin || setupPin.length < 4 || setupPin.length > 6 || !/^\d+$/.test(setupPin)) {
        setPinError("PIN must be 4-6 digits");
        return;
      }
      if (setupPin !== setupConfirm) {
        setPinError("PINs do not match");
        return;
      }
      setPinLoading(true);
      setPinError(null);
      try {
        await api.wallet.setPin(setupPin);
        setNeedsPinSetup(false);
      } catch (err: any) {
        setPinError(getUserFriendlyMessage(err) || "Failed to set wallet PIN");
        setPinLoading(false);
        return;
      }
    } else {
      if (!pinInput || pinInput.length < 4) {
        setPinError("Please enter your 4-digit wallet PIN");
        return;
      }
    }

    setPinLoading(true);
    setPinError(null);

    try {
      const pinToVerify = needsPinSetup ? setupPin : pinInput;
      const verifyRes = await api.wallet.verifyPin(pinToVerify);

      if (!verifyRes.valid) {
        if (verifyRes.locked) {
          setPinLocked(true);
          setPinError("PIN locked due to too many failed attempts. Please try again later.");
        } else {
          setAttemptsRemaining(verifyRes.attemptsRemaining);
          setPinError(
            verifyRes.attemptsRemaining <= 2
              ? `Invalid PIN - ${verifyRes.attemptsRemaining} attempt${verifyRes.attemptsRemaining !== 1 ? "s" : ""} remaining`
              : "Invalid wallet PIN"
          );
        }
        setPinLoading(false);
        return;
      }

      await api.payBidFeeWithWallet(auction.id);
      await refreshWallet();

      const bidRes = await api.bid.place(auction.id, pendingAmount);

      setShowPinModal(false);
      handleBidSuccess(pendingAmount, bidRes.ticket_number);
    } catch (err: any) {
      setPinError(getUserFriendlyMessage(err) || "Payment or bidding failed. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    if (auction?.id && !sessionViewedAuctions.has(auction.id)) {
      sessionViewedAuctions.add(auction.id);
      (api as any)?.recordAuctionView?.(auction.id)?.catch?.(() => {});
    }
  }, [auction?.id]);

  const handleOpenCard = () => {
    if (auction?.id) {
      (api as any)?.recordAuctionView?.(auction.id)?.catch?.(() => {});
    }
    onOpen?.();
  };

  const formattedFee =
    auction.bidFee != null
      ? `${Number(auction.bidFee).toFixed(2)} Br`
      : "75.00 Br";
  const formattedBids = `${auction.totalBids || 0} Bids`;
  const views = (auction as any).views ?? 0;
  const formattedViews =
    views >= 1000000
      ? `${(views / 1000000).toFixed(1)}M`
      : views >= 1000
        ? `${(views / 1000).toFixed(1)}K`
        : String(views);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: index * 0.04,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`mx-auto w-full max-w-[390px] rounded-3xl overflow-hidden text-left flex flex-col transition-all duration-300 group/card ${
          variant === "glass" || variant === "hero"
            ? "bg-white/95 backdrop-blur-xl border border-neutral-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)] hover:shadow-[0_22px_48px_rgba(245,158,11,0.18)] hover:border-amber-400/60 hover:-translate-y-1.5 transition-all duration-300"
            : "border border-neutral-200/80 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_16px_40px_rgba(245,158,11,0.14)] hover:border-amber-400/50 hover:-translate-y-1 transition-all duration-300"
        } ${className}`}
      >
        {/* Full-width Product Image with Overlaid Badges */}
        <div
          onClick={handleOpenCard}
          className="group relative flex h-[210px] sm:h-[225px] w-full cursor-pointer items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-200/40 to-neutral-100 transition-colors"
        >
          <AuctionImage src={auction.images?.[0]} alt={auction.name} />

          {/* Overlaid Badges on Image */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Live / Status Badge with visible background */}
              {auction.status === "live" || auction.status === "ending-soon" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-lg border border-white/25">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                  <span className="tracking-wide uppercase text-[11px]">Live</span>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-full bg-neutral-900/85 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-lg border border-white/20">
                  <span className="tracking-wide uppercase text-[11px]">Closed</span>
                </div>
              )}

              {priorityBadge && (
                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md border border-white/30 text-white ${
                    priorityBadge.color === "ember"
                      ? "bg-gradient-to-r from-red-600 to-amber-600"
                      : priorityBadge.color === "primary"
                      ? "bg-gradient-to-r from-amber-600 to-yellow-600"
                      : priorityBadge.color === "blue"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                      : "bg-emerald-600/95"
                  }`}
                >
                  {priorityBadge.icon === "flame" && <Flame className="size-3 text-yellow-200 animate-pulse" />}
                  {priorityBadge.icon === "trophy" && <Trophy className="size-3 text-yellow-200" />}
                  {priorityBadge.icon === "sparkles" && <Sparkles className="size-3 text-yellow-200" />}
                  {priorityBadge.icon === "clock" && <Clock className="size-3 text-white" />}
                  <span className="tracking-wide uppercase text-[10px]">{priorityBadge.label}</span>
                </div>
              )}
            </div>

            {/* View count with visible dark/glass background */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-lg border border-white/25 shrink-0">
              <Eye className="size-3.5 text-awash-gold" />
              <span className="tabular-nums">{formattedViews}</span>
            </div>
          </div>

          {/* Favorite button */}
          <button
            type="button"
            onClick={handleToggleFav}
            aria-label="Favorite"
            className="absolute bottom-3 right-3 z-10 flex size-9 items-center justify-center rounded-full border border-awash-gold/30 bg-white/95 backdrop-blur-sm shadow-md transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`size-4 transition-colors ${
                isFav ? "fill-awash-gold text-awash-gold" : "text-awash-gold"
              }`}
            />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4 pt-3.5 flex flex-col flex-1">
          <h3
            onClick={handleOpenCard}
            className="mb-1 cursor-pointer truncate font-display text-[17px] font-bold text-awash-blue transition-colors hover:text-awash-gold-dark"
          >
            {auction.name}
          </h3>

        <div className="w-full my-3">
          <svg height="4" width="100%" className="w-full">
            <line
              x1="0"
              y1="2"
              x2="100%"
              y2="2"
              stroke="#E5E7EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1 7"
            />
          </svg>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex flex-1 items-center gap-2.5">
            <GavelSoundblockIcon className="size-6 shrink-0" color="#16A34A" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                Bid Fee
              </span>
              <span className="text-sm font-bold text-awash-blue">
                {formattedFee}
              </span>
            </div>
          </div>

          <div className="mx-3 h-8 w-px bg-border/80" />

          <div className="flex flex-1 items-center gap-2.5">
            <SolidPriceTagIcon className="size-6 shrink-0" color="#F97316" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA580C]">
                Auction Code
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(publicCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="group/code flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-amber-600 transition-colors cursor-pointer text-left"
                title="Click to copy code"
              >
                <span className="font-mono tracking-tight">{publicCode}</span>
                {copiedCode ? (
                  <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                    Copied!
                  </span>
                ) : (
                  <Copy className="size-3 text-neutral-400 group-hover/code:text-amber-600 transition-colors shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full my-3">
          <svg height="4" width="100%" className="w-full">
            <line
              x1="0"
              y1="2"
              x2="100%"
              y2="2"
              stroke="#E5E7EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1 7"
            />
          </svg>
        </div>

        <div className="mb-3 flex items-center justify-between px-0.5">
          <span className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white tabular-nums border border-slate-800 shadow-xs">
            {formattedCountdown}
          </span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-px bg-neutral-300" />
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/50">
              {formattedBids}
            </span>
          </div>
        </div>

        <div className="mb-3 flex h-11 items-center justify-between rounded-full bg-neutral-100/90 px-1.5 border border-neutral-200/80 shadow-inner focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
          <button
            type="button"
            onClick={(e) => handleStep("down", e)}
            disabled={!amountStr}
            aria-label="Decrease bid amount"
            className={`flex size-8 items-center justify-center rounded-full bg-white shadow-xs border border-neutral-200/60 transition-all active:scale-90 cursor-pointer ${
              !amountStr
                ? "opacity-40 cursor-not-allowed text-neutral-400"
                : "text-slate-700 hover:bg-neutral-50 hover:text-slate-900"
            }`}
          >
            <Minus className="size-3.5 stroke-[2.5]" />
          </button>

          <div className="flex flex-1 justify-center px-2">
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9.]/g, "");
                setAmountStr(clean);
              }}
              onFocus={() => onFocusChange?.(true)}
              onBlur={() => onFocusChange?.(false)}
              placeholder="Bid amount"
              className="w-full bg-transparent text-center text-sm font-extrabold text-slate-900 placeholder:text-neutral-400 placeholder:font-normal focus:outline-none tabular-nums"
            />
          </div>

          <button
            type="button"
            onClick={(e) => handleStep("up", e)}
            aria-label="Increase bid amount"
            className="flex size-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-xs border border-neutral-200/60 transition-all hover:bg-neutral-50 hover:text-slate-900 active:scale-90 cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
          </button>
        </div>

        {inlineError && (
          <div className="mb-2.5 rounded-xl border border-amber-200 bg-amber-50/95 p-2.5 text-center text-xs">
            <p className="font-semibold text-amber-900 leading-snug">{inlineError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 py-3.5 text-center text-sm font-extrabold text-white shadow-[0_4px_18px_rgba(217,119,6,0.32)] hover:shadow-[0_8px_25px_rgba(217,119,6,0.45)] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
            loading ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-awash-blue" />
              <span>Checking...</span>
            </span>
          ) : submittedSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-awash-blue">
              <CheckCircle2 className="size-4 text-emerald-700" />
              <span>Bid Placed! {ticketNumber ? `(#${ticketNumber})` : ""}</span>
            </span>
          ) : (
            "Submit a Bid Amount"
          )}
        </button>

          <div className="mt-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-awash-blue/5 px-3 py-1 text-[9px] font-bold tracking-wider text-awash-blue/80 uppercase border border-awash-blue/10">
              <Shield className="size-3 text-awash-gold" />
              <span>TERMS AND CONDITIONS WILL APPLY</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bid Confirmation / Terms Agreement Modal */}
      {showConfirmModal &&
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) setShowConfirmModal(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-awash-blue">
                    Confirm Your Bid
                  </h3>
                  <p className="mt-1 text-xs font-medium text-neutral-500">
                    Review your bid and the service fee before proceeding to payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="rounded-full bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-border/80 bg-neutral-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500">Your Bid Item:</p>
                    <p className="mt-0.5 text-lg font-extrabold text-awash-blue">{auction.name}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-lg bg-awash-blue px-2.5 py-1 text-xs font-bold text-white tabular-nums border border-awash-blue/20">
                    {formattedCountdown}
                  </span>
                </div>

                <div className="h-px bg-border/60" />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-neutral-500">Your Bid Amount:</span>
                  <span className="text-xl font-bold text-emerald-700">{pendingAmount?.toFixed(2)} Br</span>
                </div>

                <div className="h-px bg-border/60" />

                <div>
                  <span className="text-xs font-medium text-neutral-500">Bid Service Fee:</span>
                  <p className="mt-1 text-base font-bold text-red-600">
                    {formattedFee} (Non-refundable)
                  </p>
                </div>

                <p className="text-[11px] leading-relaxed text-neutral-600 pt-1">
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
                className="mt-4 flex w-full items-center gap-2.5 text-left select-none cursor-pointer"
              >
                <span
                  className={`flex size-5 items-center justify-center rounded border transition-colors ${
                    agreementAccepted
                      ? "border-primary bg-primary text-white"
                      : "border-neutral-300 bg-white text-transparent"
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                </span>
                <span className="text-xs font-semibold text-foreground">
                  I agree to continue
                </span>
              </button>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-xl border border-border bg-neutral-100 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedFromConfirmation}
                  disabled={!agreementAccepted || loading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-awash-blue py-2.5 text-xs font-bold text-white shadow hover:bg-awash-blue/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin text-awash-gold" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Proceed to Payment · {formattedFee}</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Inline Awash Wallet Fee Payment & PIN Modal */}
      {showPinModal &&
        createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!pinLoading) setShowPinModal(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-awash-gold/30 bg-white p-5 shadow-2xl"
          >
            <div className="mb-3.5 flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-awash-blue/10 text-awash-blue">
                  <Wallet className="size-5 text-awash-gold" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-awash-blue">
                    {needsPinSetup ? "Set Up Wallet PIN" : "Awash Wallet Payment"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Pay service fee & submit bid
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                disabled={pinLoading}
                className="rounded-full bg-neutral-100 p-1.5 text-neutral-500 hover:bg-neutral-200 transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Fee & Bid Summary */}
            <div className="mb-3.5 space-y-2 rounded-2xl border border-border/80 bg-neutral-50/80 p-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Auction:</span>
                <span className="font-bold text-awash-blue max-w-[180px] truncate">{auction.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Your Bid:</span>
                <span className="font-bold text-emerald-700">{pendingAmount?.toFixed(2)} Br</span>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-medium">Service Fee:</span>
                <span className="font-bold text-red-600">{formattedFee} (Non-refundable)</span>
              </div>
            </div>

            {needsPinSetup ? (
              <div className="space-y-2.5">
                <p className="text-xs text-neutral-600 font-medium">
                  Create a 4-6 digit PIN for your Awash Wallet:
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupPin}
                  onChange={(e) => {
                    setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Create 4-6 digit PIN"
                  className="w-full rounded-xl border border-border px-3 py-2 text-center text-lg font-bold tracking-widest text-awash-blue focus:border-awash-gold focus:outline-none"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={setupConfirm}
                  onChange={(e) => {
                    setSetupConfirm(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Confirm PIN"
                  className="w-full rounded-xl border border-border px-3 py-2 text-center text-lg font-bold tracking-widest text-awash-blue focus:border-awash-gold focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-neutral-600 font-medium">
                  Enter your wallet PIN to authorize {formattedFee} fee:
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-center text-2xl font-bold tracking-[0.3em] text-awash-blue focus:border-awash-gold focus:outline-none"
                />
                {!pinLocked && attemptsRemaining != null && (
                  <p className="text-[11px] text-neutral-500 text-center">
                    Attempts remaining: {attemptsRemaining}
                  </p>
                )}
              </div>
            )}

            {pinError && (
              <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs font-semibold text-red-700">
                {pinError}
              </div>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                disabled={pinLoading}
                className="flex-1 rounded-xl border border-border bg-neutral-100 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWalletPayment}
                disabled={pinLoading || pinLocked || (needsPinSetup ? !setupPin || !setupConfirm : !pinInput)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-awash-blue py-2.5 text-xs font-bold text-white shadow hover:bg-awash-blue/90 disabled:opacity-50 transition-all"
              >
                {pinLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-awash-gold" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Pay & Submit Bid</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}



export function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}

const loveItems = [
  { icon: Trophy, label: "Win premium products for the lowest price" },
  { icon: ShieldCheck, label: "Fair & transparent — lowest unique bid wins" },
  { icon: Sparkles, label: "Simple, secure and trusted payments" },
  { icon: PiggyBank, label: "Big savings, big rewards" },
];

const PRICE_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under 30 birr", min: 0, max: 30 },
  { label: "30–50 birr", min: 30, max: 50 },
  { label: "50+ birr", min: 50, max: Infinity },
];

export function AuctionsScreen() {
  const {
    go,
    goBack,
    selectAuction,
    myBids,
    auctions,
    auctionsLoading,
    refreshAuctions,
    selectedCategory,
    selectCategory,
  } = useApp();
  const [category, setCategory] = useState(selectedCategory || "All");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "closed">(
    "live",
  );
  const [priceRange, setPriceRange] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const heroScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== category) {
      setCategory(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCategoryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [categoryDropdownOpen]);

  const categories = useMemo(
    () => buildAuctionCategoryOptions(auctions.map((a) => a.category)),
    [auctions],
  );

  const liveAuctions = auctions.filter((a) => a.status !== "closed");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      if (cat === "All") {
        if (statusFilter === "all") counts["All"] = auctions.length;
        else if (statusFilter === "live") counts["All"] = liveAuctions.length;
        else counts["All"] = auctions.filter((a) => a.status === "closed").length;
      } else {
        counts[cat] = auctions.filter((a) => {
          if (a.category !== cat) return false;
          if (statusFilter === "live") return a.status !== "closed";
          if (statusFilter === "closed") return a.status === "closed";
          return true;
        }).length;
      }
    }
    return counts;
  }, [categories, auctions, liveAuctions, statusFilter]);

  const SelectedCategoryIcon =
    category === "All" ? LayoutGrid : CATEGORY_ICONS[category] || Tag;

  const filtered = useMemo(() => {
    const unique = Array.from(new Map(auctions.map((a) => [a.id, a])).values());
    let result = unique;
    if (category !== "All")
      result = result.filter((a) => a.category === category);
    if (statusFilter === "live")
      result = result.filter((a) => a.status !== "closed");
    else if (statusFilter === "closed")
      result = result.filter((a) => a.status === "closed");
    const range = PRICE_RANGES[priceRange];
    if (range)
      result = result.filter(
        (a) => a.bidFee >= range.min && a.bidFee < range.max,
      );
    return result;
  }, [category, statusFilter, priceRange, auctions]);

  const endingSoon = liveAuctions.filter(
    (a) => a.status === "ending-soon" || a.timeLeft < 3600,
  );

  const scrollHero = (dir: "left" | "right") => {
    if (!heroScrollRef.current) return;
    heroScrollRef.current.scrollBy({
      left: dir === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -8 },
          visible: { opacity: 1, y: 0 },
        }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack()}
            className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">
              Auctions
            </h1>
            <p className="text-sm font-medium text-neutral-500">
              Lowest unique bid wins. Bid low, be unique!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="gold">
            <span className="size-1.5 rounded-full bg-emerald-500" />{" "}
            {liveAuctions.length} Live
          </Badge>
          <button
            onClick={() => go("my-bids")}
            aria-label="My bids"
            className="relative flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <TicketCheck className="size-5" />
            {myBids.length > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-lg">
                {myBids.length}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Filters Bar ── */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -8 },
          visible: { opacity: 1, y: 0 },
        }}
        className="flex flex-col gap-2.5"
      >
        {/* Mobile Filter Controls (< md): Saves vertical space by using dropdown menu */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Row 1: Status pills & Price Filter Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-neutral-100/90 p-1 border border-border/50">
              {(["all", "live", "closed"] as const).map((s) => {
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "bg-awash-blue text-white shadow-xs"
                        : "text-neutral-600 hover:text-foreground hover:bg-white/60"
                    }`}
                  >
                    {s === "all" ? "All" : s === "live" ? "Live" : "Closed"}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                showFilters || priceRange > 0
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border/60 bg-white/80 backdrop-blur-sm text-neutral-600 hover:bg-white hover:text-foreground"
              }`}
            >
              <Filter className="size-3.5" />
              <span>Price</span>
              {priceRange > 0 && (
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>

          {/* Row 2: Category Dropdown */}
          {categories.length > 1 && (
            <div ref={categoryDropdownRef} className="relative w-full">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                aria-expanded={categoryDropdownOpen}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-[0.99] ${
                  category !== "All"
                    ? "border-awash-blue bg-awash-blue text-white shadow-sm"
                    : "border-border/60 bg-white/90 backdrop-blur-sm text-foreground hover:bg-white hover:border-foreground/30 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <SelectedCategoryIcon
                    className={`size-4 shrink-0 ${
                      category !== "All" ? "text-white" : "text-awash-blue"
                    }`}
                  />
                  <span className="truncate">
                    {category === "All" ? "All Categories" : category}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      category !== "All"
                        ? "bg-white/20 text-white"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {categoryCounts[category] ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {category !== "All" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategory("All");
                        selectCategory("All");
                      }}
                      className="p-1 rounded-md hover:bg-white/20 text-white transition-colors"
                      title="Reset to All Categories"
                    >
                      <X className="size-3.5" />
                    </span>
                  )}
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 ${
                      categoryDropdownOpen ? "rotate-180" : ""
                    } ${category !== "All" ? "text-white" : "text-neutral-400"}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {categoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1.5 w-full rounded-2xl border border-border/80 bg-white/95 backdrop-blur-xl p-2 shadow-2xl z-40 max-h-[60vh] overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Select Category
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {categories.map((c) => {
                        const Icon =
                          c === "All" ? LayoutGrid : CATEGORY_ICONS[c] || LayoutGrid;
                        const count = categoryCounts[c] ?? 0;
                        const isSelected = category === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCategory(c);
                              selectCategory(c);
                              setCategoryDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-awash-blue text-white font-semibold shadow-xs"
                                : "text-foreground hover:bg-neutral-100 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={`size-4 ${
                                  isSelected ? "text-white" : "text-neutral-500"
                                }`}
                              />
                              <span>{c === "All" ? "All Categories" : c}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-neutral-100 text-neutral-500"
                                }`}
                              >
                                {count}
                              </span>
                              {isSelected && (
                                <Check className="size-3.5 text-white" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Desktop Filter Controls (>= md) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex gap-2">
            {(["all", "live", "closed"] as const).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`btn-filter-chip ${active ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}
                >
                  {s === "all" ? "All" : s === "live" ? "Live" : "Closed"}
                </button>
              );
            })}
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {categories.map((c) => {
                const active = c === category;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      selectCategory(c);
                    }}
                    className={`btn-filter-chip shrink-0 ${active ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-filter-chip shrink-0 ${showFilters || priceRange > 0 ? "btn-filter-chip-active btn-filter-chip-gold" : "btn-filter-chip-glass"}`}
          >
            <Filter className="size-3.5 inline mr-1" />
            Price
          </button>
        </div>

        {/* ── Price Range Filters (Compact Slide-down) ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-2 overflow-hidden pt-1"
            >
              <span className="text-xs font-semibold text-neutral-400 mr-1">
                Fee:
              </span>
              {PRICE_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setPriceRange(i)}
                  className={`btn-filter-chip text-xs py-1.5 px-3 ${priceRange === i ? "btn-filter-chip-active btn-filter-chip-gold" : "btn-filter-chip-glass"}`}
                >
                  {r.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Ending Soon Carousel ── */}
      {statusFilter !== "closed" && endingSoon.length > 0 && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          className="relative"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Flame className="size-4 text-primary" />
            </span>
            <span className="font-display text-sm font-bold text-primary">
              Ending Soon
            </span>
          </div>
          {endingSoon.length > 2 && (
            <>
              <button
                onClick={() => scrollHero("left")}
                className="size-9 absolute left-0 top-1/2 z-10 -translate-y-1/2 btn-icon-glass"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={() => scrollHero("right")}
                className="size-9 absolute right-0 top-1/2 z-10 -translate-y-1/2 btn-icon-glass"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div
            ref={heroScrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            {endingSoon.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => selectAuction(a.id)}
                className="group relative w-[300px] flex-shrink-0 aspect-[4/3] overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:shadow-[0_16px_48px_rgba(200,166,66,0.2)] hover:-translate-y-1 active:scale-[0.98] text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224]" />
                {a.images?.[0] && (
                  <img
                    src={a.images[0]}
                    alt={a.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover opacity-50 transition-all duration-500 group-hover:scale-110 group-hover:opacity-60"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <Badge tone="gold">
                      <Flame className="size-3" /> Hot
                    </Badge>
                    <TimePill seconds={a.timeLeft} endingSoon={true} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-extrabold text-white drop-shadow-md">
                      {a.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">
                        Service Fee: {formatCurrency(a.bidFee)}
                      </span>
                      <span className="text-xs font-medium text-white/60 line-through">
                        {a.marketPrice > 0
                          ? formatCurrency(a.marketPrice)
                          : null}
                      </span>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Users className="size-3" /> {a.totalBids || a.bidders}{" "}
                      bidders
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Auction Grid ── */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        {auctionsLoading && auctions.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((a, i) => (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  index={i}
                  onOpen={() => selectAuction(a.id)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-16"
              >
                <span className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 border border-border/60">
                  <Gavel className="size-8 text-neutral-300" />
                </span>
                <p className="text-sm font-medium text-neutral-400">
                  No auctions match your filters
                </p>
                <button
                  onClick={() => {
                    setCategory("All");
                    setStatusFilter("all");
                    setPriceRange(0);
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Refresh ── */}
      {auctions.length > 0 && (
        <motion.button
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0 },
          }}
          whileTap={{ scale: 0.98 }}
          onClick={refreshAuctions}
          disabled={auctionsLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium text-neutral-500 transition-all hover:bg-white hover:shadow-sm active:scale-[0.98]"
        >
          <RefreshCw
            className={`size-4 ${auctionsLoading ? "animate-spin" : ""}`}
          />
          {auctionsLoading ? "Refreshing..." : "Refresh Auctions"}
        </motion.button>
      )}

      {/* ── Why customers love it ── */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0 },
        }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
      >
        <h3 className="mb-4 font-display text-base font-bold text-gradient-gold">
          Why customers love it
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {loveItems.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 text-awash-gold">
                <item.icon className="size-4" />
              </span>
              <span className="text-sm font-medium text-foreground/80">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
