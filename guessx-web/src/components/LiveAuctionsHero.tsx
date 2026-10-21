import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Trophy,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowRight,
  Gavel,
  RefreshCw,
} from "lucide-react";
import { type Auction } from "../mockDataV0";
import { AuctionCard, SkeletonCard, type PriorityBadgeConfig } from "../screens/AuctionsScreen";

interface LiveAuctionsHeroProps {
  auctions: Auction[];
  loading?: boolean;
  onSelectAuction: (id: string) => void;
  onViewAll: () => void;
}

interface SlotDefinition {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Flame;
  iconColor: string;
  badge: PriorityBadgeConfig;
}

const SLOT_CONFIGS: SlotDefinition[] = [
  {
    id: "closing",
    title: "Close Soon",
    subtitle: "Closing First",
    icon: Flame,
    iconColor: "text-red-500",
    badge: { label: "Close Soon", icon: "flame", color: "ember" },
  },
  {
    id: "highest-bids",
    title: "Highest Bids",
    subtitle: "Most Popular",
    icon: Trophy,
    iconColor: "text-amber-500",
    badge: { label: "Highest Bids", icon: "trophy", color: "primary" },
  },
  {
    id: "live-rotation-1",
    title: "Live Auction",
    subtitle: "Active Now",
    icon: Sparkles,
    iconColor: "text-blue-500",
    badge: { label: "Live Auction", icon: "sparkles", color: "blue" },
  },
  {
    id: "live-rotation-2",
    title: "New Live",
    subtitle: "Fresh Drop",
    icon: Clock,
    iconColor: "text-emerald-500",
    badge: { label: "New Live", icon: "clock", color: "emerald" },
  },
];

const ROTATION_INTERVAL_MS = 7000;

