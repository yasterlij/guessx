import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame,
  ShieldCheck,
  Trophy,
  Sparkles,
  PiggyBank,
  ImageIcon,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, Badge } from "../components/AuctionUI";
import { useCountdown } from "../components/Countdown";
import { SkeletonCard } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";
import { buildAuctionCategoryOptions } from "../lib/auctionCategories";
import type { Auction } from "../mockDataV0";
import { formatCurrency, formatCountdown } from "../mockDataV0";
import { colors } from "../theme";

const CARD_W = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

function AuctionImage({ src, alt }: { src?: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <View
        style={[
          s.cardImgWrap,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.secondary,
            gap: 4,
          },
        ]}
      >
        <ImageIcon size={24} color={colors.mutedForeground + "66"} />
        <Text
          style={{
            fontSize: 9,
            fontWeight: "500",
            color: colors.mutedForeground + "4D",
          }}
        >
          {alt}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      style={s.cardImgWrap}
      resizeMode="cover"
      onError={() => setErr(true)}
    />
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
  const { d, h, m, s: secStr } = formatCountdown(t);
  const urgent = endingSoon || (t > 0 && t < 3600);
  return (
    <View
      style={[
        s.timePill,
        { backgroundColor: urgent ? "rgba(200,166,66,0.85)" : "rgba(0,0,0,0.55)" },
      ]}
    >
      <Text
        style={[s.timePillText, { color: "#fff" }]}
      >
        {d !== "00" ? `${parseInt(d)}d ` : ""}
        {h}:{m}:{secStr}
      </Text>
    </View>
  );
}

