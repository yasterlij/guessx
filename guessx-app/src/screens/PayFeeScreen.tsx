import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import {
  Wallet,
  ShieldCheck,
  Info,
  Lock,
  X,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, CTAButton, Card, AwashMark } from "../components/AuctionUI";
import { CURRENCY, formatCurrency, formatETB } from "../mockDataV0";
import { api } from "../api";
import { colors, fontSize } from "../theme";

export function PayFeeScreen() {
  const {
    go,
    goBack,
    selectedId,
    walletBalance,
    payFee,
    getAuction,
    paymentMethod,
    setPaymentMethod,
    pendingBidAmount,
    setPendingBidAmount,
    myBids,
    user,
  } = useApp();
  const auction = getAuction(selectedId);

  useEffect(() => {
    if (user?.role === "admin") {
      Alert.alert(
        "Bidding Restricted",
        "Administrators are not allowed to participate in bidding.",
      );
      goBack();
    }
  }, [user?.role, goBack]);

  const [selected] = useState<"AWASH">("AWASH");

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null,
  );
  const [pinLocked, setPinLocked] = useState(false);
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null);

  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const [checkingPin, setCheckingPin] = useState(false);
  const [bidAmount, setBidAmount] = useState(
    pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "",
  );
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const STEP = 0.01;
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([]);

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
    const nextBid = pendingBidAmount != null ? pendingBidAmount.toFixed(2) : "";
    setBidAmount((current) => (current === nextBid ? current : nextBid));
  }, [pendingBidAmount]);

  const hasPlacedBid = useCallback(
    (amount: number) =>
      myBids.some((b) => b.auctionId === selectedId && b.amount === amount) ||
      serverBidAmounts.some((a) => a === amount),
    [myBids, serverBidAmounts, selectedId],
  );

  useEffect(() => {
    if (showPinModal) {
      setPinInput("");
      setPinError(null);
    }
  }, [showPinModal]);

  const numericBid = bidAmount ? Number(bidAmount) : 0;
  const hasValidBid = numericBid >= 1 && /^\d+(\.\d{1,2})?$/.test(bidAmount);
  const isDuplicate = numericBid > 0 && hasPlacedBid(numericBid);

  useEffect(() => {
    if (!bidFlash) return;
    const id = setTimeout(() => setBidFlash(false), 240);
    return () => clearTimeout(id);
  }, [bidFlash]);

  const updateBid = useCallback(
    (next: number) => {
      const safe = Math.max(1, Number(next.toFixed(2)));
      setBidAmount(safe.toFixed(2));
      setBidError(null);
      setPendingBidAmount(safe);
      setBidFlash(true);
    },
    [setPendingBidAmount],
  );

  const adjustBid = useCallback(
    (delta: number) => {
      updateBid((bidAmount ? Number(bidAmount) : 1) + delta);
    },
    [bidAmount, updateBid],
  );

  const handlePayPress = useCallback(async () => {
    if (!auction) return;
    if (!hasValidBid) {
      setBidError("Enter a valid bid amount to continue");
      return;
    }
    if (isDuplicate) {
      Alert.alert(
        "Duplicate Bid",
        `You've already placed a bid of ${formatCurrency(numericBid)} on this auction. Please enter a different bid amount.`,
        [{ text: "Change Bid Amount" }],
      );
      return;
    }
    setAgreementAccepted(false);
    setShowAgreementModal(true);
  }, [auction, hasValidBid, isDuplicate, numericBid]);

  const handleConfirmAgreement = useCallback(async () => {
    if (!auction || !agreementAccepted) return;
    setShowAgreementModal(false);
    setPendingBidAmount(numericBid);
    setPaymentMethod("AWASH");
    setCheckingPin(true);
    try {
      const status = await api.wallet.pinStatus();
      setPinLocked(status.locked);
      setPinLockedUntil(status.lockedUntil);
      setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining);
      setNeedsPinSetup(!status.hasPin);
      setShowPinModal(true);
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Failed to check wallet PIN status");
      setNeedsPinSetup(false);
      setPinLocked(false);
      setShowPinModal(true);
    } finally {
      setCheckingPin(false);
    }
  }, [
    agreementAccepted,
    selected,
    auction,
    numericBid,
    payFee,
    setPaymentMethod,
    setPendingBidAmount,
  ]);

  const handleVerifyPin = useCallback(async () => {
    if (!auction) return;
    if (!pinInput) {
      setPinError("Please enter your wallet PIN");
      return;
    }
    if (pinLocked) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.wallet.verifyPin(pinInput);
      if (res.valid) {
        setShowPinModal(false);
        payFee(auction.bidFee, "AWASH");
      } else if (res.locked) {
        setPinLocked(true);
        setPinLockedUntil(res.lockedUntil);
        setAttemptsRemaining(0);
        setPinError(
          "Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.",
        );
      } else {
        setAttemptsRemaining(res.attemptsRemaining);
        if (res.attemptsRemaining <= 2) {
          setPinError(
            `Invalid PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? "s" : ""} remaining before lockout`,
          );
        } else {
          setPinError("Invalid wallet PIN");
        }
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || "Unable to verify PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  }, [pinInput, auction, payFee, pinLocked]);

  const handleSetupPin = useCallback(async () => {
    if (!auction) return;
    if (
      !setupPin ||
      setupPin.length < 4 ||
      setupPin.length > 6 ||
      !/^\d+$/.test(setupPin)
    ) {
      setSetupError("PIN must be 4–6 digits");
      return;
    }
    if (setupPin !== setupConfirm) {
      setSetupError("PINs do not match");
      return;
    }
    setSetupLoading(true);
    setSetupError(null);
    try {
      await api.wallet.setPin(setupPin);
      setShowPinModal(false);
      setNeedsPinSetup(false);
      payFee(auction.bidFee, "AWASH");
    } catch (err: unknown) {
      setSetupError("Failed to set wallet PIN. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  }, [setupPin, setupConfirm, auction, payFee]);

  const [lockCountdown, setLockCountdown] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown("");
      return;
    }
    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now();
      if (ms <= 0) {
        setLockCountdown("");
        setPinLocked(false);
        setPinLockedUntil(null);
        setAttemptsRemaining(5);
        return;
      }
      const totalSec = Math.ceil(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        setLockCountdown(
          `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`,
        );
      } else {
        setLockCountdown(
          `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}s`,
        );
      }
    };
    update();
    tickRef.current = setInterval(update, 1000);
    return () => clearInterval(tickRef.current);
  }, [pinLocked, pinLockedUntil]);

  if (!auction) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Place Bid & Pay"
        onBack={goBack}
        right={
          <TouchableOpacity
            onPress={() => go("home")}
            style={{
              width: 44,
              height: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AwashMark size={22} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 120,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: colors.mutedForeground,
          }}
        >
          Pay the non-refundable participation fee to enter this auction.
        </Text>

        <Card
          style={{
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.awashBlue + "1A",
            backgroundColor: colors.awashBlue + "0D",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
              color: colors.awashBlue,
            }}
          >
            Bid amount required before payment
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.mutedForeground,
              marginTop: 6,
            }}
          >
            Enter your bid amount to continue.
          </Text>
          <View style={[s.bidControl, bidFlash && s.bidControlActive]}>
            <TouchableOpacity
              onPress={() => adjustBid(-STEP)}
              disabled={numericBid <= 1}
              style={[
                s.bidAdjustBtn,
                numericBid <= 1 && s.bidAdjustBtnDisabled,
              ]}
            >
              <Minus
                size={18}
                color={
                  numericBid <= 1 ? colors.mutedForeground : colors.awashBlue
                }
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput
                value={bidAmount}
                onChangeText={(t) => {
                  const clean = t
                    .replace(/[^\d.]/g, "")
                    .replace(/(\..*)\./g, "$1")
                    .replace(/(\.\d{2})\d+/g, "$1")
                    .slice(0, 13);
                  setBidAmount(clean);
                  setBidError(null);
                }}
                onBlur={() => {
                  if (!bidAmount) return;
                  const normalized = Number(bidAmount);
                  if (normalized < 1) {
                    setBidError("Minimum bid is 1.00");
                    updateBid(1);
                    return;
                  }
                  updateBid(normalized);
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                style={s.bidInput}
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={s.bidCurrency}>{CURRENCY}</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjustBid(STEP)}
              style={s.bidAdjustBtn}
            >
              <Plus size={18} color={colors.awashBlue} />
            </TouchableOpacity>
          </View>
          {bidError ? <Text style={s.pinError}>{bidError}</Text> : null}
          {isDuplicate && (
            <View style={s.duplicateWarning}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={s.duplicateText}>
                You've already placed a bid of {formatCurrency(numericBid)}.
                Please enter a different amount.
              </Text>
            </View>
          )}
          <Text
            style={{
              fontSize: 11,
              color: colors.mutedForeground,
              marginTop: 8,
            }}
          >
            Minimum bid is 1.00 {CURRENCY}. Amounts you've already bid are
            blocked before payment.
          </Text>
        </Card>

        <Card style={{ alignItems: "center", padding: 24, marginTop: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: colors.mutedForeground,
            }}
          >
            Service Fee
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: colors.navy,
              marginTop: 8,
            }}
          >
            {formatCurrency(auction.bidFee)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.mutedForeground,
              marginTop: 8,
            }}
          >
            for {auction.name}
          </Text>
        </Card>

        {hasValidBid && (
          <Card
            style={{
              padding: 16,
              marginTop: 16,
              borderWidth: 1,
              borderColor: colors.emerald200,
              backgroundColor: colors.emerald50,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                textTransform: "uppercase",
                color: colors.emerald700,
              }}
            >
              Preview before payment
            </Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  Your bid
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.awashBlue,
                  }}
                >
                  {formatCurrency(numericBid)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  Service fee (charged now)
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.awashBlue,
                  }}
                >
                  {formatCurrency(auction.bidFee)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: colors.emerald200,
                  paddingTop: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  Total charged today
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.emerald700,
                  }}
                >
                  {formatCurrency(auction.bidFee)}
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              Your bid is saved and will be submitted automatically after
              payment confirmation.
            </Text>
          </Card>
        )}

        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.navy,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          Pay with
        </Text>

        <Card
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderColor: colors.primary + "66",
            padding: 16,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.navy,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AwashMark size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: colors.navy }}
            >
              Awash Wallet
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: colors.mutedForeground,
              }}
            >
              <Wallet size={14} /> Balance: {formatCurrency(walletBalance)}
            </Text>
          </View>
        </Card>

        <View style={s.infoBox}>
          <Info size={16} color={colors.navy + "99"} />
          <Text style={s.infoText}>
            The service fee is non-refundable and confirms your participation.
            Your saved bid will be submitted after payment confirmation.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
          }}
        >
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.mutedForeground,
            }}
          >
            Secured by Awash Wallet
          </Text>
        </View>
      </ScrollView>

      <Card style={s.bottomCta}>
        {selected === "AWASH" && walletBalance < auction.bidFee && (
          <View style={{ marginBottom: 10, gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.destructive,
                textAlign: "center",
              }}
            >
              Insufficient balance: {formatCurrency(walletBalance)} (fee: {formatCurrency(auction.bidFee)})
            </Text>
            <TouchableOpacity
              onPress={() => go("deposit")}
              style={{
                borderRadius: 10,
                backgroundColor: colors.primary,
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                + Top Up Wallet
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <CTAButton
          onPress={handlePayPress}
          disabled={
            !hasValidBid ||
            walletBalance < auction.bidFee ||
            checkingPin
          }
        >
          {checkingPin ? (
            "Checking..."
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Wallet size={18} color={colors.primaryForeground} />
              <Text
                style={{
                  color: colors.primaryForeground,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Proceed to Payment · {formatCurrency(auction.bidFee)}
              </Text>
            </View>
          )}
        </CTAButton>
      </Card>

      <Modal
        visible={showAgreementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={s.confirmBackdrop}>
          <Card style={[s.confirmSheet, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View style={s.confirmHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.confirmTitle}>Confirm Your Bid</Text>
                  <Text style={s.confirmSubtext}>
                    Review your bid and the service fee before proceeding to
                    payment.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAgreementModal(false)}
                  style={s.confirmCloseButton}
                >
                  <X size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Card style={s.confirmCard}>
                <Text style={s.confirmLabel}>Your Bid Item:</Text>
                <Text style={s.confirmProductName}>{auction.name}</Text>

                <View style={s.confirmDivider} />

                <View style={s.confirmRow}>
                  <Text style={s.confirmLabel}>Your Bid Amount:</Text>
                  <Text style={s.confirmBidAmount}>
                    {formatCurrency(numericBid)}
                  </Text>
                </View>

                <View style={s.confirmDivider} />

                <Text style={s.confirmLabel}>Bid Service Fee:</Text>
                <Text style={s.confirmFeeText}>
                  {formatCurrency(auction.bidFee)} (Non-refundable)
                </Text>

                <Text style={s.confirmBody}>
                  The bid service fee is non-refundable and is paid to participate
                  in the auction. The amount submitted as a bid is not charged at
                  the time of placing the bid. In this auction, winners are
                  determined based on the lowest unique bid submitted among all
                  participants. Only participants who win the auction will be
                  required to pay the amount of their winning bid, in addition to
                  the participation fee.
                </Text>
              </Card>

              <TouchableOpacity
                onPress={() => setAgreementAccepted((value) => !value)}
                style={s.confirmAgreementRow}
              >
                <View
                  style={[
                    s.confirmCheckbox,
                    agreementAccepted ? s.confirmCheckboxChecked : null,
                  ]}
                >
                  {agreementAccepted ? (
                    <ShieldCheck size={14} color={colors.primaryForeground} />
                  ) : null}
                </View>
                <Text style={s.confirmAgreementText}>I agree to continue</Text>
              </TouchableOpacity>

              <CTAButton
                onPress={handleConfirmAgreement}
                disabled={!agreementAccepted}
              >
                Proceed to Payment · {formatCurrency(auction.bidFee)}
              </CTAButton>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={() => setShowPinModal(false)}
          >
            <View />
          </TouchableOpacity>
          <Card style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {needsPinSetup ? "Set Wallet PIN" : "Enter Wallet PIN"}
              </Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {needsPinSetup ? (
              <>
                <Text style={s.modalDesc}>
                  Create a 4–6 digit PIN to secure your wallet payments.
                </Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="New PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupPin}
                  onChangeText={setSetupPin}
                />
                <TextInput
                  style={s.pinInput}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupConfirm}
                  onChangeText={setSetupConfirm}
                />
                {setupError && <Text style={s.pinError}>{setupError}</Text>}
                <CTAButton onPress={handleSetupPin} disabled={setupLoading}>
                  {setupLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    "Set PIN & Pay"
                  )}
                </CTAButton>
              </>
            ) : pinLocked ? (
              <>
                <View
                  style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}
                >
                  <AlertTriangle size={40} color={colors.destructive} />
                  <Text style={s.modalTitle}>PIN Locked</Text>
                  <Text style={s.modalDesc}>
                    Too many incorrect attempts. Your wallet PIN has been locked
                    for security. Try again in {lockCountdown || "05:00s"}.
                  </Text>
                </View>
                <CTAButton
                  variant="outline"
                  onPress={() => setShowPinModal(false)}
                >
                  Close
                </CTAButton>
              </>
            ) : (
              <>
                <Text style={s.modalDesc}>
                  Enter your wallet PIN to confirm payment of{" "}
                  {formatCurrency(auction.bidFee)}.
                </Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="Enter PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={pinInput}
                  onChangeText={setPinInput}
                  autoFocus
                />
                {pinError && <Text style={s.pinError}>{pinError}</Text>}
                {attemptsRemaining != null && attemptsRemaining <= 3 && (
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: colors.warning,
                      }}
                    >
                      {attemptsRemaining} attempt
                      {attemptsRemaining !== 1 ? "s" : ""} remaining
                    </Text>
                  </View>
                )}
                <CTAButton
                  onPress={handleVerifyPin}
                  disabled={pinLoading || !pinInput.trim()}
                >
                  {pinLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    "Confirm Payment"
                  )}
                </CTAButton>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


const s = StyleSheet.create({
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.navy + "0D",
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: colors.navy + "B3",
    flex: 1,
  },
  methodSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    marginTop: 12,
  },
  methodSelectorTitle: { fontSize: 14, fontWeight: "700", color: colors.navy },
  methodSelectorSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  methodsList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginTop: 8,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 12,
  },
  methodOptionSelected: { backgroundColor: colors.primary + "1A" },
  methodOptionTitle: { fontSize: 13, fontWeight: "700", color: colors.navy },
  methodOptionSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bidControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 8,
  },
  duplicateWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: colors.warning + "1A",
    borderWidth: 1,
    borderColor: colors.warning + "40",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  duplicateText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
    flex: 1,
  },
  bidControlActive: {
    borderColor: colors.emerald200,
    shadowColor: colors.emerald500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  bidAdjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  bidAdjustBtnDisabled: { opacity: 0.45 },
  bidInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
    color: colors.navy,
    paddingVertical: 8,
  },
  bidCurrency: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.mutedForeground,
    paddingBottom: 4,
  },
  bottomCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  confirmSheet: {
    padding: 20,
    borderRadius: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  confirmCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: colors.navy },
  confirmSubtext: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  confirmCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  confirmProductName: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  confirmBidAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.emerald700,
  },
  confirmFeeText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: colors.destructive,
  },
  confirmBody: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 28,
    color: colors.mutedForeground,
  },
  confirmAgreementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  confirmCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmAgreementText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.navy,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.navy },
  modalDesc: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  pinInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.input,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    backgroundColor: colors.muted,
    textAlign: "center",
    letterSpacing: 8,
  },
  pinError: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.destructive,
    textAlign: "center",
  },
});