export function LiveAuctionsHero({
  auctions,
  loading = false,
  onSelectAuction,
  onViewAll,
}: LiveAuctionsHeroProps) {
  const activeAuctions = useMemo(
    () => auctions.filter((a) => a.status !== "closed"),
    [auctions]
  );

  const [rotationTick, setRotationTick] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeRotation =
    !isPaused && !isHovered && !inputFocused && activeAuctions.length > 1;

  const nextRotation = useCallback(() => {
    setRotationTick((prev) => prev + 1);
    setProgress(0);
  }, []);

  const prevRotation = useCallback(() => {
    setRotationTick((prev) => Math.max(0, prev - 1));
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!activeRotation) return;

    const tickMs = 100;
    const step = (tickMs / ROTATION_INTERVAL_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          nextRotation();
          return 0;
        }
        return prev + step;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [activeRotation, nextRotation]);

  useEffect(() => {
    if (!isHovered) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prevRotation();
      } else if (e.key === "ArrowRight") {
        nextRotation();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHovered, prevRotation, nextRotation]);

  const expiringPool = useMemo(() => {
    return [...activeAuctions].sort(
      (a, b) => (a.timeLeft ?? 0) - (b.timeLeft ?? 0)
    );
  }, [activeAuctions]);

  const highestBidsPool = useMemo(() => {
    return [...activeAuctions].sort((a, b) => {
      const bidsA = a.totalBids || a.bidders || 0;
      const bidsB = b.totalBids || b.bidders || 0;
      return bidsB - bidsA;
    });
  }, [activeAuctions]);

  const slotAuctions = useMemo(() => {
    const total = activeAuctions.length;
    if (total === 0) return [];

    const slotCount = Math.min(4, total);
    const result: { slot: SlotDefinition; auction: Auction }[] = [];
    const chosenIds = new Set<string>();

    const expiringIndex = rotationTick % Math.max(1, expiringPool.length);
    const expiring =
      expiringPool.find(
        (a, idx) => idx >= expiringIndex && !chosenIds.has(a.id)
      ) ||
      expiringPool.find((a) => !chosenIds.has(a.id)) ||
      expiringPool[0];

    if (expiring) {
      result.push({ slot: SLOT_CONFIGS[0], auction: expiring });
      chosenIds.add(expiring.id);
    }

    if (slotCount > 1) {
      const highBidIndex = rotationTick % Math.max(1, highestBidsPool.length);
      const highBid =
        highestBidsPool.find(
          (a, idx) => idx >= highBidIndex && !chosenIds.has(a.id)
        ) ||
        highestBidsPool.find((a) => !chosenIds.has(a.id));

      if (highBid) {
        result.push({ slot: SLOT_CONFIGS[1], auction: highBid });
        chosenIds.add(highBid.id);
      }
    }

    const remainingPool = activeAuctions.filter((a) => !chosenIds.has(a.id));

    for (let i = result.length; i < slotCount; i++) {
      const config = SLOT_CONFIGS[i] || SLOT_CONFIGS[2];
      if (remainingPool.length > 0) {
        const offsetIndex = (rotationTick + i) % remainingPool.length;
        const candidate =
          remainingPool.find(
            (a, idx) => idx >= offsetIndex && !chosenIds.has(a.id)
          ) ||
          remainingPool.find((a) => !chosenIds.has(a.id)) ||
          remainingPool[0];

        if (candidate) {
          result.push({ slot: config, auction: candidate });
          chosenIds.add(candidate.id);
        }
      } else {
        const fallback =
          activeAuctions.find((a) => !chosenIds.has(a.id)) ||
          activeAuctions[i % total];
        result.push({ slot: config, auction: fallback });
        chosenIds.add(fallback.id);
      }
    }

    return result;
  }, [activeAuctions, expiringPool, highestBidsPool, rotationTick]);

  const rotationSteps = Math.max(
    1,
    Math.ceil(activeAuctions.length / Math.max(1, slotAuctions.length))
  );
  const currentStep = (rotationTick % rotationSteps) + 1;

  return (
    <section
      aria-label="Live Auctions Hero Showcase"
      className="relative rounded-3xl bg-gradient-to-br from-amber-500/[0.03] via-white to-slate-900/[0.02] p-4 sm:p-6 lg:p-7 border border-neutral-200/90 shadow-[0_16px_45px_rgba(15,23,42,0.04)] backdrop-blur-xl overflow-hidden transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Hero Header */}
      <div className="relative mb-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md border border-neutral-200/80 text-slate-800">
            <Gavel className="size-5 text-amber-600" />
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 sm:text-3xl truncate">
              Live Auctions
            </h1>
            <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-500/25 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Now
            </span>
          </div>
        </div>

        {/* Carousel & Pager Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isPaused && (
            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 shadow-sm transition-all hover:bg-amber-100 cursor-pointer"
            >
              <Pause className="size-3 fill-current text-amber-600" />
              <span className="hidden sm:inline">Slide Paused · Resume</span>
              <span className="sm:hidden">Resume</span>
            </button>
          )}

          {activeAuctions.length > 1 && (
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-neutral-200/90 shadow-sm">
              <button
                type="button"
                onClick={prevRotation}
                aria-label="Previous live auction rotation"
                className="flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? "Resume auto rotation" : "Pause auto rotation"}
                className={`flex size-7 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  isPaused ? "bg-amber-100 text-amber-800" : "text-slate-700 hover:bg-neutral-100"
                }`}
                title={isPaused ? "Rotation paused — click to play" : "Pause auto-rotation"}
              >
                {isPaused ? <Play className="size-3.5 fill-current text-amber-600" /> : <Pause className="size-3.5 fill-current text-slate-700" />}
              </button>

              <button
                type="button"
                onClick={nextRotation}
                aria-label="Next live auction rotation"
                className="flex size-7 items-center justify-center rounded-full text-slate-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>

              <div className="mx-2 flex items-center gap-1 text-xs font-bold tabular-nums text-neutral-500">
                <span className="text-slate-800">{currentStep}</span>
                <span className="text-neutral-300">/</span>
                <span>{rotationSteps}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>View All ({activeAuctions.length})</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Smooth Auto-rotation Progress Bar */}
      {activeAuctions.length > 1 && (
        <div className="relative mb-5 h-1 w-full overflow-hidden rounded-full bg-neutral-200/60">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isPaused || isHovered || inputFocused
                ? "bg-amber-400"
                : "bg-gradient-to-r from-amber-500 to-emerald-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Grid of 4 Slots */}
      {loading && activeAuctions.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : slotAuctions.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
          onPointerDownCapture={() => setIsPaused(true)}
        >
          {slotAuctions.map(({ slot, auction }, index) => {
            const Icon = slot.icon;
            return (
              <div key={slot.id} className="flex flex-col">
                {/* Slot Header Banner */}
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      slot.id === "closing"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : slot.id === "highest-bids"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : slot.id === "live-rotation-1"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    <Icon className={`size-3.5 ${slot.iconColor}`} />
                    <span>{slot.title}</span>
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 border border-neutral-200/80 shadow-xs">
                    {slot.subtitle}
                  </span>
                </div>

                <div className="relative flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={auction.id}
                      initial={{ opacity: 0, scale: 0.95, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -12 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.03,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="h-full w-full"
                    >
                      <AuctionCard
                        auction={auction}
                        index={index}
                        variant="glass"
                        onOpen={() => onSelectAuction(auction.id)}
                        onFocusChange={(focused) => {
                          setInputFocused(focused);
                          if (focused) setIsPaused(true);
                        }}
                        onInteraction={() => setIsPaused(true)}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-[240px] items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200 bg-white/70 p-6 text-center backdrop-blur-md">
          <div>
            <Gavel className="mx-auto size-12 text-neutral-300" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              No Live Auctions Right Now
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              New auctions will drop soon. Stay tuned!
            </p>
          </div>
        </div>
      )}

      {/* Rotation Indicator Dots Footer */}
      {activeAuctions.length > 4 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/60 pt-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`size-3.5 text-amber-500 ${
                activeRotation ? "animate-spin" : ""
              }`}
            />
            <span>
              Showing {slotAuctions.length} of {activeAuctions.length} live auctions • Rotating every 7s
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: rotationSteps }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRotationTick(idx);
                  setProgress(0);
                }}
                aria-label={`Go to rotation group ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === rotationTick % rotationSteps
                    ? "w-6 bg-gradient-to-r from-amber-500 to-amber-600 shadow-sm"
                    : "w-2 bg-neutral-300 hover:bg-neutral-400"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