export function AuctionCard({
  auction,
  onOpen,
  isFav,
  onToggleFavorite,
}: {
  auction: Auction;
  onOpen: () => void;
  isFav?: boolean;
  onToggleFavorite?: () => void;
}) {
  const endingSoon = auction.status === "ending-soon";
  const isClosed = auction.status === "closed";
  const bidProgress = auction.maxBid
    ? Math.min(auction.totalBids / auction.maxBid, 1)
    : 0;
  const publicCode = auction.publicCode || auction.id.slice(0, 6).toUpperCase();
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85} style={s.card}>
      <View style={s.cardImgOuter}>
        <AuctionImage src={auction.images?.[0]} alt={auction.name} />
        <LinearGradient
          colors={[
            "rgba(0,43,92,0.06)",
            "transparent",
            "rgba(200,166,66,0.05)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={s.cardImgTop}>
          {isClosed ? (
            <Badge tone="muted">Closed</Badge>
          ) : endingSoon ? (
            <Badge tone="orange">
              <Flame size={10} /> Ending Soon
            </Badge>
          ) : (
            <Badge tone="green">Live</Badge>
          )}
          <View style={s.codeBadge}>
            <Text style={s.codeBadgeText}>{publicCode}</Text>
          </View>
        </View>
        <View style={s.cardImgBottom}>
          {isClosed ? (
            <View style={[s.timePill, { backgroundColor: colors.muted + "40" }]}>
              <Text style={[s.timePillText, { color: colors.mutedForeground }]}>
                {auction.winning_bid_amount != null
                  ? `Won at ${formatCurrency(auction.winning_bid_amount)}`
                  : "Ended"}
              </Text>
            </View>
          ) : (
            <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
          )}
        </View>
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <Text style={s.cardName} numberOfLines={1}>
          {auction.name}
        </Text>
        {auction.specSummary ? (
          <Text style={s.cardSpec} numberOfLines={1}>
            {auction.specSummary}
          </Text>
        ) : null}
        {auction.marketPrice > 0 ? (
          <Text
            style={{
              fontSize: 9,
              fontWeight: "500",
              color: colors.mutedForeground,
              textDecorationLine: "line-through",
            }}
          >
            {formatCurrency(auction.marketPrice)}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          <View style={s.feeTag}>
            <Text style={s.feeTagText}>
              Bid Amount: {formatCurrency(auction.bidFee)}
            </Text>
          </View>
          <View style={s.bidderBadge}>
            <Text style={s.bidderBadgeText}>
              {auction.totalBids || auction.bidders} bidders
            </Text>
          </View>
        </View>
        <View style={s.viewSpecsBar}>
          <Text style={s.viewSpecsText}>View more specs</Text>
        </View>
      </View>
      {!isClosed && auction.maxBid && (
        <View style={{ paddingHorizontal: 10, paddingTop: 6 }}>
          <View
            style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${bidProgress * 100}%`,
                height: "100%",
                borderRadius: 2,
                backgroundColor:
                  bidProgress > 0.8 ? colors.primary : colors.emerald500,
              }}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const loveItems = [
  { icon: Trophy, label: "Win premium products for the lowest price" },
  { icon: ShieldCheck, label: "Fair & transparent — lowest unique bid wins" },
  { icon: Sparkles, label: "Simple, secure and trusted payments" },
  { icon: PiggyBank, label: "Big savings, big rewards" },
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
  } = useApp();
  const [category, setCategory] = useState("All");
  const [showClosed, setShowClosed] = useState(false);

  const liveAuctions = useMemo(
    () => auctions.filter((a) => a.status !== "closed"),
    [auctions],
  );
  const closedAuctions = useMemo(
    () => auctions.filter((a) => a.status === "closed"),
    [auctions],
  );

  const categories = useMemo(
    () => buildAuctionCategoryOptions(liveAuctions.map((a) => a.category)),
    [liveAuctions],
  );
  const filtered = useMemo(() => {
    const source = showClosed ? closedAuctions : liveAuctions;
    const unique = Array.from(new Map(source.map((a) => [a.id, a])).values());
    return category === "All"
      ? unique
      : unique.filter((a) => a.category === category);
  }, [category, showClosed, liveAuctions, closedAuctions]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAuctions();
    setRefreshing(false);
  }, [refreshAuctions]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="Live Auctions" onBack={() => goBack()} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {auctionsLoading && auctions.length === 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard
                key={i}
                style={{ width: CARD_W }}
                imageHeight={CARD_W * 0.75}
              />
            ))}
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View>
                <Text style={s.pageTitle}>
                  {showClosed ? "Closed Auctions" : "Guess X Auctions"}
                </Text>
                <Text style={s.pageSub}>
                  {showClosed
                    ? "Recently ended auctions"
                    : "Lowest unique bid wins. Bid low, be unique!"}
                </Text>
              </View>
              <Badge tone={showClosed ? "muted" : "green"}>
                <View
                  style={[
                    s.greenDot,
                    {
                      backgroundColor: showClosed
                        ? colors.mutedForeground
                        : colors.emerald500,
                    },
                  ]}
                />{" "}
                {showClosed ? closedAuctions.length : liveAuctions.length}{" "}
                {showClosed ? "Closed" : "Live"}
              </Badge>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setShowClosed(false)}
                style={[
                  s.chip,
                  !showClosed
                    ? { backgroundColor: colors.navy, borderColor: colors.navy }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    {
                      color: !showClosed
                        ? colors.navyForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  Live
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowClosed(true)}
                style={[
                  s.chip,
                  showClosed
                    ? { backgroundColor: colors.navy, borderColor: colors.navy }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    {
                      color: showClosed
                        ? colors.navyForeground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  Closed ({closedAuctions.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{
                marginBottom: 16,
                marginHorizontal: -16,
                paddingHorizontal: 16,
              }}
            >
              {categories.map((c) => {
                const active = c === category;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      s.chip,
                      active
                        ? {
                            backgroundColor: colors.navy,
                            borderColor: colors.navy,
                          }
                        : {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        s.chipText,
                        {
                          color: active
                            ? colors.navyForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filtered.length === 0 ? (
              <EmptyState
                icon="search-x"
                title="No Auctions Found"
                message="There are no auctions in this category right now. Try another category or check back later."
              />
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {filtered.map((a) => (
                  <AuctionCard
                    key={a.id}
                    auction={a}
                    onOpen={() => selectAuction(a.id)}
                  />
                ))}
              </View>
            )}

            <View style={s.loveBox}>
              <Text style={s.loveTitle}>Why customers love it</Text>
              {loveItems.map((item) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 10,
                  }}
                >
                  <View style={s.loveIcon}>
                    <item.icon size={16} color={colors.primary} />
                  </View>
                  <Text style={s.loveText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatusBarCustom() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.navyForeground,
        }}
      >
        9:41
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImgOuter: { width: "100%", height: CARD_W * 0.75, position: "relative" },
  cardImgWrap: { width: "100%", height: "100%" },
  cardImgTop: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardImgBottom: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  codeBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.awashBlue,
    letterSpacing: 1,
  },
  cardSpec: { fontSize: 10, fontWeight: "500", color: colors.mutedForeground },
  feeTag: {
    borderRadius: 999,
    backgroundColor: colors.primary + "14",
    borderWidth: 1,
    borderColor: colors.primary + "33",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  feeTagText: { fontSize: 10, fontWeight: "700", color: colors.primary },
  bidderBadge: {
    borderRadius: 16,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bidderBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.emerald700,
  },
  cardName: { fontSize: 13, fontWeight: "700", color: colors.navy },
  viewSpecsBar: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: colors.awashBlue + "0D",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  viewSpecsText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.awashBlue,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  timePillText: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  pageTitle: { fontSize: 18, fontWeight: "800", color: colors.navy },
  pageSub: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald500,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  loveBox: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary + "99",
    padding: 16,
  },
  loveTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  loveIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  loveText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.navy + "CC",
    flex: 1,
  },
});
