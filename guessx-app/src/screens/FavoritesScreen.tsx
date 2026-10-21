import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Heart, HeartOff } from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, Badge, Card, CTAButton } from "../components/AuctionUI";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../theme";
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <AppBar title="Favorites" onBack={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.headerRow}>
          <Text style={s.subtitle}>
            Your watchlist of auctions to revisit quickly
          </Text>
          <Badge tone={favorites.length > 0 ? "navy" : "muted"}>
            {favorites.length} saved
          </Badge>
        </View>

        {favoritesLoading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} style={s.skeletonCard}>
                <View />
              </Card>
            ))}
          </View>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No favorites yet"
            message="Save auctions you want to track so you can come back before bidding closes."
            actionLabel="Browse auctions"
            onAction={() => go("auctions")}
          />
        ) : (
          <View style={{ gap: 10 }}>
            <CTAButton variant="outline" onPress={refreshFavorites}>
              Refresh watchlist
            </CTAButton>
            {favorites.map((auction) => (
              <Card key={auction.id} style={s.card}>
                <View style={s.cardRow}>
                  <TouchableOpacity
                    onPress={() => selectAuction(auction.id)}
                    style={s.rowPressable}
                    activeOpacity={0.85}
                  >
                    <View style={s.thumbWrap}>
                      {auction.images?.[0] ? (
                        <Image
                          source={{ uri: auction.images[0] }}
                          style={s.thumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <Heart size={18} color={colors.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.titleRow}>
                        <Text style={s.title} numberOfLines={1}>
                          {auction.name}
                        </Text>
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
                      </View>
                      <Text style={s.meta}>{auction.category}</Text>
                      <Text style={s.price}>
                        Bid fee {formatCurrency(auction.bidFee)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(auction.id)}
                    style={s.removeBtn}
                    activeOpacity={0.85}
                  >
                    <HeartOff size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subtitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  skeletonCard: { height: 84 },
  card: { padding: 12 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowPressable: { flex: 1, flexDirection: "row", gap: 12 },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.navy },
  meta: { fontSize: 12, fontWeight: "500", color: colors.mutedForeground },
  price: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
});
