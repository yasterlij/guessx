import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native'
import { WebView } from 'react-native-webview'
import { X, Check, ArrowLeft } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar } from '../components/AuctionUI'
import { api } from '../api'
import { colors } from '../theme'
import { formatCurrency } from '../mockDataV0'

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 120000

export function SikinaPayCheckout() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, sikinaProxyUrl, setSikinaProxyUrl, sikinaPayContext, setFeePaid, pendingBidAmount, user } = useApp()
  const [status, setStatus] = useState<'loading' | 'paid' | 'failed'>('loading')
  const [webviewLoading, setWebviewLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleClose = () => {
    cleanup()
    setSikinaPayUrl(null)
    go(sikinaPayContext === 'bid-fee' ? 'pay-fee' : 'pay-winning')
  }

  useEffect(() => {
    if (user?.role === 'admin' && sikinaPayContext === 'bid-fee') {
      Alert.alert(
        'Bidding Restricted',
        'Administrators are not allowed to participate in bidding.',
      )
      cleanup()
      setSikinaPayUrl(null)
      go('product')
    }
  }, [user?.role, sikinaPayContext, go])

  useEffect(() => {
    if (!selectedId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = sikinaPayContext === 'bid-fee'
          ? await api.getBidFeePaymentStatus(selectedId)
          : await api.getPaymentLinkStatus(selectedId)
        if (res.status === 'SUCCESSFUL') {
          cleanup()
          setStatus('paid')
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(res.status)) {
          cleanup()
          setStatus('failed')
        }
      } catch {
        // retry on next interval
      }
    }, POLL_INTERVAL)

    timeoutRef.current = setTimeout(() => {
      cleanup()
      setStatus('failed')
    }, POLL_TIMEOUT)

    return cleanup
  }, [selectedId, sikinaPayContext])

  const handleContinuePaid = () => {
    cleanup()
    setSikinaPayUrl(null)
    if (sikinaPayContext === 'bid-fee') {
      setFeePaid(true)
      go('place-bid')
    } else {
      go('delivery')
    }
  }

  const handleConfirmManually = async () => {
    cleanup()
    setSikinaPayUrl(null)
    if (sikinaPayContext === 'bid-fee') {
      try {
        await api.confirmBidFeePayment(selectedId!)
        setFeePaid(true)
        go('place-bid')
      } catch {
        go('pay-fee')
      }
      return
    }
    try {
      await api.confirmPayment(selectedId!)
      go('delivery')
    } catch {
      go('pay-winning')
    }
  }

  const handleTryAgain = () => {
    cleanup()
    setSikinaPayUrl(null)
    go(sikinaPayContext === 'bid-fee' ? 'pay-fee' : 'pay-winning')
  }

  if (status === 'paid') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.emerald500, justifyContent: 'center', alignItems: 'center' }}>
          <Check size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.awashBlue, marginTop: 24 }}>Payment Successful!</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          {sikinaPayContext === 'bid-fee'
            ? `Your service fee was received successfully.${pendingBidAmount != null ? ` Saved bid ${formatCurrency(pendingBidAmount)} will be submitted next.` : ''}`
            : 'Your payment was received successfully.'}
        </Text>
        <TouchableOpacity
          onPress={handleContinuePaid}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.primary, marginTop: 24 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}>
            {sikinaPayContext === 'bid-fee' ? 'Submit Saved Bid' : 'Track Delivery'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  if (status === 'failed') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.destructive, justifyContent: 'center', alignItems: 'center' }}>
          <X size={40} color={colors.primaryForeground} strokeWidth={3} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.awashBlue, marginTop: 24 }}>Payment Not Confirmed</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          We couldn't automatically confirm your payment. If you've already paid, tap confirm below.
        </Text>
        <TouchableOpacity
          onPress={handleConfirmManually}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.primary, marginTop: 24 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryForeground }}>I've Already Paid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleTryAgain}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 300, height: 48, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.awashBlue }}>Try Again</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <View style={s.container}>
      <AppBar
        variant="light"
        title={sikinaPayContext === 'bid-fee' ? 'Pay Bid Fee' : 'Pay Winning Amount'}
        onBack={handleClose}
      />

      <View style={s.webviewContainer}>
        {webviewLoading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingText}>Loading payment page...</Text>
          </View>
        )}
        {sikinaPayUrl && (
<WebView
  source={{ uri: sikinaProxyUrl ?? sikinaPayUrl }}
  style={s.webview}
  onLoad={() => setWebviewLoading(false)}
  onError={() => setWebviewLoading(false)}
  javaScriptEnabled
  domStorageEnabled
  startInLoadingState
          />
        )}
      </View>

      <View style={s.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={s.footerText}>Waiting for payment confirmation...</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.awashBlue,
    fontFamily: 'Inter_700Bold',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  footerText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
})
