import React from "react";
import { View, Text } from "react-native";
import { Users } from "lucide-react-native";
import { Card } from "../components/AuctionUI";
import { formatCurrency } from "../mockDataV0";
import { colors } from "../theme";
import type { ApiWinnerResult, ApiAuctionResult } from "../api";

interface WinnerStatsCardProps {
  winner: ApiWinnerResult | ApiAuctionResult;
}

export function WinnerStatsCard({ winner }: WinnerStatsCardProps) {
  return (
    <Card style={{ width: "100%", marginTop: 16, padding: 16, gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <Users size={14} color={colors.mutedForeground} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: colors.mutedForeground,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Auction Statistics
        </Text>
      </View>

      {[
        { label: "Total Bids", value: String(winner.total_bids) },
        {
          label: "Unique Bidders",
          value: String("unique_bidders" in winner ? winner.unique_bidders : 0),
        },
        {
          label: "Lowest Unique Bid",
          value:
            "lowest_unique_bid" in winner && winner.lowest_unique_bid != null
              ? formatCurrency(winner.lowest_unique_bid)
              : "—",
        },
      ].map(({ label, value }) => (
        <View
          key={label}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 4,
            borderBottomWidth: 1,
            borderBottomColor: colors.border + "40",
          }}
        >
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
            {label}
          </Text>
          <Text
            style={{ fontSize: 12, fontWeight: "700", color: colors.navy }}
          >
            {value}
          </Text>
        </View>
      ))}
    </Card>
  );
}
