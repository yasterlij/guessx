import { Bell, CheckCircle2, TrendingDown } from "lucide-react"
import { ProductHeroSection } from "./ProductHeroSection"
import { ProductPurchasePanel } from "./ProductPurchasePanel"
import { Badge } from "./AuctionUI"
import type { Auction, ProductSpecs } from "../mockDataV0"

export function ProductDetailLayout({
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
  bidValue,
  bidFlash,
  bidError,
  onBidChange,
  onBidBlur,
  onBidKeyDown,
  onDecrease,
  onIncrease,
  selectedPaymentMethod,
  showPaymentMethods,
  onTogglePaymentMethods,
  onSelectPaymentMethod,
  loadingMethod,
  checkingPin,
  walletBalance,
  bidFee,
  hasValidBid,
  authError,
  onSubmit,
  bidCount,
  maxBid,
  minBid,
  highlights,
}: {
  auction: Auction
  images: string[]
  auctionCode: string
  countdown: { d: string; h: string; m: string; s: string }
  isEnding: boolean
  isOver: boolean
  specEntries: Array<{ key: keyof ProductSpecs; label: string; value: string }>
  showSpecs: boolean
  onToggleSpecs: () => void
  onOpenLightbox: (index: number) => void
  bidValue: string
  bidFlash: boolean
  bidError: string | null
  onBidChange: (value: string) => void
  onBidBlur: () => void
  onBidKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onDecrease: () => void
  onIncrease: () => void
  selectedPaymentMethod: "SIKINAPAY" | "AWASH"
  showPaymentMethods: boolean
  onTogglePaymentMethods: () => void
  onSelectPaymentMethod: (method: "SIKINAPAY" | "AWASH") => void
  loadingMethod: "SIKINAPAY" | "AWASH" | null
  checkingPin: boolean
  walletBalance: number
  bidFee: number
  hasValidBid: boolean
  authError: string | null
  onSubmit: (method: "SIKINAPAY" | "AWASH") => void
  bidCount: number
  maxBid?: number | null
  minBid?: number | null
  highlights?: string[]
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
      <div className="space-y-6">
        <ProductHeroSection
          auction={auction}
          images={images}
          auctionCode={auctionCode}
          countdown={countdown}
          isEnding={isEnding}
          isOver={isOver}
          specEntries={specEntries}
          showSpecs={showSpecs}
          onToggleSpecs={onToggleSpecs}
          onOpenLightbox={onOpenLightbox}
        />

        <section className="rounded-[2rem] border border-border/60 bg-white p-5 shadow-[0_24px_80px_rgba(0,43,92,0.08)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                About this product
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold tracking-[-0.022em] text-foreground">
                {auction.name}
              </h2>
              {auction.specSummary ? (
                <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-600">
                  {auction.specSummary}
                </p>
              ) : null}
              {auction.description ? (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {auction.description}
                </p>
              ) : null}
            </div>
            <Badge tone="green" className="shrink-0">
              Live
            </Badge>
          </div>

          {specEntries.length > 0 && (
            <section className="mt-6 rounded-2xl bg-canvas p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
                  Product specifications
                </p>
                <button
                  onClick={onToggleSpecs}
                  className="rounded-full px-3 py-1 text-[11px] font-semibold text-awash-gold-dark transition-colors hover:bg-awash-gold/10"
                >
                  {showSpecs ? "Show less" : "View more"}
                </button>
              </div>
              {showSpecs && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {specEntries.map((entry) => (
                    <div key={entry.key} className="rounded-xl bg-white p-3">
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
        </section>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <ProductPurchasePanel
          bidValue={bidValue}
          bidFlash={bidFlash}
          bidError={bidError}
          onBidChange={onBidChange}
          onBidBlur={onBidBlur}
          onBidKeyDown={onBidKeyDown}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          selectedPaymentMethod={selectedPaymentMethod}
          showPaymentMethods={showPaymentMethods}
          onTogglePaymentMethods={onTogglePaymentMethods}
          onSelectPaymentMethod={onSelectPaymentMethod}
          loadingMethod={loadingMethod}
          checkingPin={checkingPin}
          walletBalance={walletBalance}
          bidFee={bidFee}
          hasValidBid={hasValidBid}
          authError={authError}
          isEnding={isEnding}
          onSubmit={onSubmit}
        />

        <div className="space-y-4">
          {maxBid ? (
            <div className="rounded-2xl border border-border/60 bg-white/80 p-4 shadow-[0_8px_32px_rgba(0,43,92,0.06)]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-400">
                  Bid Progress
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                  {bidCount}/{maxBid}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(bidCount / maxBid, 1) * 100}%`,
                    backgroundColor: bidCount / maxBid > 0.8 ? "#0071e3" : "#10B981",
                  }}
                />
              </div>
            </div>
          ) : null}

          {minBid != null && bidCount < minBid ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 animate-slide-up">
              <Bell className="size-4 flex-shrink-0 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">
                Only {bidCount}/{minBid} bids — auction may extend
              </p>
            </div>
          ) : null}

          {highlights?.length ? (
            <div className="flex flex-wrap gap-2">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {highlight}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-xl border border-awash-blue/10 bg-awash-blue/5 p-3.5 backdrop-blur-sm transition-all hover:bg-awash-blue/10">
            <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-awash-gold" />
            <p className="text-xs font-medium leading-relaxed text-foreground/80">
              Place the <span className="font-bold text-awash-gold-dark">lowest unique bid</span> — the smallest amount that no one else has chosen — to win.
            </p>
          </div>

          <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
            Terms and conditions will apply
          </p>
        </div>
      </div>
    </div>
  )
}
