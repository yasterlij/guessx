import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Users,
  TrendingDown,
  Clock,
  Eye,
  Trophy,
  Gavel,
  X,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Hash,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Crown,
} from "lucide-react";
import { useApp } from "../AppContext";
import { AdminLayout } from "../components/AdminLayout";
import { StatCard } from "../components/StatCard";
import { Modal, ConfirmDialog } from "../components/Modal";
import { DataTable } from "../components/DataTable";
import { Countdown } from "../components/Countdown";
import {
  useAuctionSocket,
  applySocketUpdate,
  type SocketUpdatePayload,
} from "../hooks/useAuctionSocket";
import { api, type ApiWinnerResult } from "../api";
import { toast } from "../store/toast.store";
import { formatCurrency, formatETB, formatMaskedCurrency } from "../mockDataV0";
import type { Auction } from "../mockDataV0";

type BidRow = {
  id: string;
  amount: number;
  user_id: string;
  user_name?: string | null;
  bid_time: string;
  ticket_number?: string;
  amount_encrypted?: boolean;
};

export function AdminAuctionMonitorScreen() {
  const {
    go,
    selectedId,
    getAuction,
    closeAuction,
    forceCloseAuction,
    refreshAuctions,
    selectAuctionForMonitor,
    goBack,
  } = useApp();
  const auction = getAuction(selectedId);

  const [liveAuction, setLiveAuction] = useState<Auction | undefined>(auction);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showForceCloseConfirm, setShowForceCloseConfirm] = useState(false);
  const [forceClosing, setForceClosing] = useState(false);
  const [forceCloseWarning, setForceCloseWarning] = useState("");
  const [winner, setWinner] = useState<ApiWinnerResult | null>(null);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerPage, setWinnerPage] = useState(0);

  useEffect(() => {
    if (auction) setLiveAuction(auction);
  }, [auction]);

  // Real-time socket updates
  const onSocketUpdate = useCallback((payload: SocketUpdatePayload) => {
    setLiveAuction((prev) =>
      prev ? applySocketUpdate([prev], payload)[0] : prev,
    );
  }, []);

  useAuctionSocket(selectedId, onSocketUpdate);

  // Periodic refresh to catch status changes
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      refreshAuctions();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedId, refreshAuctions]);

  const fetchBids = useCallback(async () => {
    if (!selectedId) return;
    setBidsLoading(true);
    try {
      const result = await api.getAuctionBids(selectedId);
      setBids(result as BidRow[]);
    } catch {
      toast("Failed to load bids", "error");
    } finally {
      setBidsLoading(false);
    }
  }, [selectedId]);

  const handleViewBids = () => {
    fetchBids();
    setShowBids(true);
  };

  const handleClose = async () => {
    if (!selectedId) return;
    setClosing(true);
    try {
      await api.closeAuction(selectedId);
      await refreshAuctions();
      const result = await api.drawWinner(selectedId);
      setWinnerPage(0);
      setWinner(result);
      setShowWinner(true);
      toast("Auction closed successfully", "success");
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : undefined) || ((e as any)?.response?.data?.message) || "";
      if (msg.includes("No unique bids") || msg.includes("no unique winner")) {
        setForceCloseWarning(msg);
        setShowForceCloseConfirm(true);
      } else {
        toast(msg || "Failed to close auction", "error");
      }
    } finally {
      setClosing(false);
      setShowCloseConfirm(false);
    }
  };

  const handleForceClose = async () => {
    if (!selectedId) return;
    setForceClosing(true);
    try {
      await api.forceCloseAuction(selectedId);
      await refreshAuctions();
      setWinnerPage(0);
      setWinner({
        id: selectedId,
        product: null,
        status: "CLOSED",
        start_time: "",
        end_time: "",
        winning_bid_amount: null,
        winner_user_id: null,
        winner_name: undefined,
        winner_phone: undefined,
        total_bids: bids.length,
        lowest_unique_bid: null,
        bids: [],
        created_at: "",
      });
      setShowWinner(true);
      toast("Auction force-closed without winner", "success");
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : undefined) || "Failed to force-close auction", "error");
    } finally {
      setForceClosing(false);
      setShowForceCloseConfirm(false);
    }
  };

  const handleDrawWinner = async () => {
    if (!selectedId) return;
    setWinnerLoading(true);
    try {
      const result = await api.drawWinner(selectedId);
      setWinnerPage(0);
      setWinner(result);
      setShowWinner(true);
    } catch (e: unknown) {
      toast((e instanceof Error ? e.message : undefined) || "Failed to draw winner", "error");
    } finally {
      setWinnerLoading(false);
    }
  };

  if (!selectedId || !liveAuction) {
    return (
      <AdminLayout title="Monitor Auction">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gavel className="size-10 text-neutral-300" />
          <p className="mt-4 text-sm font-bold text-neutral-500">
            No auction selected
          </p>
          <button
            onClick={goBack}
            className="mt-4 rounded-xl bg-awash-blue px-4 py-2 text-xs font-bold text-white"
          >
            Browse Active Auctions
          </button>
        </div>
      </AdminLayout>
    );
  }

  const isClosed =
    liveAuction.status === "closed" ||
    (liveAuction.endTime &&
      new Date(liveAuction.endTime).getTime() < Date.now());
  const seconds = liveAuction.timeLeft;
  const endingSoon = seconds > 0 && seconds < 3600;
  const bidCount = liveAuction.totalBids || liveAuction.bidders || 0;
  const bidProgress = liveAuction.maxBid
    ? Math.min(bidCount / liveAuction.maxBid, 1)
    : 0;
  const isUrgent = bidProgress > 0.8;
  const WINNERS_PAGE_SIZE = 6;
  const visibleWinners =
    winner?.all_winners?.slice(0, (winnerPage + 1) * WINNERS_PAGE_SIZE) ?? [];
  const hasMoreWinners =
    (winner?.all_winners?.length ?? 0) > visibleWinners.length;

  return (
    <AdminLayout
      title="Auction Monitor"
      subtitle={liveAuction.name}
      actions={
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-all hover:bg-neutral-50"
        >
          <ArrowLeft className="size-3.5" /> All Auctions
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="space-y-4"
      >
        {/* Live status banner */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -12 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <div
            className={`flex items-center justify-between rounded-2xl border p-4 ${
              isClosed
                ? "border-neutral-200 bg-neutral-50"
                : endingSoon
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${
                  isClosed
                    ? "bg-neutral-200 text-neutral-500"
                    : endingSoon
                      ? "bg-amber-200 text-amber-700"
                      : "bg-emerald-200 text-emerald-700"
                }`}
              >
                {isClosed ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Radio className="size-5 animate-pulse" />
                )}
              </div>
              <div>
                <p
                  className={`font-display text-sm font-bold ${isClosed ? "text-neutral-600" : endingSoon ? "text-amber-800" : "text-emerald-800"}`}
                >
                  {isClosed
                    ? "Auction Closed"
                    : endingSoon
                      ? "Ending Soon"
                      : "Live"}
                </p>
                <p className="text-xs font-medium text-neutral-400">
                  {isClosed
                    ? "This auction has ended"
                    : "Real-time monitoring active"}
                </p>
              </div>
            </div>
            {!isClosed && (
              <div className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 shadow-sm">
                <Clock className="size-4 text-awash-blue" />
                <Countdown seconds={seconds} size="md" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Product + stats grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Product card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,43,92,0.04)] lg:col-span-1"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 ring-1 ring-awash-blue/10">
              {liveAuction.images?.[0] ? (
                <img
                  src={liveAuction.images[0]}
                  alt={liveAuction.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-neutral-300">
                  <Gavel className="size-10" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-display text-sm font-bold text-awash-blue">
                {liveAuction.name}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-neutral-400">
                {liveAuction.category || "No category"}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">
                  Payment
                </span>
                <span className="font-display text-sm font-extrabold text-primary">
                  {formatCurrency(liveAuction.marketPrice)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="grid grid-cols-2 gap-3 lg:col-span-2"
          >
            <StatCard
              icon={<Gavel className="size-5" />}
              label="Total Bids"
              value={bidCount}
              accent="blue"
              delay={0}
            />
            <StatCard
              icon={<Users className="size-5" />}
              label="Unique Bidders"
              value={liveAuction.uniqueBidders ?? "—"}
              accent="gold"
              delay={0.04}
            />
            <StatCard
              icon={<TrendingDown className="size-5" />}
              label="Min Bids Required"
              value={liveAuction.minBid ?? "—"}
              accent="amber"
              delay={0.08}
            />
            <StatCard
              icon={<Hash className="size-5" />}
              label="Max Bid Capacity"
              value={liveAuction.maxBid ?? "—"}
              accent="emerald"
              delay={0.12}
            />

            {/* Bid capacity progress */}
            {liveAuction.maxBid && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="col-span-2 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-awash-blue">
                    Bid Capacity
                  </span>
                  <span className="text-xs font-medium text-neutral-400">
                    {bidCount} / {liveAuction.maxBid}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bidProgress * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: isUrgent ? "#F97316" : "#10B981",
                    }}
                  />
                </div>
                {isUrgent && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-orange-600">
                    <AlertCircle className="size-3" /> Almost at capacity
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Admin actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]"
        >
          <h2 className="font-display text-sm font-bold text-awash-blue">
            Admin Actions
          </h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={handleViewBids}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-xs font-bold text-awash-blue transition-all hover:bg-awash-blue/5 hover:border-awash-blue/30 active:scale-95"
            >
              <Eye className="size-3.5" /> View All Bids ({bidCount})
            </button>
            {!isClosed && (
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={closing}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-destructive/20 transition-all hover:bg-destructive/90 disabled:opacity-50"
              >
                {closing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {closing ? "Closing…" : "Close Auction & Draw Winner"}
              </button>
            )}
            {isClosed && (
              <button
                onClick={handleDrawWinner}
                disabled={winnerLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2.5 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-50"
              >
                {winnerLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Crown className="size-3.5" />
                )}
                {winnerLoading ? "Drawing…" : "Draw / View Winner"}
              </button>
            )}
            <button
              onClick={() => {
                refreshAuctions();
                fetchBids();
              }}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-xs font-bold text-neutral-600 transition-all hover:bg-neutral-50"
            >
              <RefreshCw className="size-3.5" /> Refresh Data
            </button>
          </div>

          {/* Min-bid warning */}
          {liveAuction.minBid && bidCount < liveAuction.minBid && !isClosed && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="size-4 shrink-0 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">
                Only {bidCount}/{liveAuction.minBid} bids — auction may
                auto-extend if under minimum.
              </p>
            </div>
          )}
        </motion.div>

        {/* Recent bids preview */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-awash-blue">
              Recent Bids
            </h2>
            <button
              onClick={handleViewBids}
              className="text-[11px] font-bold text-primary transition-colors hover:text-awash-gold-dark"
            >
              View all
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {bids.slice(0, 5).map((b, i) => {
              const coded = `User ${b.user_id?.slice(0, 8) || "—"}`;
              const display = b.user_name ? `${b.user_name} (${coded})` : coded;
              return (
                <div
                  key={b.id || i}
                  className="flex items-center justify-between rounded-xl bg-neutral-50/80 backdrop-blur-sm px-3 py-2 transition-all hover:bg-neutral-100"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                    <span className="flex size-5 items-center justify-center rounded-full bg-awash-blue/10 text-[9px] font-bold text-awash-blue/60">
                      {i + 1}
                    </span>
                    {display}
                  </span>
                  <span className="font-display text-sm font-bold text-awash-blue">
                    {b.amount_encrypted
                      ? formatMaskedCurrency()
                      : formatCurrency(b.amount)}
                  </span>
                </div>
              );
            })}
            {bids.length === 0 && (
              <p className="py-4 text-center text-xs font-medium text-neutral-400">
                No bids yet. Click "View All Bids" to refresh.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Bids Modal */}
      <Modal
        open={showBids}
        onClose={() => setShowBids(false)}
        title={`All Bids (${bids.length})`}
        size="lg"
      >
        <button
          onClick={fetchBids}
          className="mb-3 flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
        <div className="rounded-xl border border-border/40">
          <DataTable
            columns={[
              {
                key: "user",
                header: "User",
                render: (b: BidRow) => {
                  const coded = `User ${b.user_id?.slice(0, 8) || "—"}`;
                  const display = b.user_name
                    ? `${b.user_name} (${coded})`
                    : coded;
                  return (
                    <span className="text-xs font-semibold text-neutral-600">
                      {display}
                    </span>
                  );
                },
              },
              {
                key: "amount",
                header: "Amount",
                align: "right" as const,
                render: (b: BidRow) => (
                  <span className="font-display text-sm font-bold text-awash-blue">
                    {b.amount_encrypted
                      ? formatMaskedCurrency()
                      : formatCurrency(b.amount)}
                  </span>
                ),
              },
              {
                key: "ticket",
                header: "Ticket",
                render: (b: BidRow) =>
                  b.ticket_number ? (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-500">
                      {b.ticket_number}
                    </span>
                  ) : (
                    <span className="text-neutral-300">—</span>
                  ),
              },
              {
                key: "time",
                header: "Time",
                align: "right" as const,
                render: (b: BidRow) => (
                  <span className="text-[11px] font-medium text-neutral-400">
                    {b.bid_time
                      ? new Date(b.bid_time).toLocaleString("en", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "—"}
                  </span>
                ),
              },
            ]}
            rows={bids}
            rowKey={(b) => b.id || b.ticket_number || b.bid_time}
            loading={bidsLoading}
            showPagination
            pageSize={10}
            empty={{
              icon: <Gavel className="size-6" />,
              title: "No bids placed yet",
              message: "Bids will appear here in real-time",
            }}
          />
        </div>
      </Modal>

      {/* Close confirmation */}
      <ConfirmDialog
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleClose}
        title="Close this auction?"
        message={`This will close "${liveAuction.name}" and immediately draw the winner. This action cannot be undone.`}
        confirmLabel="Close & Draw Winner"
        destructive
      />

      {/* Force-close confirmation (no unique bids) */}
      <ConfirmDialog
        open={showForceCloseConfirm}
        onClose={() => setShowForceCloseConfirm(false)}
        onConfirm={handleForceClose}
        title="No Unique Bids Found"
        message={
          forceCloseWarning ||
          `"${liveAuction.name}" has no unique bids. Force-close without a winner?`
        }
        confirmLabel={
          forceClosing ? "Force-Closing..." : "Force Close Without Winner"
        }
        destructive
      />

      {/* Winner result modal */}
      <Modal
        open={showWinner}
        onClose={() => setShowWinner(false)}
        title="Winner Result"
        size="md"
      >
        {winner ? (
          <div className="space-y-4">
            {winner.winning_bid_amount != null && winner.winner_user_id ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-awash-gold-light shadow-gold-glow-lg"
                  >
                    <Crown className="size-8 text-white" />
                  </motion.div>
                  <h3 className="mt-4 font-display text-lg font-extrabold text-awash-blue">
                    Winner Found!
                  </h3>
                  <p className="mt-1 text-sm font-medium text-neutral-500">
                    {(() => {
                      const fn = winner.winner_name
                        ? winner.winner_name.split(" ")[0]
                        : null;
                      const mp = winner.winner_phone
                        ? winner.winner_phone.slice(0, 4) +
                          "XXXX" +
                          winner.winner_phone.slice(-2)
                        : null;
                      return fn && mp ? `${fn} ${mp}` : fn || mp || "Winner";
                    })()}
                  </p>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase text-neutral-400">
                        Winning Bid
                      </p>
                      <p className="font-display text-xl font-extrabold text-primary">
                        {formatCurrency(winner.winning_bid_amount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase text-neutral-400">
                        Total Bids
                      </p>
                      <p className="font-display text-xl font-extrabold text-awash-blue">
                        {winner.total_bids ?? bidCount}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase text-neutral-400">
                        Savings
                      </p>
                      <p className="font-display text-xl font-extrabold text-emerald-600">
                        {liveAuction.marketPrice > 0
                          ? Math.round(
                              (1 -
                                winner.winning_bid_amount /
                                  liveAuction.marketPrice) *
                                100,
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {!!winner.all_winners?.length && (
                  <div className="space-y-2 rounded-2xl border border-border/60 bg-neutral-50/80 p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-awash-blue">
                        Winner List
                      </h4>
                      <span className="text-xs font-semibold text-neutral-500">
                        {winner.winners_count ?? winner.all_winners.length}{" "}
                        total
                      </span>
                    </div>
                    <div className="space-y-2">
                      {visibleWinners.map((entry) => {
                        const maskedPhone = entry.phone
                          ? entry.phone.slice(0, 4) +
                            "XXXX" +
                            entry.phone.slice(-2)
                          : null;
                        return (
                          <div
                            key={`${entry.user_id}-${entry.rank}`}
                            className="flex items-center justify-between rounded-xl border border-border/50 bg-white px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-bold text-foreground">
                                #{entry.rank}{" "}
                                {entry.name || maskedPhone || "Winner"}
                              </p>
                              <p className="text-xs font-medium text-neutral-500">
                                {maskedPhone || entry.user_id}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-sm font-extrabold text-primary">
                                {formatCurrency(entry.amount)}
                              </p>
                              <p className="text-[10px] font-semibold uppercase text-neutral-400">
                                {entry.payment_status || "PENDING"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {hasMoreWinners && (
                      <button
                        onClick={() => setWinnerPage((page) => page + 1)}
                        className="mt-1 flex w-full items-center justify-center rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-all hover:bg-neutral-50"
                      >
                        Show{" "}
                        {Math.min(
                          WINNERS_PAGE_SIZE,
                          winner.all_winners.length - visibleWinners.length,
                        )}{" "}
                        more winners
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <XCircle className="size-8" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold text-neutral-500">
                  No Winner
                </h3>
                <p className="mt-1 text-sm font-medium text-neutral-400">
                  No unique bid was found. The auction has been closed without a
                  winner.
                </p>
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowWinner(false)}
                className="h-11 flex-1 rounded-xl border border-border/60 bg-white text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowWinner(false);
                  go("admin-monitor");
                }}
                className="h-11 flex-1 rounded-xl bg-awash-blue text-sm font-bold text-white transition-all hover:bg-awash-blue-light"
              >
                Back to List
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
