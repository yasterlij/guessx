import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CreditCard, CheckCircle2, Clock } from "lucide-react-native";
import { CTAButton, Card } from "../components/AuctionUI";
import { colors } from "../theme";

export type PaymentStatus = "PAID" | "DEFAULTED" | "EXPIRED" | "PENDING" | null | undefined;

interface WinnerPaymentCtaProps {
  hasWinner: boolean;
  userIsWinner: boolean;
  userPaymentStatus: PaymentStatus;
  isPaymentExpired: boolean;
  isPrimaryWinner: boolean;
  onPay: () => void;
  onBack: () => void;
}

export function WinnerPaymentCta({
  hasWinner,
  userIsWinner,
  userPaymentStatus,
  isPaymentExpired,
  isPrimaryWinner,
  onPay,
  onBack,
}: WinnerPaymentCtaProps) {
  const insets = useSafeAreaInsets();

  return (
    <Card
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {hasWinner && userIsWinner ? (
        userPaymentStatus === "PAID" ? (
          <CTAButton onPress={onBack}>
            <CheckCircle2 size={18} /> Payment Complete — Back Home
          </CTAButton>
        ) : isPaymentExpired ? (
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.destructive,
                textAlign: "center",
              }}
            >
              This auction is no longer eligible for payment. The payment
              deadline has expired.
            </Text>
            <CTAButton variant="outline" onPress={onBack}>
              Back to Dashboard
            </CTAButton>
          </View>
        ) : !isPrimaryWinner ? (
          <CTAButton variant="outline" onPress={() => {}}>
            <Clock size={18} /> Waiting for higher-ranked winners
          </CTAButton>
        ) : (
          <CTAButton onPress={onPay}>
            <CreditCard size={18} /> Process Payment
          </CTAButton>
        )
      ) : (
        <CTAButton variant="outline" onPress={onBack}>
          Back to Dashboard
        </CTAButton>
      )}
    </Card>
  );
}
