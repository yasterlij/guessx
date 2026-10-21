export const AUCTION_SOCKET_NAMESPACE = "/auctions";

export const AuctionSocketEvents = {
  subscribe: "subscribe:auction",
  unsubscribe: "unsubscribe:auction",
  update: "auction:update",
} as const;

export type SocketUpdatePayload = {
  auction_id: string;
  total_bids: number;
  timestamp: string;
  new_bid_amount?: number;
};
