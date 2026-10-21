import React from "react"
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Building2, ChevronDown, ChevronUp, Lock, Minus, Plus, ShieldAlert, ShieldCheck, Wallet } from "lucide-react-native"
import { AwashMark, Card } from "./AuctionUI"
import { colors } from "../theme"
import { CURRENCY, formatCurrency } from "../mockDataV0"

type PaymentMethod = "AWASH"

export function ProductPurchasePanel({
  bidValue,
  bidFlash,
  bidError,
  onBidChange,
  onBidBlur,
  onDecrease,
  onIncrease,
  selectedPaymentMethod,
  showPaymentMethods,
  onTogglePaymentMethods,
  onSelectPaymentMethod,
  loadingMethod,
  checkingPin,
  walletBalance,
  bidFee,
  hasValidBid,
  authError,
  isEnding,
  isAdmin,
  onSubmit,
}: {
  bidValue: string
  bidFlash: boolean
  bidError: string | null
  onBidChange: (value: string) => void
  onBidBlur: () => void
  onDecrease: () => void
  onIncrease: () => void
  selectedPaymentMethod: PaymentMethod
  showPaymentMethods: boolean
  onTogglePaymentMethods: () => void
  onSelectPaymentMethod: (method: PaymentMethod) => void
  loadingMethod: PaymentMethod | null
  checkingPin: boolean
  walletBalance: number
  bidFee: number
  hasValidBid: boolean
  authError: string | null
  isEnding: boolean
  isAdmin?: boolean
  onSubmit: (method: PaymentMethod) => void
}) {
  const numericBid = bidValue ? Number(bidValue) : 0
  const awashDisabled = checkingPin || loadingMethod === "AWASH" || walletBalance < bidFee

  return (
    <View style={{ paddingHorizontal: 4 }}>
      <Card style={s.bidCard}>
        <Text style={s.label}>Bid Amount</Text>
        <View style={[s.bidInputWrap, bidFlash ? s.bidInputWrapActive : null]}>
          <TouchableOpacity onPress={onDecrease} disabled={numericBid <= 1} style={[s.stepBtn, numericBid <= 1 ? s.stepBtnDisabled : null]}>
            <Minus size={18} color={numericBid <= 1 ? colors.mutedForeground : colors.awashBlue} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <TextInput
              value={bidValue}
              onChangeText={onBidChange}
              onBlur={onBidBlur}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={s.bidInput}
              placeholderTextColor={"rgba(255,255,255,0.45)"}
            />
            <Text style={s.currency}>{CURRENCY}</Text>
          </View>
          <TouchableOpacity onPress={onIncrease} style={s.stepBtn}>
            <Plus size={18} color={colors.awashBlue} />
          </TouchableOpacity>
        </View>
        {bidError ? <Text style={s.errorText}>{bidError}</Text> : null}
      </Card>

      <Card style={s.paymentCard}>
        <Text style={s.label}>Payment</Text>

        <TouchableOpacity onPress={onTogglePaymentMethods} style={s.paymentSelector}>
          <View style={s.paymentSelectorLeft}>
            <View style={s.paymentIconWrap}>
              <Building2 size={20} color={colors.awashGold} />
            </View>
            <View>
              <Text style={s.paymentTitle}>Awash Wallet Pay</Text>
              <Text style={s.paymentSub}>Select payment type</Text>
            </View>
          </View>
          {showPaymentMethods ? <ChevronUp size={18} color={"rgba(255,255,255,0.68)"} /> : <ChevronDown size={18} color={"rgba(255,255,255,0.68)"} />}
        </TouchableOpacity>

        {showPaymentMethods && (
          <Card style={s.methodPickerCard}>
            <TouchableOpacity onPress={() => onSelectPaymentMethod("AWASH")} style={[s.methodOption, s.methodOptionSelected]}>
              <View style={s.awashMarkWrap}><AwashMark size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodOptionTitle}>Awash Wallet Pay</Text>
                <Text style={s.methodOptionSub}>Pay using your wallet balance</Text>
              </View>
            </TouchableOpacity>
          </Card>
        )}

        <View style={s.paymentSummary}>
          <View style={s.paymentSummaryHeader}>
            <View style={s.paymentSummaryLeft}>
              <Wallet size={20} color={colors.awashGold} />
              <View style={{ flex: 1 }}>
                <Text style={[s.paymentSummaryTitle, { color: colors.awashGold }]}>
                  Awash Wallet Pay
                </Text>
                <Text style={s.paymentSummarySub}>
                  Pay using your wallet balance after PIN confirmation.
                </Text>
              </View>
            </View>
            {loadingMethod === "AWASH" || checkingPin ? <ActivityIndicator size="small" color={colors.awashGold} /> : <Lock size={18} color={colors.awashGold} />}
          </View>
          <View style={s.paymentSummaryFooter}>
            <Text style={s.paymentSummaryFooterLabel}>Balance</Text>
            <Text style={[s.paymentSummaryFooterValue, walletBalance < bidFee ? s.paymentSummaryFooterValueDanger : null]}>
              {formatCurrency(walletBalance)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onSubmit("AWASH")}
          disabled={isAdmin || !hasValidBid || awashDisabled}
          style={[s.submitBtn, isAdmin || !hasValidBid || awashDisabled ? s.submitBtnDisabled : null, isAdmin ? { backgroundColor: colors.destructive } : null]}
        >
          {isAdmin ? (
            <ShieldAlert size={18} color="#FFF" />
          ) : loadingMethod === "AWASH" || checkingPin ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Wallet size={18} color={colors.primaryForeground} />
          )}
          <Text style={s.submitBtnText}>
            {isAdmin
              ? "Bidding Restricted (Admin)"
              : "Pay Fee with Awash Wallet"}
          </Text>
        </TouchableOpacity>

        {isAdmin ? (
          <Text style={[s.errorText, { color: "#FECACA" }]}>
            Administrators are not allowed to participate in bidding.
          </Text>
        ) : null}

        {!isAdmin && walletBalance < bidFee ? <Text style={s.errorText}>Awash Wallet balance is below the bid amount. Please top up your wallet.</Text> : null}
        {authError ? <Text style={s.errorText}>{authError}</Text> : null}
      </Card>

      {isEnding ? (
        <Card style={s.warningCard}>
          <Text style={s.warningText}>Place your bid before the timer ends.</Text>
        </Card>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  bidCard: { marginTop: 16, padding: 14, borderWidth: 0, backgroundColor: colors.navy },
  paymentCard: { marginTop: 16, padding: 16, borderWidth: 0, backgroundColor: "#0F4C81" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.72)", marginBottom: 10 },
  bidInputWrap: { width: "100%", maxWidth: 304, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.08)", padding: 8 },
  bidInputWrapActive: { borderColor: colors.emerald200 },
  stepBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center" },
  stepBtnDisabled: { opacity: 0.45 },
  bidInput: { textAlign: "center", fontSize: 30, fontWeight: "800", color: "#FFF", paddingVertical: 6 },
  currency: { textAlign: "center", fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.72)" },
  paymentSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.08)", padding: 14, marginTop: 10 },
  paymentSelectorLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)" },
  paymentTitle: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  paymentSub: { fontSize: 12, color: "rgba(255,255,255,0.68)" },
  methodPickerCard: { marginTop: 10, padding: 8, borderWidth: 1, borderColor: colors.border },
  methodOption: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12 },
  methodOptionSelected: { backgroundColor: colors.primary + "1A" },
  awashMarkWrap: { width: 20, height: 20, justifyContent: "center", alignItems: "center" },
  methodOptionTitle: { fontSize: 13, fontWeight: "700", color: colors.navy },
  methodOptionSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  paymentSummary: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.08)", padding: 14, marginTop: 12 },
  paymentSummaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  paymentSummaryLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  paymentSummaryTitle: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  paymentSummarySub: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.72)", marginTop: 2 },
  paymentSummaryFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  paymentSummaryFooterLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  paymentSummaryFooterValue: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  paymentSummaryFooterValueDanger: { color: "#FECACA" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 14, marginTop: 12 },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: colors.primaryForeground },
  errorText: { fontSize: 12, fontWeight: "600", color: colors.destructive, marginTop: 10 },
  warningCard: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  warningText: { fontSize: 11, fontWeight: "700", color: "#B45309" },
})
