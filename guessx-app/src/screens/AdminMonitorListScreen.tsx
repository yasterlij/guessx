import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  RefreshControl,
} from "react-native";
import {
  Radio,
  Users,
  TrendingDown,
  Clock,
  Eye,
  Search,
  RefreshCw,
  Gavel,
  ImageIcon,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { api } from "../api";
import { AppBar, Card } from "../components/AuctionUI";
import { normalizeAuctionCategory } from "../lib/auctionCategories";
import { formatCurrency } from "../mockDataV0";
import { colors } from "../theme";

type MonitorAuction = {
  id: string;
  productId?: string;
  name: string;
  category: string;
  images: string[];
  marketPrice: number;
  bidFee: number;
  bidders: number;
  uniqueBidders: number;
  totalBids: number;
  timeLeft: number;
  endTime: string;
  status: "live" | "ending-soon" | "closed";
  minBid?: number;
  maxBid?: number;
};

export function AdminMonitorListScreen() {
  const { go, goBack, refreshAuctions, selectAuctionForMonitor } = useApp();
  const [search, setSearch] = useState("");
  const [adminAuctions, setAdminAuctions] = useState<MonitorAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.adminListAuctions(1, 200);
      const list = ((res as any).data || res || []) as any[];
      setAdminAuctions(list.map(mapMonitorAuction));
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const activeAuctions = useMemo(
    () => adminAuctions.filter((a) => a.status !== "closed"),
    [adminAuctions],
  );

  const filtered = activeAuctions.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      refreshAuctions();
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar
        title="Monitor Auctions"
        onBack={() => goBack()}
        right={
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              width: 32,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color={colors.navyForeground} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: colors.mutedForeground,
            marginBottom: 12,
          }}
        >
          {activeAuctions.length} live auction
          {activeAuctions.length === 1 ? "" : "s"}
        </Text>

        <View style={s.searchWrap}>
          <Search size={14} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search auctions..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={s.searchInput}
          />
        </View>

        {loading ? (
          <Text
            style={{
              textAlign: "center",
              color: colors.mutedForeground,
              marginTop: 40,
            }}
          >
            Loading auctions...
          </Text>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.secondary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Gavel size={26} color={colors.neutralGray300} />
            </View>
            <Text
              style={{
                marginTop: 16,
                fontSize: 14,
                fontWeight: "700",
                color: colors.neutralGray500,
              }}
            >
              No active auctions to monitor
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: "500",
                color: colors.neutralGray400,
              }}
            >
              Create an auction or check back later
            </Text>
          </View>
        ) : (
          filtered.map((a) => (
            <AuctionMonitorCard
              key={a.id}
              auction={a}
              onMonitor={() => selectAuctionForMonitor(a.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AuctionMonitorCard({
  auction,
  onMonitor,
}: {
  auction: MonitorAuction;
  onMonitor: () => void;
}) {
  const isEndingSoon = auction.timeLeft > 0 && auction.timeLeft < 3600;

  return (
    <TouchableOpacity onPress={onMonitor} activeOpacity={0.85} style={s.card}>
      <View style={s.cardImageWrap}>
        {auction.images?.[0] ? (
          <Image
            source={{ uri: auction.images[0] }}
            style={s.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={{ justifyContent: "center", alignItems: "center" }}>
            <ImageIcon size={28} color={colors.neutralGray300} />
          </View>
        )}
        <View style={s.livePill}>
          <Radio size={10} color={colors.white} />
          <Text style={s.livePillText}>LIVE</Text>
        </View>
        {isEndingSoon && (
          <View style={s.endingPill}>
            <Clock size={10} color={colors.white} />
            <Text style={s.livePillText}>Ending Soon</Text>
          </View>
        )}
      </View>

      <View style={{ padding: 14 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={s.cardTitle} numberOfLines={1}>
            {auction.name}
          </Text>
          <Text style={s.cardPrice}>{formatCurrency(auction.marketPrice)}</Text>
        </View>
        <Text
          style={{
            marginTop: 2,
            fontSize: 11,
            fontWeight: "500",
            color: colors.neutralGray400,
          }}
        >
          {auction.category || "No category"}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <View style={s.stat}>
            <Users size={12} color={colors.awashBlue} />
            <Text style={s.statValue}>
              {auction.totalBids || auction.bidders}
            </Text>
            <Text style={s.statLabel}>Bids</Text>
          </View>
          <View style={s.stat}>
            <TrendingDown size={12} color={colors.primary} />
            <Text style={s.statValue}>{auction.uniqueBidders ?? "—"}</Text>
            <Text style={s.statLabel}>Unique</Text>
          </View>
          <View style={s.stat}>
            <Clock size={12} color={colors.neutralGray500} />
            <CountdownMini seconds={auction.timeLeft} />
            <Text style={s.statLabel}>Left</Text>
          </View>
        </View>

        <View style={s.monitorCta}>
          <Eye size={14} color={colors.awashBlue} />
          <Text
            style={{ fontSize: 12, fontWeight: "700", color: colors.awashBlue }}
          >
            Monitor Auction
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CountdownMini({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}`;
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "800",
        color: h > 0 ? colors.awashBlue : colors.orange,
        fontVariant: ["tabular-nums"],
      }}
    >
      {label}
    </Text>
  );
}

function mapMonitorAuction(a: any): MonitorAuction {
  const timeLeft = Math.max(
    0,
    Math.floor((new Date(a.end_time).getTime() - Date.now()) / 1000),
  );
  return {
    id: a.id,
    productId: a.product_id,
    name: a.product?.name || "Unknown",
    category: normalizeAuctionCategory(a.product?.category, a.product?.name),
    images: a.product?.image_urls || [],
    marketPrice: Number(a.product?.current_market_price || 0),
    bidFee: a.bid_fee != null ? Number(a.bid_fee) : 1,
    bidders: a.stats?.total_bids ?? 0,
    uniqueBidders: a.stats?.unique_bidders ?? 0,
    totalBids: a.stats?.total_bids ?? 0,
    timeLeft,
    endTime: a.end_time,
    status:
      a.status === "ACTIVE"
        ? timeLeft < 3600
          ? "ending-soon"
          : "live"
        : "closed",
    minBid: a.min_bid != null ? Number(a.min_bid) : undefined,
    maxBid: a.max_bid != null ? Number(a.max_bid) : undefined,
  };
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border + "99",
    backgroundColor: colors.card,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  cardImageWrap: {
    position: "relative",
    aspectRatio: 4 / 3,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: { width: "100%", height: "100%" },
  livePill: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    backgroundColor: colors.emerald500 + "E6",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  endingPill: {
    position: "absolute",
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    backgroundColor: colors.orange + "E6",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  livePillText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.awashBlue,
  },
  cardPrice: { fontSize: 12, fontWeight: "800", color: colors.primary },
  stat: {
    flex: 1,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.neutralGray50,
    paddingVertical: 8,
  },
  statValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: colors.awashBlue,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.neutralGray400,
  },
  monitorCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.awashBlue + "0D",
    paddingVertical: 10,
    marginTop: 12,
  },
});
