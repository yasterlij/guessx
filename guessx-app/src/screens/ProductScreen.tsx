import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Users,
  CheckCircle2,
  TrendingDown,
  X,
  Zap,
  Minus,
  Plus,
  Heart,
  Wallet,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp,
  Building2,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, Card, Badge, AwashMark } from "../components/AuctionUI";
import { ImageCarousel } from "../components/ImageCarousel";
import { Countdown, useCountdown } from "../components/Countdown";
import {
  CURRENCY,
  formatCurrency,
  formatSpecSummary,
  getSpecEntries,
} from "../mockDataV0";
import { colors, spacing, borderRadius, fontSize } from "../theme";
import { api } from "../api";
import { ProductHeroSection } from "../components/ProductHeroSection";
import { ProductPurchasePanel } from "../components/ProductPurchasePanel";
import { useProductBidPayment } from "../hooks/useProductBidPayment";

const { width } = Dimensions.get("window");

function LightboxModal({
  visible,
  images,
  idx,
  onClose,
}: {
  visible: boolean;
  images: string[];
  idx: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(idx);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ position: "absolute", top: 60, right: 20, zIndex: 10 }}
          onPress={onClose}
        >
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <ImageCarousel
          images={images}
          alt=""
          containerWidth={width}
          autoPlayInterval={0}
          showThumbnails
        />
      </View>
    </Modal>
  );
}

