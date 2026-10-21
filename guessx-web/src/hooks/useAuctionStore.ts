import { useState, useCallback, useRef } from "react";
import { api } from "../api";
import { normalizeAuctionCategory } from "../lib/auctionCategories";
import { formatSpecSummary } from "../mockDataV0";
import type { Auction } from "../mockDataV0";
import type { ApiAuction } from "../api";

export function mapAuction(apiAuction: ApiAuction): Auction {
  const timeLeft = Math.max(
    0,
    Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000),
  );
  return {
    id: apiAuction.id,
    publicCode: apiAuction.public_code,
    productId: apiAuction.product_id,
    name: apiAuction.product?.name || "Unknown Product",
    category: normalizeAuctionCategory(
      apiAuction.product?.category,
      apiAuction.product?.name,
    ),
    images: apiAuction.product?.image_urls || [],
    marketPrice: Number(apiAuction.product?.current_market_price || 0),
    bidFee: apiAuction.bid_fee != null ? Number(apiAuction.bid_fee) : 1,
    bidders: apiAuction.stats?.total_bids ?? 0,
    uniqueBidders: apiAuction.stats?.unique_bidders ?? 0,
    totalBids: apiAuction.stats?.total_bids ?? 0,
    timeLeft,
    endTime: apiAuction.end_time,
    status: (apiAuction.status === "ACTIVE"
      ? timeLeft < 3600
        ? "ending-soon"
        : "live"
      : "closed") as Auction["status"],
    description: apiAuction.product?.description || "",
    highlights: [],
    specs: apiAuction.product?.specs || null,
    specSummary: formatSpecSummary(apiAuction.product?.specs),
    minBid: apiAuction.min_bid ?? undefined,
    maxBid: apiAuction.max_bid ?? undefined,
    winners: apiAuction.winners?.map((w) => ({
      user_id: w.user_id,
      amount: w.amount,
      rank: w.rank,
      payment_status: w.payment_status ?? undefined,
      payment_deadline: w.payment_deadline ?? undefined,
      name: w.name ?? undefined,
      phone: w.phone ?? undefined,
    })),
    winnersCount: apiAuction.winners_count ?? apiAuction.winners?.length ?? 0,
    winning_bid_amount: apiAuction.winning_bid_amount ?? null,
    winner_user_id: apiAuction.winner_user_id ?? null,
    payment_status: apiAuction.payment_status ?? undefined,
    payment_deadline: apiAuction.payment_deadline ?? null,
    payment_deadline_hours: apiAuction.payment_deadline_hours ?? null,
    escalation_rule: apiAuction.escalation_rule ?? null,
    second_winner_assigned: Boolean(apiAuction.second_winner_assigned),
    raw_status: apiAuction.status,
  };
}

interface UseAuctionStoreOptions {
  onError?: (message: string) => void;
}

export function useAuctionStore({ onError }: UseAuctionStoreOptions = {}) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const refreshing = useRef(false);

  const refreshAuctions = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setAuctionsLoading(true);
    try {
      const [activeRes, closedRes] = await Promise.all([
        api.listAuctions().catch(() => ({ data: [] as ApiAuction[] })),
        api.listClosedAuctions().catch(() => ({ data: [] as ApiAuction[] })),
      ]);
      const allMapped = [
        ...activeRes.data.map(mapAuction),
        ...closedRes.data.map(mapAuction),
      ];
      const unique = Array.from(
        new Map(allMapped.map((a) => [a.id, a])).values(),
      );
      setAuctions(unique);
    } catch {
      onError?.("Failed to refresh auctions");
    } finally {
      setAuctionsLoading(false);
      refreshing.current = false;
    }
  }, [onError]);

  const fetchAuctionById = useCallback(
    async (id: string): Promise<Auction | undefined> => {
      const cached = auctions.find((a) => a.id === id);
      if (cached) return cached;
      try {
        const data = await api.getAuction(id);
        const mapped = mapAuction(data);
        setAuctions((prev) => {
          if (prev.find((a) => a.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
        return mapped;
      } catch {
        return undefined;
      }
    },
    [auctions],
  );

  const getAuction = useCallback(
    (id: string | null | undefined): Auction | undefined => {
      if (!id) return undefined;
      return auctions.find((a) => a.id === id);
    },
    [auctions],
  );

  const upsertAuction = useCallback((auction: Auction) => {
    setAuctions((prev) => {
      const idx = prev.findIndex((a) => a.id === auction.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = auction;
        return next;
      }
      return [...prev, auction];
    });
  }, []);

  return {
    auctions,
    setAuctions,
    auctionsLoading,
    refreshAuctions,
    fetchAuctionById,
    getAuction,
    upsertAuction,
  };
}
