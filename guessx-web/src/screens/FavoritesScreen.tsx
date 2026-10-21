import { useMemo } from "react";
import { ArrowLeft, Heart, HeartOff } from "lucide-react";
import { useApp } from "../AppContext";
import { Badge, Card, CTAButton } from "../components/AuctionUI";
import { EmptyState } from "../components/EmptyState";
import { formatCurrency } from "../mockDataV0";

export function FavoritesScreen() {
  const {
    go,
    goBack,
    auctions,
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    selectAuction,
    toggleFavorite,
  } = useApp();

  const favorites = useMemo(() => {
    const favoriteSet = new Set(favoriteAuctionIds);
    return auctions.filter((auction) => favoriteSet.has(auction.id));
  }, [auctions, favoriteAuctionIds]);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack()}
            className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 text-awash-blue shadow-sm transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">
              Favorites
            </h1>
            <p className="text-sm font-medium text-neutral-500">
              Your watchlist of auctions to revisit quickly
            </p>
          </div>
        </div>
        <Badge tone={favorites.length > 0 ? "navy" : "muted"}>
          {favorites.length} saved
        </Badge>
      </div>

      {favoritesLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="h-4 w-36 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
            </Card>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No favorites yet"
          message="Save auctions you want to track so you can come back before bidding closes."
          actionLabel="Browse auctions"
          onAction={() => go("auctions")}
        />
      ) : (
        <div className="grid gap-3">
          <div className="flex justify-end">
            <CTAButton variant="outline" onClick={refreshFavorites}>
              Refresh watchlist
            </CTAButton>
          </div>
          {favorites.map((auction) => (
            <Card key={auction.id} className="p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => selectAuction(auction.id)}
                  className="flex min-w-0 flex-1 items-start gap-4 text-left"
                >
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                    {auction.images?.[0] ? (
                      <img
                        src={auction.images[0]}
                        alt={auction.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Heart className="size-5 text-neutral-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-awash-blue">
                        {auction.name}
                      </p>
                      <Badge
                        tone={
                          auction.status === "closed"
                            ? "muted"
                            : auction.status === "ending-soon"
                              ? "orange"
                              : "green"
                        }
                      >
                        {auction.status === "closed"
                          ? "Closed"
                          : auction.status === "ending-soon"
                            ? "Ending soon"
                            : "Live"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-medium text-neutral-500">
                      {auction.category}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      Bid fee {formatCurrency(auction.bidFee)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => toggleFavorite(auction.id)}
                  className="rounded-xl border border-border/60 p-2 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-red-500"
                >
                  <HeartOff className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