export function ProductScreen() {
  const {
    go,
    goBack,
    selectedId,
    getAuction,
    isFavorite,
    toggleFavorite,
    payFee,
    setPaymentMethod,
    walletBalance,
    pendingBidAmount,
    setPendingBidAmount,
    authError,
    myBids,
    user,
  } = useApp();
  const auction = getAuction(selectedId);
  const seconds = useCountdown(auction?.timeLeft ?? 0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showSpecs, setShowSpecs] = useState(false);
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);

  const {
    loadingMethod,
    showPaymentMethods,
    setShowPaymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    checkingPin,
    showPinModal,
    setShowPinModal,
    pinInput,
    setPinInput,
    pinError,
    setPinError,
    attemptsRemaining,
    pinLocked,
    lockCountdown,
    pinLoading,
    needsPinSetup,
    setupPin,
    setSetupPin,
    setupConfirm,
    setSetupConfirm,
    setupError,
    setSetupError,
    setupLoading,
    bidAmount,
    setBidAmount,
    bidError,
    setBidError,
    bidFlash,
    numericBid,
    hasValidBid,
    updateBid,
    adjustBid,
    handlePayment,
    handleVerifyPin,
    handleSetupPin,
  } = useProductBidPayment({
    bidFee: auction?.bidFee ?? 1,
    pendingBidAmount,
    payFee,
    setPaymentMethod,
    setPendingBidAmount,
    isAdmin: user?.role === "admin",
  });

  if (!auction) return null;

  const isDuplicate =
    numericBid > 0 &&
    (myBids.some(
      (b) => b.auctionId === selectedId && b.amount === numericBid,
    ) ||
      serverBidAmounts.some((amount) => amount === numericBid));

  const images = auction.images || [];
  const savings =
    auction.marketPrice > 0
      ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100)
      : 0;
  const isEnding = seconds > 0 && seconds < 3600;
  const isOver = seconds <= 0;
  const auctionCode =
    auction.publicCode || auction.id.slice(0, 6).toUpperCase();
  const specSummary = auction.specSummary || formatSpecSummary(auction.specs);
  const specEntries = getSpecEntries(auction.specs);
  const favorite = isFavorite(auction.id);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.bid
      .myBids(selectedId)
      .then((res) => {
        if (active) setServerBidAmounts(res.bids.map((b) => b.amount));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!isDuplicate) return;
    Alert.alert(
      "Duplicate Bid",
      `You've already placed a bid of ${formatCurrency(numericBid)} on this auction. Please enter a different bid amount.`,
      [{ text: "Change Bid Amount" }],
    );
  }, [isDuplicate, numericBid]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar
        title="Product Details"
        onBack={() => goBack()}
        right={
          <TouchableOpacity
            onPress={() => toggleFavorite(auction.id)}
            style={{
              width: 34,
              height: 34,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Heart
              size={20}
              color={favorite ? colors.primary : colors.navyForeground}
              fill={favorite ? colors.primary : "transparent"}
            />
          </TouchableOpacity>
        }
      />
      <LightboxModal
        visible={lightboxVisible}
        images={images}
        idx={lightboxIdx}
        onClose={() => setLightboxVisible(false)}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
      >
        <ProductHeroSection
          auction={auction}
          images={images}
          savings={savings}
          specSummary={specSummary}
          seconds={seconds}
          isEnding={isEnding}
          isOver={isOver}
          auctionCode={auctionCode}
          specEntries={specEntries}
          showSpecs={showSpecs}
          onToggleSpecs={() => setShowSpecs((value) => !value)}
          onImagePress={(index) => {
            setLightboxIdx(index);
            setLightboxVisible(true);
          }}
        />

        <ProductPurchasePanel
          bidValue={bidAmount}
          bidFlash={bidFlash}
          bidError={bidError}
          onBidChange={(value) => {
            const clean = value
              .replace(/[^\d.]/g, "")
              .replace(/(\..*)\./g, "$1")
              .replace(/(\.\d{2})\d+/g, "$1")
              .slice(0, 13);
            if (clean && Number(clean) < 1) return;
            setBidAmount(clean);
            setBidError(null);
          }}
          onBidBlur={() => {
            if (!bidAmount) return;
            const normalized = Number(bidAmount);
            if (normalized < 1) {
              setBidError("Minimum bid is 1.00");
              updateBid(1);
              return;
            }
            updateBid(normalized);
          }}
          onDecrease={() => adjustBid(-0.01)}
          onIncrease={() => adjustBid(0.01)}
          selectedPaymentMethod={selectedPaymentMethod}
          showPaymentMethods={showPaymentMethods}
          onTogglePaymentMethods={() =>
            setShowPaymentMethods((value) => !value)
          }
          onSelectPaymentMethod={(method) => {
            setSelectedPaymentMethod(method);
            setShowPaymentMethods(false);
          }}
          loadingMethod={loadingMethod}
          checkingPin={checkingPin}
          walletBalance={walletBalance}
          bidFee={auction.bidFee}
          hasValidBid={hasValidBid}
          authError={authError}
          isEnding={isEnding}
          isAdmin={user?.role === "admin"}
          onSubmit={(method) => {
            if (user?.role === "admin") {
              Alert.alert(
                "Bidding Restricted",
                "Administrators are not allowed to participate in bidding.",
              );
              return;
            }
            handlePayment(method, isDuplicate);
          }}
        />

        <View style={{ paddingHorizontal: 4 }}>
          <View style={s.hint}>
            <TrendingDown size={18} color={colors.primary} />
            <Text style={s.hintText}>
              Place the{" "}
              <Text style={{ fontWeight: "700" }}>lowest unique bid</Text> — the
              smallest amount that no one else has chosen — to win this product.
            </Text>
          </View>

          {/* Highlights */}
          {auction.highlights?.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 16,
              }}
            >
              {auction.highlights.map((h) => (
                <Card key={h} style={s.highlight}>
                  <CheckCircle2 size={16} color={colors.primary} />
                  <Text style={s.highlightText}>{h}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.42)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              borderRadius: 24,
              backgroundColor: colors.card,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{ fontSize: 22, fontWeight: "800", color: colors.navy }}
            >
              {needsPinSetup ? "Set Wallet PIN" : "Confirm Wallet PIN"}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              {needsPinSetup
                ? "Create a 4–6 digit PIN to secure your wallet payment."
                : `Pay ${formatCurrency(auction.bidFee)} from your Awash Wallet.`}
            </Text>

            {needsPinSetup ? (
              <View style={{ marginTop: 16, gap: 12 }}>
                <TextInput
                  value={setupPin}
                  onChangeText={(t) => {
                    setSetupPin(t.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Create PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                <TextInput
                  value={setupConfirm}
                  onChangeText={(t) => {
                    setSetupConfirm(t.replace(/\D/g, "").slice(0, 6));
                    setSetupError(null);
                  }}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                {setupError ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    {setupError}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    style={[
                      s.specCard,
                      {
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSetupPin}
                    disabled={setupLoading}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      opacity: setupLoading ? 0.7 : 1,
                    }}
                  >
                    {setupLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primaryForeground,
                        }}
                      >
                        Set PIN & Pay
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 16, gap: 12 }}>
                <TextInput
                  value={pinInput}
                  onChangeText={(t) => {
                    setPinInput(t.replace(/\D/g, "").slice(0, 6));
                    setPinError(null);
                  }}
                  placeholder="Enter wallet PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={s.input}
                />
                {pinLocked ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    Wallet PIN locked. {lockCountdown || "Try again later."}
                  </Text>
                ) : null}
                {!pinLocked && attemptsRemaining != null ? (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: colors.mutedForeground,
                    }}
                  >
                    Attempts remaining: {attemptsRemaining}
                  </Text>
                ) : null}
                {pinError ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.destructive,
                    }}
                  >
                    {pinError}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowPinModal(false)}
                    style={[
                      s.specCard,
                      {
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: colors.navy,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyPin}
                    disabled={pinLoading || pinLocked}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      opacity: pinLoading || pinLocked ? 0.7 : 1,
                    }}
                  >
                    {pinLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: colors.primaryForeground,
                        }}
                      >
                        Pay with Wallet
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  imageArea: {
    width,
    height: width * 0.75,
    backgroundColor: colors.secondary,
    position: "relative",
  },
  heroCard: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  heroBody: { padding: 16, gap: 16 },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  overviewPrimaryCard: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.awashBlue + "1A",
    backgroundColor: colors.awashBlue + "0D",
  },
  overviewMetricCard: {
    width: (width - 58) / 2,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.awashBlue + "CC",
  },
  overviewPrimaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 8,
  },
  badges: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    backgroundColor: colors.emerald600,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsBadge: {
    borderRadius: 20,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.emerald200,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.navy, marginTop: 8 },
  specSummary: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.neutralGray600,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 4,
  },
  specToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  specToggleText: { fontSize: 12, fontWeight: "700", color: colors.awashBlue },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  specCard: {
    width: (width - 52) / 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  specValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 6,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  methodOptionSelected: { backgroundColor: colors.primary + "1A" },
  methodOptionTitle: { fontSize: 13, fontWeight: "700", color: colors.navy },
  methodOptionSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy,
    backgroundColor: colors.card,
  },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    backgroundColor: colors.navy + "0D",
    padding: 12,
    marginTop: 16,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: colors.navy + "CC",
    flex: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
    marginTop: 6,
  },
  highlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  highlightText: { fontSize: 12, fontWeight: "600", color: colors.navy },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
  },
});
