import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Trophy,
  CreditCard,
  PartyPopper,
  AlertTriangle,
  Users,
  Clock,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Info,
  Share2,
  ArrowLeft,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { CTAButton, Card } from "../components/AuctionUI";
import { WinnerPaymentCta } from "../components/WinnerPaymentCta";
import { WinnerStatsCard } from "../components/WinnerStatsCard";
import { api, type ApiWinnerResult, type ApiAuctionResult, type ApiWinnerInfo } from "../api";
import { formatCurrency } from "../mockDataV0";
import { colors } from "../theme";
import { isStaffRole } from "@guessx/api";

function formatDeadlineRemaining(hrs: number | null): string {
  if (hrs == null) return ''
  if (hrs <= 0) return 'Expired'
  const days = Math.floor(hrs / 24)
  const remHrs = hrs % 24
  if (days >= 30) {
    const months = Math.floor(days / 30)
    const remDays = days % 30
    return remDays > 0 ? `${months}mo ${remDays}d left` : `${months} months left`
  }
  if (days > 0) return `${days}d ${remHrs}h left`
  return `${hrs}h left`
}

export function WinnerScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0
  );
  const { go, goBack, selectedId, getAuction, user } = useApp();
  const isAdmin = isStaffRole(user?.role);
  const auction = getAuction(selectedId);
  const [winner, setWinner] = useState<
    ApiWinnerResult | ApiAuctionResult | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pingAnim = useRef(new Animated.Value(1)).current;
  const [bidsPage, setBidsPage] = useState(0);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setBidsPage(0);
    const fetch = isAdmin
      ? api.drawWinner(selectedId)
      : api.getAuctionResult(selectedId);
    fetch
      .then(setWinner as any)
      .catch((e) => setError((e instanceof Error ? e.message : String(e)) || "Failed to load winner"))
      .finally(() => setLoading(false));
  }, [selectedId, isAdmin]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, {
          toValue: 1.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (!auction) return null;

  const winnerPhone = winner?.winner_phone || null;
  const maskPhone = (p: string | null) =>
    p ? p.slice(0, 4) + "XXXX" + p.slice(-2) : null;
  const maskedPhone = winnerPhone ? maskPhone(winnerPhone) : null;
  const firstName = winner?.winner_name
    ? winner.winner_name.split(" ")[0]
    : null;
  const winnerName =
    firstName && maskedPhone
      ? `${firstName} ${maskedPhone}`
      : firstName || maskedPhone || null;
  const deadline = winner?.payment_deadline
    ? new Date(winner.payment_deadline)
    : null;
  const deadlineHrs = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000))
    : null;
  const allWinners: ApiWinnerInfo[] | undefined =
    "all_winners" in (winner || {})
      ? (winner as ApiAuctionResult).all_winners
      : undefined;
  const userWinnerInfo = allWinners?.find((w) => w.user_id === user?.id);
  const isPrimaryWinner = winner?.winner_user_id === user?.id;
  const isSecondWinnerAssigned = Boolean(
    auction.second_winner_assigned ||
      ("second_winner_assigned" in (winner || {}) &&
        (winner as ApiAuctionResult & { second_winner_assigned?: boolean })
          .second_winner_assigned),
  );
  const isPaymentExpired = (deadlineHrs !== null && deadlineHrs <= 0) ||
    auction.payment_status === "PAYMENT_DEFAULTED" ||
    userWinnerInfo?.payment_status === "DEFAULTED" ||
    userWinnerInfo?.payment_status === "EXPIRED";

  type BidRow = { amount: number; ticket_number?: string; user_id?: string; user_name?: string | null; bid_time?: string };
  const allBids: BidRow[] =
    "bids" in (winner || {})
      ? ((winner as ApiAuctionResult).bids ?? []).map((bid) => ({
          ...bid,
          amount: Number(bid.amount),
        }))
      : [];
  const amountCount = new Map<number, number>();
  allBids.forEach((b) =>
    amountCount.set(b.amount, (amountCount.get(b.amount) || 0) + 1),
  );
  const winningAmount =
    winner?.winning_bid_amount != null
      ? Number(winner.winning_bid_amount)
      : null;
  const lowerAmounts =
    winningAmount != null && allBids.length > 0
      ? [
          ...new Set(
            allBids
              .filter((b) => b.amount < winningAmount)
              .map((b) => b.amount),
          ),
        ].sort((a, b) => a - b)
      : [];
  const lowerBidsGrouped = lowerAmounts.map((amount: number) => ({
    amount,
    count: amountCount.get(amount) || 1,
  }));
  const lowerBidLevels = lowerBidsGrouped.length;
  const lowerBidEntries = lowerBidsGrouped.reduce(
    (sum: number, bid: { amount: number; count: number }) => sum + bid.count,
    0,
  );
  const lowestBlockedAmount = lowerBidsGrouped[0]?.amount ?? null;
  const transparencyMessage =
    winningAmount == null
      ? "No winning amount was found for this auction."
      : lowerBidLevels > 0
        ? `There ${lowerBidLevels === 1 ? "was" : "were"} ${lowerBidLevels} lower bid level${lowerBidLevels === 1 ? "" : "s"}, but each one was repeated so none of them qualified.`
        : "No lower bid amounts were placed, so this winning amount was already the first valid unique bid.";
  const BIDS_PAGE_SIZE = 8;
  const totalBidPages = Math.max(
    1,
    Math.ceil(lowerBidsGrouped.length / BIDS_PAGE_SIZE),
  );
  const currentBidsPage = Math.min(bidsPage, totalBidPages - 1);
  const pagedBids = lowerBidsGrouped.slice(
    currentBidsPage * BIDS_PAGE_SIZE,
    (currentBidsPage + 1) * BIDS_PAGE_SIZE,
  );
  const pageStart =
    lowerBidsGrouped.length === 0 ? 0 : currentBidsPage * BIDS_PAGE_SIZE + 1;
  const pageEnd = currentBidsPage * BIDS_PAGE_SIZE + pagedBids.length;

  const handleShareWinner = async () => {
    try {
      const winStr = winningAmount != null ? formatCurrency(winningAmount) : 'Pending'
      await Share.share({
        message: `🏆 Guess X Auction Winner: ${auction.name} won at ${winStr}! Check out live Guess X auctions.`,
      })
    } catch {}
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <View style={s.gradient}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: topInset,
            height: topInset + 56,
          }}
        >
          <TouchableOpacity
            onPress={() => goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={s.winnerBadge}>
            <PartyPopper size={14} color={colors.primary} />
            <Text style={s.winnerBadgeText}>Winner Results</Text>
          </View>
          <TouchableOpacity
            onPress={handleShareWinner}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.15)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Share2 size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {isSecondWinnerAssigned && (
            <View style={{ width: "100%", marginBottom: 16 }}>
              <Card style={{ padding: 14, backgroundColor: colors.primary + "22", borderWidth: 1, borderColor: colors.primary + "55", borderRadius: 14, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Trophy size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}>
                    Second Winner Assigned
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#FFF", lineHeight: 18 }}>
                  You have been awarded this auction because the original winner did not complete payment within the specified timeframe.
                </Text>
              </Card>
            </View>
          )}

          <View style={{ position: "relative", marginTop: 16 }}>
            <Animated.View
              style={[
                s.pingRing,
                {
                  transform: [{ scale: pingAnim }],
                  opacity: pingAnim.interpolate({
                    inputRange: [1, 1.6],
                    outputRange: [0.4, 0],
                  }),
                },
              ]}
            />
            <View style={s.trophyCircle}>
              <Trophy size={48} strokeWidth={1.5} color={colors.white} />
            </View>
          </View>

          {loading ? (
            <View style={{ marginTop: 48, alignItems: "center", gap: 12 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.subtitle}>Calculating winner...</Text>
            </View>
          ) : error ? (
            <View style={{ marginTop: 40, alignItems: "center", gap: 8 }}>
              <AlertTriangle size={32} color="#FCD34D" />
              <Text style={s.subtitle}>{error}</Text>
            </View>
          ) : winner ? (
            <>
              <Text style={s.title}>
                {winner.winner_user_id ? "Winner Found!" : "No Winner"}
              </Text>
              <Text style={s.subtitle}>
                {winner.winner_user_id
                  ? `Lowest unique bid out of ${winner.total_bids} bids.`
                  : `No unique bids among ${winner.total_bids} bids.`}
              </Text>

              {winner.payment_status === "PAID" && (
                <View style={s.paidBadge}>
                  <CreditCard size={14} color={colors.emerald600} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.emerald600,
                    }}
                  >
                    Payment Complete
                  </Text>
                </View>
              )}

              {(winner.winner_user_id || winner.winning_bid_amount != null) && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 20,
                    marginTop: 24,
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <View style={s.productImageWrap}>
                      {auction.images?.[0] ? (
                        <Image
                          source={{ uri: auction.images[0] }}
                          style={{ width: 96, height: 96 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <ImageIcon size={32} color="#94a3b8" />
                      )}
                    </View>
                    <Text style={s.productName}>{auction.name}</Text>
                  </View>
                  <View style={s.winningBidBox}>
                    <Text style={s.winLabel}>Winning Bid</Text>
                    <Text style={s.winAmount}>
                      {formatCurrency(winner.winning_bid_amount ?? 0)}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: colors.emerald600 + "22",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: colors.emerald600 + "33",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "700",
                            color: colors.emerald600,
                          }}
                        >
                          Lowest valid unique bid
                        </Text>
                      </View>
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: colors.card,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "700",
                            color: colors.mutedForeground,
                          }}
                        >
                          1 winner at this amount
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground }}
                    >
                      Total Bids
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      {winner.total_bids}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground }}
                    >
                      Unique Bidders
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      {winner.unique_bidders}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground }}
                    >
                      Winner
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.navy,
                        textAlign: "right",
                      }}
                    >
                      {winnerName || "Unknown"}
                    </Text>
                  </View>
                  {winner.lowest_unique_bid != null && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{ fontSize: 12, color: colors.mutedForeground }}
                      >
                        Lowest Unique Bid
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: colors.emerald600,
                        }}
                      >
                        {formatCurrency(winner.lowest_unique_bid ?? 0)}
                      </Text>
                    </View>
                  )}
                  {deadlineHrs != null && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 4,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock
                          size={12}
                          color={
                            deadlineHrs < 6
                              ? colors.destructive
                              : colors.mutedForeground
                          }
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.mutedForeground,
                          }}
                        >
                          Payment Deadline
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color:
                            deadlineHrs < 24 ? colors.destructive : colors.navy,
                        }}
                      >
                        {formatDeadlineRemaining(deadlineHrs)}
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {winner.all_winners && winner.all_winners.length > 0 && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 16,
                    marginTop: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Users size={14} color={colors.primary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      All Winners ({winner.all_winners.length})
                    </Text>
                  </View>
                  {winner.all_winners.map((w, i) => {
                    const wDeadline = w.payment_deadline
                      ? new Date(w.payment_deadline)
                      : null;
                    const wDeadlineHrs = wDeadline
                      ? Math.max(
                          0,
                          Math.round(
                            (wDeadline.getTime() - Date.now()) / 3600000,
                          ),
                        )
                      : null;
                    const isCurrentUser = w.user_id === user?.id;
                    return (
                      <View
                        key={w.user_id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 6,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: colors.primary,
                            }}
                          >
                            #{w.rank ?? i + 1}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.mutedForeground,
                                }}
                                numberOfLines={1}
                              >
                                {(() => {
                                  const fn = w.name
                                    ? w.name.split(" ")[0]
                                    : null;
                                  const mp = w.phone
                                    ? maskPhone(w.phone)
                                    : null;
                                  return fn && mp
                                    ? `${fn} ${mp}`
                                    : fn || mp || `Winner #${i + 1}`;
                                })()}
                              </Text>
                              {isCurrentUser && (
                                <View
                                  style={{
                                    borderRadius: 4,
                                    backgroundColor: colors.primary + "22",
                                    paddingHorizontal: 4,
                                    paddingVertical: 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 8,
                                      fontWeight: "700",
                                      color: colors.primary,
                                    }}
                                  >
                                    You
                                  </Text>
                                </View>
                              )}
                            </View>
                            {w.payment_status && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                  marginTop: 2,
                                }}
                              >
                                {w.payment_status === "PAID" ? (
                                  <CheckCircle2
                                    size={8}
                                    color={colors.emerald600}
                                  />
                                ) : w.payment_status === "EXPIRED" ? (
                                  <XCircle
                                    size={8}
                                    color={colors.destructive}
                                  />
                                ) : null}
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "600",
                                    color:
                                      w.payment_status === "PAID"
                                        ? colors.emerald600
                                        : w.payment_status === "EXPIRED"
                                          ? colors.destructive
                                          : colors.mutedForeground,
                                  }}
                                >
                                  {w.payment_status}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: colors.navy,
                            }}
                          >
                            {formatCurrency(w.amount ?? 0)}
                          </Text>
                          {wDeadlineHrs != null &&
                            w.payment_status !== "PAID" && (
                              <Text
                                style={{
                                  fontSize: 8,
                                  color:
                                    wDeadlineHrs < 24
                                      ? colors.destructive
                                      : colors.mutedForeground,
                                }}
                              >
                                {formatDeadlineRemaining(wDeadlineHrs)}
                              </Text>
                            )}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              )}

              {userWinnerInfo && userWinnerInfo.payment_status !== "PAID" && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 16,
                    marginTop: 16,
                    borderColor: colors.primary + "20",
                    backgroundColor: colors.accent,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Info
                      size={14}
                      color={colors.primary}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: colors.navy,
                          marginBottom: 6,
                        }}
                      >
                        {isPrimaryWinner ? "Next Steps" : "Standby Status"}
                      </Text>
                      {isPrimaryWinner ? (
                        <View style={{ gap: 4 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.mutedForeground,
                              lineHeight: 16,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "700",
                              }}
                            >
                              1.{" "}
                            </Text>
                            Complete payment before the deadline
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.mutedForeground,
                              lineHeight: 16,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "700",
                              }}
                            >
                              2.{" "}
                            </Text>
                            Collect your item at the designated collection point
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.mutedForeground,
                              lineHeight: 16,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontWeight: "700",
                              }}
                            >
                              3.{" "}
                            </Text>
                            Present payment confirmation for collection
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.mutedForeground,
                            lineHeight: 16,
                          }}
                        >
                          You are ranked #{userWinnerInfo?.rank ?? "-"} and will
                          only be asked to pay if higher-ranked winners expire.
                          Your place is still visible here for transparency.
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              )}

              {winningAmount != null && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 16,
                    marginTop: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Info
                      size={14}
                      color={colors.awashBlue}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: colors.navy,
                        }}
                      >
                        Transparency Check
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          lineHeight: 16,
                          color: colors.mutedForeground,
                          marginTop: 4,
                        }}
                      >
                        {transparencyMessage}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        backgroundColor: colors.secondary,
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.mutedForeground,
                        }}
                      >
                        Lower levels
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 18,
                          fontWeight: "800",
                          color: colors.navy,
                        }}
                      >
                        {lowerBidLevels}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        backgroundColor: colors.secondary,
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.mutedForeground,
                        }}
                      >
                        Grouped bids
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 18,
                          fontWeight: "800",
                          color: colors.navy,
                        }}
                      >
                        {lowerBidEntries}
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        backgroundColor: colors.secondary,
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: colors.mutedForeground,
                        }}
                      >
                        Lowest blocked
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: "800",
                          color: colors.navy,
                        }}
                        numberOfLines={2}
                      >
                        {lowestBlockedAmount != null
                          ? formatCurrency(lowestBlockedAmount)
                          : "None"}
                      </Text>
                    </View>
                  </View>
                  {lowerBidLevels > 0 && (
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 10,
                        fontWeight: "500",
                        color: colors.mutedForeground,
                      }}
                    >
                      Each lower amount is shown once, with a flag showing how
                      many bidders repeated it.
                    </Text>
                  )}
                </Card>
              )}

              {"my_bid" in winner && winner.my_bid && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 16,
                    marginTop: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.navy,
                      marginBottom: 8,
                    }}
                  >
                    Your Bid
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: colors.mutedForeground }}
                    >
                      Amount
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      {formatCurrency(winner.my_bid.amount ?? 0)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: colors.mutedForeground }}
                    >
                      Fee Paid
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: winner.my_bid.service_fee_paid
                          ? colors.emerald600
                          : colors.destructive,
                      }}
                    >
                      {winner.my_bid.service_fee_paid ? "Yes" : "No"}
                    </Text>
                  </View>
                </Card>
              )}

              {allBids.length > 0 && (
                <Card
                  style={{
                    width: "100%",
                    maxWidth: 320,
                    padding: 16,
                    marginTop: 16,
                  }}
                >
                  <View style={{ marginBottom: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: colors.navy,
                          }}
                        >
                          Supporting Bids Below Winner
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.mutedForeground,
                            marginTop: 2,
                          }}
                        >
                          Grouped by amount so repeated levels only appear once.
                        </Text>
                      </View>
                      {lowerBidLevels > 0 && (
                        <View
                          style={{
                            borderRadius: 999,
                            backgroundColor: colors.white,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: colors.mutedForeground,
                            }}
                          >
                            {pageStart}-{pageEnd} of {lowerBidLevels}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* ── Winning bid always on top ── */}
                  {winningAmount != null &&
                    (() => {
                      const winnerBid = allBids.find(
                        (b: any) => b.amount === winningAmount,
                      );
                      if (!winnerBid) return null;
                      return (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 8,
                            marginBottom: 10,
                            backgroundColor: colors.emerald600 + "18",
                            borderWidth: 1,
                            borderColor: colors.emerald600 + "30",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              flex: 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: colors.emerald800,
                              }}
                              numberOfLines={1}
                            >
                              {winnerBid.user_name ||
                                (winnerBid.user_id ? winnerBid.user_id.slice(0, 8) : 'Unknown')}
                            </Text>
                            {winnerBid.user_id === user?.id && (
                              <View
                                style={{
                                  borderRadius: 4,
                                  backgroundColor: colors.primary + "22",
                                  paddingHorizontal: 4,
                                  paddingVertical: 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 8,
                                    fontWeight: "700",
                                    color: colors.primary,
                                  }}
                                >
                                  You
                                </Text>
                              </View>
                            )}
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <View
                              style={{
                                borderRadius: 4,
                                backgroundColor: colors.emerald600 + "22",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 9,
                                  fontWeight: "700",
                                  color: colors.emerald600,
                                }}
                              >
                                Winner
                              </Text>
                            </View>
                            <View
                              style={{
                                borderRadius: 4,
                                backgroundColor: colors.card,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderWidth: 1,
                                borderColor: colors.emerald600 + "30",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 9,
                                  fontWeight: "700",
                                  color: colors.emerald600,
                                }}
                              >
                                Unique ×1
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: colors.emerald600,
                              }}
                            >
                              {formatCurrency(winningAmount ?? 0)}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  {/* ── Bids below the winning amount ── */}
                  {lowerBidsGrouped.length > 0 && (
                    <>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: colors.border,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "500",
                            color: colors.mutedForeground,
                          }}
                        >
                          Amounts below winner (lowest ↑)
                        </Text>
                        <View
                          style={{
                            flex: 1,
                            height: 1,
                            backgroundColor: colors.border,
                          }}
                        />
                      </View>
                      {pagedBids.map(
                        ({
                          amount,
                          count,
                        }: {
                          amount: number;
                          count: number;
                        }) => (
                          <View
                            key={amount}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingVertical: 8,
                              paddingHorizontal: 8,
                              borderRadius: 8,
                              marginBottom: 2,
                              backgroundColor: colors.card,
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: colors.navy,
                                }}
                              >
                                {formatCurrency(amount ?? 0)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: colors.mutedForeground,
                                  marginTop: 2,
                                }}
                              >
                                Lower than the winner, so it only counts if it
                                was unique.
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <View
                                style={{
                                  borderRadius: 999,
                                  backgroundColor:
                                    count > 1 ? "#FEF3C7" : "#DCFCE7",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderWidth: 1,
                                  borderColor:
                                    count > 1 ? "#FDE68A" : "#BBF7D0",
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "700",
                                    color:
                                      count > 1 ? "#B45309" : colors.emerald600,
                                  }}
                                >
                                  {count > 1
                                    ? `Repeated ×${count}`
                                    : "Unique ×1"}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: colors.mutedForeground,
                                }}
                              >
                                {count > 1
                                  ? "Disqualified duplicate"
                                  : "Valid unique amount"}
                              </Text>
                            </View>
                          </View>
                        ),
                      )}
                      {totalBidPages > 1 && (
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.card,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() =>
                              setBidsPage((p: number) => Math.max(0, p - 1))
                            }
                            disabled={currentBidsPage === 0}
                            activeOpacity={0.85}
                            style={{
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: colors.border,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              opacity: currentBidsPage === 0 ? 0.4 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: colors.neutralGray600,
                              }}
                            >
                              Previous
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: colors.mutedForeground,
                            }}
                          >
                            Page {currentBidsPage + 1} of {totalBidPages}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setBidsPage((p: number) =>
                                Math.min(totalBidPages - 1, p + 1),
                              )
                            }
                            disabled={currentBidsPage >= totalBidPages - 1}
                            activeOpacity={0.85}
                            style={{
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: colors.border,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              opacity:
                                currentBidsPage >= totalBidPages - 1 ? 0.4 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: colors.neutralGray600,
                              }}
                            >
                              Next
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                  {lowerBidsGrouped.length === 0 && winningAmount != null && (
                    <View
                      style={{
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.emerald600 + "33",
                        backgroundColor: colors.emerald600 + "12",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: colors.emerald600,
                        }}
                      >
                        No lower bid amounts were placed. The winner was already
                        the lowest valid bid.
                      </Text>
                    </View>
                  )}
                </Card>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
      <WinnerPaymentCta
        hasWinner={Boolean(winner?.winner_user_id)}
        userIsWinner={Boolean(allWinners?.some((w: any) => w.user_id === user?.id))}
        userPaymentStatus={userWinnerInfo?.payment_status as any}
        isPaymentExpired={isPaymentExpired}
        isPrimaryWinner={isPrimaryWinner}
        onPay={() => go("pay-winning")}
        onBack={() => goBack()}
      />
    </View>
  );
}


const s = StyleSheet.create({
  gradient: { flex: 1, backgroundColor: colors.navy },
  body: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  winnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: colors.primary + "33",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  winnerBadgeText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  pingRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + "4D",
  },
  trophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.navyForeground,
    marginTop: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.white + "CC",
    textAlign: "center",
    maxWidth: 280,
    marginTop: 8,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: colors.emerald600 + "22",
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  productImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 12,
  },
  winningBidBox: {
    borderRadius: 12,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 16,
  },
  winLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  winAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
});
