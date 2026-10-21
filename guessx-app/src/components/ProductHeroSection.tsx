import React from "react"
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { Zap } from "lucide-react-native"
import { AppBar, Badge, Card } from "./AuctionUI"
import { ImageCarousel } from "./ImageCarousel"
import { Countdown } from "./Countdown"
import { colors } from "../theme"
import type { Auction, ProductSpecs } from "../mockDataV0"

const { width } = Dimensions.get("window")

export function ProductHeroSection({
  auction,
  images,
  savings,
  specSummary,
  seconds,
  isEnding,
  isOver,
  auctionCode,
  specEntries,
  showSpecs,
  onToggleSpecs,
  onImagePress,
}: {
  auction: Auction
  images: string[]
  savings: number
  specSummary: string
  seconds: number
  isEnding: boolean
  isOver: boolean
  auctionCode: string
  specEntries: Array<{ key: keyof ProductSpecs; label: string; value: string }>
  showSpecs: boolean
  onToggleSpecs: () => void
  onImagePress: (index: number) => void
}) {
  return (
    <>
      <Card style={s.heroCard}>
        {images.length > 0 ? (
          <ImageCarousel
            images={images}
            alt={auction.name}
            containerWidth={width - 32}
            autoPlayInterval={4000}
            showThumbnails
            onImagePress={onImagePress}
            overlay={
              <View style={s.badges}>
                <Badge tone="green">
                  <View style={s.liveDot} /> Live
                </Badge>
                {savings > 0 && (
                  <View style={s.savingsPill}>
                    <Zap size={12} color="#fff" />
                    <Text style={s.savingsPillText}>{savings}% off</Text>
                  </View>
                )}
              </View>
            }
          />
        ) : (
          <View style={s.imageArea}>
            <View style={s.emptyImageInner}>
              <Text style={s.emptyImageText}>No images available</Text>
            </View>
          </View>
        )}
        <View style={s.heroBody}>
          <View style={s.heroTitleRow}>
            <View style={{ flex: 1 }}>
              <Badge tone="navy">{auction.category}</Badge>
              <Text style={s.name}>{auction.name}</Text>
              {!!specSummary && <Text style={s.specSummary}>{specSummary}</Text>}
            </View>
            {savings > 0 && (
              <View style={s.savingsBadge}>
                <Text style={s.savingsBadgeText}>{savings}% off</Text>
              </View>
            )}
          </View>
        </View>
      </Card>

      <View style={{ paddingHorizontal: 4 }}>
        <Card style={s.aboutCard}>
          <Text style={s.sectionTitle}>About this product</Text>
          <Text style={s.nameLight}>{auction.name}</Text>
          {!!specSummary && <Text style={s.specSummaryLight}>{specSummary}</Text>}
          {auction.description ? <Text style={s.descriptionLight}>{auction.description}</Text> : null}
        </Card>

        <View style={[s.metricsRow, { marginBottom: specEntries.length > 0 ? 0 : 16 }]}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>{isOver ? "Auction Ended" : isEnding ? "Ending Soon" : "Time Left"}</Text>
            <View style={{ marginTop: 4 }}>
              <Countdown seconds={seconds} size="sm" />
            </View>
          </View>
          <View style={s.codeCard}>
            <Text style={s.metricLabel}>Auction Code</Text>
            <Text numberOfLines={1} style={s.codeValue}>{auctionCode}</Text>
          </View>
        </View>

        {specEntries.length > 0 && (
          <Card style={s.specsCard}>
            <TouchableOpacity style={s.specToggle} onPress={onToggleSpecs}>
              <Text style={s.sectionTitle}>Product specifications</Text>
              <Text style={s.specToggleText}>{showSpecs ? "Hide details" : "View details"}</Text>
            </TouchableOpacity>
            {showSpecs && (
              <View style={s.specGrid}>
                {specEntries.map((entry) => (
                  <Card key={entry.key} style={s.specCard}>
                    <Text style={s.specLabel}>{entry.label}</Text>
                    <Text style={s.specValue}>{entry.value}</Text>
                  </Card>
                ))}
              </View>
            )}
          </Card>
        )}
      </View>
    </>
  )
}

const s = StyleSheet.create({
  imageArea: { width, height: width * 0.75, backgroundColor: colors.secondary, position: "relative" },
  emptyImageInner: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyImageText: { fontSize: 14, fontWeight: "500", color: colors.mutedForeground },
  heroCard: { overflow: "hidden", borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  heroBody: { padding: 16, gap: 16 },
  heroTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  badges: { position: "absolute", top: 12, left: 12, flexDirection: "row", gap: 8, zIndex: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald500 },
  savingsPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, backgroundColor: colors.emerald600, paddingHorizontal: 10, paddingVertical: 4 },
  savingsPillText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  savingsBadge: { borderRadius: 20, backgroundColor: colors.emerald50, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.emerald200 },
  savingsBadgeText: { fontSize: 11, fontWeight: "700", color: colors.emerald700 },
  name: { fontSize: 20, fontWeight: "800", color: colors.navy, marginTop: 8 },
  specSummary: { fontSize: 12, fontWeight: "600", color: colors.neutralGray600, marginTop: 6 },
  aboutCard: { padding: 16, borderWidth: 0, backgroundColor: colors.navy },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  nameLight: { fontSize: 18, fontWeight: "800", color: "#FFF", marginTop: 8 },
  specSummaryLight: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.82)", marginTop: 6 },
  descriptionLight: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.78)", marginTop: 8 },
  metricsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  metricCard: { flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: 10 },
  metricLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,0.72)" },
  codeCard: { width: 108, borderRadius: 16, backgroundColor: colors.navy, paddingHorizontal: 10, paddingVertical: 10 },
  codeValue: { fontSize: 17, fontWeight: "800", letterSpacing: 1.2, color: "#FFF", marginTop: 4 },
  specsCard: { marginTop: 16, padding: 16 },
  specToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  specToggleText: { fontSize: 12, fontWeight: "700", color: colors.awashBlue },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  specCard: { width: (width - 52) / 2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  specLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: colors.mutedForeground },
  specValue: { fontSize: 13, fontWeight: "700", color: colors.navy, marginTop: 6 },
})
