import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
} from "react-native";
import {
  Radio,
  Users,
  TrendingDown,
  Eye,
  Gavel,
  X,
  RefreshCw,
  Hash,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Crown,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { api, type ApiWinnerResult } from "../api";
import { AppBar, CTAButton, Card } from "../components/AuctionUI";
import { Countdown } from "../components/Countdown";
import { useAuctionSocket, applySocketUpdate } from "../hooks/useAuctionSocket";
import { formatCurrency, formatMaskedCurrency } from "../mockDataV0";
import { colors } from "../theme";

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
  const { go, goBack, selectedId, getAuction, refreshAuctions } = useApp();
  const auction = getAuction(selectedId);

  const [liveAuction, setLiveAuction] = useState(auction);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const [closing, setClosing] = useState(false);
  const [winner, setWinner] = useState<ApiWinnerResult | null>(null);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerPage, setWinnerPage] = useState(0);

  useEffect(() => {
    if (auction) setLiveAuction(auction);
  }, [auction]);

  const onSocketUpdate = useCallback((payload: any) => {
    setLiveAuction((prev) =>
      prev ? applySocketUpdate([prev], payload)[0] : prev,
    );
  }, []);

  useAuctionSocket(selectedId, onSocketUpdate);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => refreshAuctions(), 15000);
    return () => clearInterval(interval);
  }, [selectedId, refreshAuctions]);

  const fetchBids = useCallback(async () => {
    if (!selectedId) return;
    setBidsLoading(true);
    try {
      const result = await api.getAuctionBids(selectedId);
      setBids(result as BidRow[]);
    } catch {
      // silent
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
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : undefined) || ((e as any)?.response?.data?.message) || "";
      if (
        msg.toLowerCase().includes("no unique bids") ||
        msg.toLowerCase().includes("no unique winner")
      ) {
        Alert.alert(
          "No Unique Bids Found",
          msg ||
            "This auction has no unique bids. Force-close without a winner?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Force Close",
              style: "destructive",
              onPress: handleForceClose,
            },
          ],
        );
      } else {
        Alert.alert("Error", msg || "Failed to close auction");
      }
    } finally {
      setClosing(false);
    }
  };

  const handleForceClose = async () => {
    if (!selectedId) return;
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
        winner_name: null,
        winner_phone: null,
        total_bids: bids.length,
        unique_bidders: 0,
        lowest_unique_bid: null,
        all_winners: [],
        bids: [],
        created_at: "",
        payment_status: null,
        payment_deadline: null,
      });
      setShowWinner(true);
    } catch (e: unknown) {
      Alert.alert("Error", (e instanceof Error ? e.message : undefined) || "Failed to force-close auction");
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
      Alert.alert("Error", (e instanceof Error ? e.message : undefined) || "Failed to draw winner");
    } finally {
      setWinnerLoading(false);
    }
  };

  if (!selectedId || !liveAuction) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppBar title="Monitor Auction" onBack={goBack} />
        <View style={{ alignItems: "center", paddingVertical: 80 }}>
          <Gavel size={40} color={colors.neutralGray300} />
          <Text
            style={{
              marginTop: 16,
              fontSize: 14,
              fontWeight: "700",
              color: colors.neutralGray500,
            }}
          >
            No auction selected
          </Text>
          <View style={{ marginTop: 16, width: 200 }}>
            <CTAButton variant="navy" onPress={() => go("admin-monitor")}>
              Browse Active Auctions
            </CTAButton>
          </View>
        </View>
      </View>
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

  const bannerBg = isClosed
    ? colors.neutralGray100
    : endingSoon
      ? "#FFFBEB"
      : colors.emerald50;
  const bannerBorder = isClosed
    ? colors.neutralGray200
    : endingSoon
      ? "#FDE68A"
      : colors.emerald200;
  const bannerTitle = isClosed
    ? colors.neutralGray600
    : endingSoon
      ? colors.orange + "CC"
      : colors.emerald800;
  const bannerIconBg = isClosed
    ? colors.neutralGray200
    : endingSoon
      ? "#FDE68A"
      : colors.emerald200;
  const bannerIconColor = isClosed
    ? colors.neutralGray500
    : endingSoon
      ? colors.orange
      : colors.emerald700;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Auction Monitor"
        onBack={goBack}
        right={
          <TouchableOpacity
            onPress={() => {
              refreshAuctions();
              fetchBids();
            }}
            style={{
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={colors.navyForeground} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: colors.mutedForeground,
            marginBottom: 12,
          }}
          numberOfLines={1}
        >
          {liveAuction.name}
        </Text>

        <View
          style={[
            s.banner,
            { backgroundColor: bannerBg, borderColor: bannerBorder },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
            }}
          >
            <View style={[s.bannerIcon, { backgroundColor: bannerIconBg }]}>
              {isClosed ? (
                <CheckCircle2 size={20} color={bannerIconColor} />
              ) : (
                <Radio size={20} color={bannerIconColor} />
              )}
            </View>
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: bannerTitle }}
              >
                {isClosed
                  ? "Auction Closed"
                  : endingSoon
                    ? "Ending Soon"
                    : "Live"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: colors.neutralGray400,
                }}
              >
                {isClosed
                  ? "This auction has ended"
                  : "Real-time monitoring active"}
              </Text>
            </View>
          </View>
          {!isClosed && (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: colors.mutedForeground,
                  marginBottom: 4,
                }}
              >
                Time Left
              </Text>
              <Countdown seconds={seconds} size="sm" labels={false} />
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <Card style={{ flex: 1, alignItems: "center", padding: 16 }}>
            {liveAuction.images?.[0] ? (
              <Image
                source={{ uri: liveAuction.images[0] }}
                style={{ width: 72, height: 72, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: colors.secondary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Gavel size={24} color={colors.neutralGray300} />
              </View>
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.awashBlue,
                marginTop: 10,
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {liveAuction.name}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "500",
                color: colors.neutralGray400,
                marginTop: 2,
              }}
            >
              {liveAuction.category || "No category"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: colors.mutedForeground,
                }}
              >
                Payment
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: colors.primary,
                }}
              >
                {formatCurrency(liveAuction.marketPrice)}
              </Text>
            </View>
          </Card>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <StatBox
            icon={<Gavel size={16} color={colors.awashBlue} />}
            label="Total Bids"
            value={bidCount}
          />
          <StatBox
            icon={<Users size={16} color={colors.primary} />}
            label="Unique Bidders"
            value={liveAuction.uniqueBidders ?? "—"}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <StatBox
            icon={<Hash size={16} color={colors.orange} />}
            label="Min Bids Required"
            value={liveAuction.minBid ?? "—"}
          />
          <StatBox
            icon={<TrendingDown size={16} color={colors.emerald600} />}
            label="Max Bid Capacity"
            value={liveAuction.maxBid ?? "—"}
          />
        </View>

        {liveAuction.maxBid && (
          <Card style={{ padding: 16, marginTop: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.awashBlue,
                }}
              >
                Bid Capacity
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: colors.mutedForeground,
                }}
              >
                {bidCount} / {liveAuction.maxBid}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.neutralGray100,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${bidProgress * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: isUrgent ? colors.orange : colors.emerald500,
                }}
              />
            </View>
            {isUrgent && (
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: "700",
                  color: colors.orange,
                }}
              >
                Almost at capacity
              </Text>
            )}
          </Card>
        )}

        <Card style={{ padding: 16, marginTop: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.awashBlue,
              marginBottom: 12,
            }}
          >
            Admin Actions
          </Text>
          <TouchableOpacity onPress={handleViewBids} style={s.actionBtn}>
            <Eye size={14} color={colors.awashBlue} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.awashBlue,
              }}
            >
              View All Bids ({bidCount})
            </Text>
          </TouchableOpacity>
          {!isClosed && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Close this auction?",
                  `This will close "${liveAuction.name}" and immediately draw the winner. This action cannot be undone.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Close & Draw Winner",
                      style: "destructive",
                      onPress: handleClose,
                    },
                  ],
                )
              }
              disabled={closing}
              style={[s.actionBtn, s.closeBtn]}
            >
              {closing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <XCircle size={14} color={colors.white} />
              )}
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: colors.white }}
              >
                {closing ? "Closing..." : "Close Auction & Draw Winner"}
              </Text>
            </TouchableOpacity>
          )}
          {isClosed && (
            <TouchableOpacity
              onPress={handleDrawWinner}
              disabled={winnerLoading}
              style={[s.actionBtn, s.goldBtn]}
            >
              {winnerLoading ? (
                <ActivityIndicator size="small" color={colors.awashBlue} />
              ) : (
                <Crown size={14} color={colors.awashBlue} />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.awashBlue,
                }}
              >
                {winnerLoading ? "Drawing..." : "Draw / View Winner"}
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {liveAuction.minBid && bidCount < liveAuction.minBid && !isClosed && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#FDE68A",
              backgroundColor: "#FFFBEB",
              padding: 12,
              marginTop: 12,
            }}
          >
            <AlertCircle size={16} color={colors.orange} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: colors.orange,
                flex: 1,
              }}
            >
              Only {bidCount}/{liveAuction.minBid} bids — auction may
              auto-extend if under minimum.
            </Text>
          </View>
        )}

        <Card style={{ padding: 16, marginTop: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.awashBlue,
              }}
            >
              Recent Bids
            </Text>
            <TouchableOpacity onPress={handleViewBids}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                View all
              </Text>
            </TouchableOpacity>
          </View>
          {bids.length === 0 ? (
            <Text
              style={{
                textAlign: "center",
                fontSize: 12,
                fontWeight: "500",
                color: colors.neutralGray400,
                paddingVertical: 12,
              }}
            >
              No bids yet. Tap "View All Bids" to refresh.
            </Text>
          ) : (
            bids.slice(0, 5).map((b, i) => {
              const coded = `User ${b.user_id?.slice(0, 8) || "—"}`;
              const display = b.user_name ? `${b.user_name} (${coded})` : coded;
              return (
                <View
                  key={b.id || i}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderRadius: 12,
                    backgroundColor: colors.neutralGray50,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: colors.awashBlue + "14",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.awashBlue + "99",
                        }}
                      >
                        {i + 1}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: colors.neutralGray500,
                      }}
                      numberOfLines={1}
                    >
                      {display}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.awashBlue,
                    }}
                  >
                    {b.amount_encrypted
                      ? formatMaskedCurrency()
                      : formatCurrency(b.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>

      <Modal
        visible={showBids}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBids(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>All Bids ({bids.length})</Text>
              <TouchableOpacity
                onPress={() => setShowBids(false)}
                style={{ padding: 4 }}
              >
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={fetchBids}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <RefreshCw size={13} color={colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.mutedForeground,
                  }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
              {bidsLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
            <FlatList
              data={bids}
              keyExtractor={(b, i) =>
                b.id || b.ticket_number || b.bid_time || String(i)
              }
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item: b, index }) => {
                const coded = `User ${b.user_id?.slice(0, 8) || "—"}`;
                const display = b.user_name
                  ? `${b.user_name} (${coded})`
                  : coded;
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderRadius: 12,
                      backgroundColor: colors.neutralGray50,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: colors.neutralGray600,
                        }}
                        numberOfLines={1}
                      >
                        {display}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 2,
                        }}
                      >
                        {b.ticket_number ? (
                          <Text
                            style={{
                              borderRadius: 6,
                              backgroundColor: colors.neutralGray100,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              fontSize: 9,
                              fontWeight: "600",
                              color: colors.neutralGray500,
                            }}
                          >
                            {b.ticket_number}
                          </Text>
                        ) : null}
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "400",
                            color: colors.neutralGray400,
                          }}
                        >
                          {b.bid_time
                            ? new Date(b.bid_time).toLocaleTimeString("en", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "—"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.awashBlue,
                      }}
                    >
                      {b.amount_encrypted
                        ? formatMaskedCurrency()
                        : formatCurrency(b.amount)}
                    </Text>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: "500",
                    color: colors.neutralGray400,
                    paddingVertical: 24,
                  }}
                >
                  {bidsLoading ? "Loading bids..." : "No bids placed yet"}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWinner}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWinner(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {winner ? (
              <View>
                {winner.winning_bid_amount != null && winner.winner_user_id ? (
                  <View style={{ gap: 16 }}>
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: colors.primary,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Crown size={32} color={colors.white} />
                      </View>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "800",
                          color: colors.awashBlue,
                          marginTop: 16,
                        }}
                      >
                        Winner Found!
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "500",
                          color: colors.neutralGray500,
                          marginTop: 4,
                        }}
                      >
                        {(() => {
                          const fn = winner.winner_name
                            ? winner.winner_name.split(" ")[0]
                            : null;
                          const mp = winner.winner_phone
                            ? winner.winner_phone.slice(0, 4) +
                              "XXXX" +
                              winner.winner_phone.slice(-2)
                            : null;
                          return fn && mp
                            ? `${fn} ${mp}`
                            : fn || mp || "Winner";
                        })()}
                      </Text>
                      <View
                        style={{ flexDirection: "row", gap: 24, marginTop: 16 }}
                      >
                        <View style={{ alignItems: "center" }}>
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              color: colors.neutralGray400,
                            }}
                          >
                            Winning Bid
                          </Text>
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "800",
                              color: colors.primary,
                              marginTop: 2,
                            }}
                          >
                            {formatCurrency(winner.winning_bid_amount)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              color: colors.neutralGray400,
                            }}
                          >
                            Total Bids
                          </Text>
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "800",
                              color: colors.awashBlue,
                              marginTop: 2,
                            }}
                          >
                            {winner.total_bids ?? bidCount}
                          </Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              color: colors.neutralGray400,
                            }}
                          >
                            Savings
                          </Text>
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "800",
                              color: colors.emerald600,
                              marginTop: 2,
                            }}
                          >
                            {liveAuction.marketPrice > 0
                              ? Math.round(
                                  (1 -
                                    winner.winning_bid_amount /
                                      liveAuction.marketPrice) *
                                    100,
                                )
                              : 0}
                            %
                          </Text>
                        </View>
                      </View>
                    </View>

                    {!!winner.all_winners?.length && (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.neutralGray50,
                          borderRadius: 16,
                          padding: 12,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "800",
                              color: colors.awashBlue,
                            }}
                          >
                            Winner List
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: colors.neutralGray500,
                            }}
                          >
                            {winner.all_winners.length} total
                          </Text>
                        </View>
                        {visibleWinners.map((entry) => {
                          const maskedPhone = entry.phone
                            ? entry.phone.slice(0, 4) +
                              "XXXX" +
                              entry.phone.slice(-2)
                            : null;
                          return (
                            <View
                              key={`${entry.user_id}-${entry.rank}`}
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.white,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                              }}
                            >
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "700",
                                    color: colors.foreground,
                                  }}
                                >
                                  #{entry.rank}{" "}
                                  {entry.name || maskedPhone || "Winner"}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "500",
                                    color: colors.neutralGray500,
                                    marginTop: 2,
                                  }}
                                >
                                  {maskedPhone || entry.user_id}
                                </Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    fontWeight: "800",
                                    color: colors.primary,
                                  }}
                                >
                                  {formatCurrency(entry.amount)}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: "600",
                                    color: colors.neutralGray400,
                                    marginTop: 2,
                                  }}
                                >
                                  {entry.payment_status || "PENDING"}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                        {hasMoreWinners && (
                          <TouchableOpacity
                            onPress={() => setWinnerPage((page) => page + 1)}
                            activeOpacity={0.85}
                            style={{
                              marginTop: 4,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: colors.border,
                              backgroundColor: colors.white,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: colors.neutralGray600,
                              }}
                            >
                              Show{" "}
                              {Math.min(
                                WINNERS_PAGE_SIZE,
                                winner.all_winners.length -
                                  visibleWinners.length,
                              )}{" "}
                              more winners
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: colors.neutralGray100,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <XCircle size={32} color={colors.neutralGray400} />
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: colors.neutralGray500,
                        marginTop: 16,
                      }}
                    >
                      No Winner
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: colors.neutralGray400,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      No unique bid was found. The auction has been closed
                      without a winner.
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
                  <View style={{ flex: 1 }}>
                    <CTAButton
                      variant="outline"
                      onPress={() => setShowWinner(false)}
                    >
                      Close
                    </CTAButton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <CTAButton
                      variant="navy"
                      onPress={() => {
                        setShowWinner(false);
                        goBack();
                      }}
                    >
                      Back to List
                    </CTAButton>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: colors.secondary,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: colors.awashBlue,
          fontVariant: ["tabular-nums"],
          marginTop: 8,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "500",
          color: colors.mutedForeground,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </Card>
  );
}


const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 12,
    marginBottom: 10,
  },
  closeBtn: {
    borderColor: colors.destructive,
    backgroundColor: colors.destructive,
  },
  goldBtn: { borderColor: colors.primary, backgroundColor: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.awashBlue },
});
