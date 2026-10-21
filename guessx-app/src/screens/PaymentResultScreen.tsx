import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { Check, X, ArrowRight, RefreshCw } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { Card } from '../components/AuctionUI'
import { colors } from '../theme'
import { formatCurrency, formatETB } from '../mockDataV0'

type ResultType = 'success' | 'failed' | 'pending'

export function PaymentResultScreen() {
  const { go, selectedId, userBid, pendingBidAmount, getAuction, sikinaPayContext, setFeePaid, user } = useApp()
  const auction = getAuction(selectedId)
  const [polling, setPolling] = useState(true)
  const [result, setResult] = useState<ResultType>('pending')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isBidFee = sikinaPayContext === 'bid-fee'
  const amount = isBidFee ? (auction?.bidFee ?? 0) : (userBid ?? 0)

  useEffect(() => {
    let cancelled = false

    const check = async (): Promise<boolean> => {
      try {
        if (selectedId) {
          const status = isBidFee
            ? await api.getBidFeePaymentStatus(selectedId)
            : await api.getPaymentLinkStatus(selectedId)
          if (!cancelled) {
            if (status.status === 'SUCCESSFUL') {
              setResult('success')
              setPolling(false)
              return true
            } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status.status)) {
              setResult('failed')
              setPolling(false)
              return true
            }
          }
        } else {
          if (!cancelled) {
            setResult('success')
            setPolling(false)
            return true
          }
        }
      } catch {
        if (!cancelled) setResult('failed')
      }
      return false
    }

    check().then((done) => {
      if (!done && !cancelled) {
        pollRef.current = setInterval(async () => {
          const finished = await check()
          if (finished && pollRef.current) {
            clearInterval(pollRef.current)
          }
        }, 3000)
        setTimeout(() => {
          if (pollRef.current) clearInterval(pollRef.current)
          if (!cancelled) setPolling(false)
        }, 60000)
      }
    })

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId, isBidFee])

  if (polling && result === 'pending') {
    return (
      <View style={[s.container, { flex: 1, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.pollingText}>Verifying payment status...</Text>
      </View>
    )
  }

  if (result === 'success') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[s.container, { flexGrow: 1, paddingVertical: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.iconCircle}>
          <Check size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={s.title}>Payment Successful!</Text>
        <Text style={s.subtitle}>
          Your payment of <Text style={s.amount}>{formatCurrency(amount)}</Text> was received.
        </Text>
        {pendingBidAmount != null ? <Text style={[s.subtitle, { marginTop: 6, color: colors.emerald700 }]}>Saved bid {formatCurrency(pendingBidAmount)} will be submitted next.</Text> : null}
        <Card style={{ width: '100%', maxWidth: 300, padding: 20, marginTop: 24 }}>
          <View style={s.row}>
            <Text style={s.label}>Product</Text>
            <Text style={s.value}>{auction?.name || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Amount</Text>
            <Text style={s.value}>{formatCurrency(amount)}</Text>
          </View>
          {pendingBidAmount != null && (
            <View style={s.row}>
              <Text style={s.label}>Saved bid</Text>
              <Text style={s.value}>{formatCurrency(pendingBidAmount)}</Text>
            </View>
          )}
          <View style={s.row}>
            <Text style={s.label}>Status</Text>
            <Text style={[s.value, { color: colors.emerald500 }]}>Completed</Text>
          </View>
        </Card>
        <TouchableOpacity style={s.btn} onPress={() => {
          if (isBidFee) {
            if (user?.role === 'admin') {
              Alert.alert('Bidding Restricted', 'Administrators are not allowed to participate in bidding.')
              go('product')
              return
            }
            setFeePaid(true);
            go('place-bid')
          } else {
            go('delivery')
          }
        }} activeOpacity={0.8}>
          <ArrowRight size={18} color={colors.primaryForeground} />
          <Text style={s.btnText}>{isBidFee ? 'Submit Saved Bid' : 'Track Delivery'}</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { flexGrow: 1, paddingVertical: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.iconCircle, { backgroundColor: colors.destructive }]}>
        <X size={40} color={colors.primaryForeground} strokeWidth={3} />
      </View>
      <Text style={s.title}>Payment Not Completed</Text>
      <Text style={s.subtitle}>
        The payment was not completed. You can try again or contact support.
      </Text>
      <TouchableOpacity style={s.btn} onPress={() => {
        if (isBidFee && user?.role === 'admin') {
          Alert.alert('Bidding Restricted', 'Administrators are not allowed to participate in bidding.')
          go('product')
          return
        }
        go(isBidFee ? 'pay-fee' : 'pay-winning')
      }} activeOpacity={0.8}>
        <RefreshCw size={18} color={colors.primaryForeground} />
        <Text style={s.btnText}>Try Again</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  pollingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.emerald500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: colors.navy,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  amount: {
    fontWeight: '700',
    color: colors.navy,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 300,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginTop: 24,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
})