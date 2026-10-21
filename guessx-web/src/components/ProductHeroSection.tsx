import { Eye } from "lucide-react";
import { Badge } from "./AuctionUI";
import { ImageCarousel } from "./ImageCarousel";
import type { Auction, ProductSpecs } from "../mockDataV0";

export function ProductHeroSection({
  auction,
  images,
  auctionCode,
  countdown,
  isEnding,
  isOver,
  specEntries,
  showSpecs,
  onToggleSpecs,
  onOpenLightbox,
}: {
  auction: Auction;
  images: string[];
  auctionCode: string;
  countdown: { d: string; h: string; m: string; s: string };
  isEnding: boolean;
  isOver: boolean;
  specEntries: Array<{ key: keyof ProductSpecs; label: string; value: string }>;
  showSpecs: boolean;
  onToggleSpecs: () => void;
  onOpenLightbox: (index: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_24px_80px_rgba(0,43,92,0.08)]">
      <div className="relative">
        {images.length > 0 ? (
          <ImageCarousel
            images={images}
            alt={auction.name}
            aspectRatio="aspect-[4/3]"
            autoPlayInterval={4000}
            showThumbnails
            onImageClick={onOpenLightbox}
          />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center bg-neutral-100">
            <p className="text-sm font-medium text-neutral-400">
              No images available
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Badge tone="green" className="shadow-lg shadow-emerald-200/40">
            Live
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur-sm">
            <Eye className="size-4 text-awash-blue" />{" "}
            {auction.totalBids || auction.bidders} bids
          </span>
        </div>
      </div>

      <div className="border-t border-border/50 bg-gradient-to-br from-white via-white to-awash-blue/5 p-5 sm:p-6">
        <div className="space-y-5">
          <section className="rounded-[1.75rem] bg-gradient-to-br from-awash-blue via-[#0F4C81] to-[#6BB6D9] p-4 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">
              About this product
            </p>
            <h2 className="mt-2 font-display text-lg font-extrabold tracking-tight text-white">
              {auction.name}
            </h2>
            {auction.specSummary ? (
              <p className="mt-1 text-sm font-semibold text-white/80">
                {auction.specSummary}
              </p>
            ) : null}
            {auction.description ? (
              <p className="mt-3 text-sm leading-relaxed text-white/78">
                {auction.description}
              </p>
            ) : null}
          </section>

          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1 rounded-[1.25rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark px-2.5 py-2.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">
                {isOver
                  ? "Auction Ended"
                  : isEnding
                    ? "Ending Soon"
                    : "Time Left"}
              </p>
              <p
                className={`mt-1 truncate font-display text-[22px] font-extrabold tabular-nums ${isEnding ? "text-amber-300" : "text-white"}`}
              >
                {countdown.d !== "00" ? `${parseInt(countdown.d, 10)}d ` : ""}
                {countdown.h}:{countdown.m}:{countdown.s}
              </p>
            </div>
            <div className="w-[112px] shrink-0 rounded-[1.25rem] bg-gradient-to-r from-awash-blue via-awash-blue-dark to-awash-gold-dark px-2.5 py-2.5 text-white shadow-[0_18px_40px_rgba(0,43,92,0.16)] sm:w-[118px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                Auction Code
              </p>
              <p className="mt-1 truncate font-display text-[18px] font-extrabold tracking-[0.1em] text-white">
                {auctionCode}
              </p>
            </div>
          </div>

          {specEntries.length > 0 && (
            <section className="rounded-[1.75rem] border border-border/60 bg-white/80 p-5 shadow-[0_4px_16px_rgba(0,43,92,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
                  Product specifications
                </p>
                <button
                  onClick={onToggleSpecs}
                  className="rounded-full border border-awash-blue/20 bg-awash-blue/5 px-3 py-1 text-[11px] font-semibold text-awash-blue transition-colors hover:bg-awash-blue/10"
                >
                  {showSpecs ? "Show less" : "View more"}
                </button>
              </div>
              {showSpecs && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {specEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="rounded-xl border border-border/50 bg-neutral-50/80 p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                        {entry.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {entry.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
