import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, StatusBar, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Eye, Home, MessageSquareText, Copy, TicketCheck } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Card } from '../components/AuctionUI'
import { useToast } from '../components/Toast'
import { formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'
import { isStaffRole } from '@guessx/api'

export function BidConfirmedScreen() {
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0)
  const { go, selectedId, userBid, bidTicketNumber, getAuction, user } = useApp()
  const isAdmin = isStaffRole(user?.role)
  const auction = getAuction(selectedId)
  const pingAnim = useRef(new Animated.Value(1)).current
  const [copiedTicket, setCopiedTicket] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  if (!auction) return null

  const smsMessage = bidTicketNumber
    ? `Your bid of ${formatCurrency(userBid ?? 0)} on '${auction.name}' has been placed successfully. Your BID ticket number is: ${bidTicketNumber}`
    : null

  const handleCopyTicket = () => {
    if (!bidTicketNumber) return
    setCopiedTicket(true)
    toast.show(`Ticket ${bidTicketNumber} copied!`, 'success')
    setTimeout(() => setCopiedTicket(false), 2000)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.body, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ position: 'relative', marginBottom: 8 }}>
          <Animated.View
            style={[
              s.pingRing,
              { transform: [{ scale: pingAnim }], opacity: pingAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.4, 0] }) },
            ]}
          />
          <View style={s.checkInner}>
            <Check size={40} strokeWidth={3} color={colors.white} />
          </View>
        </View>
        <Text style={s.title}>Bid Submitted Successfully!</Text>

        {smsMessage && (
          <View style={s.smsBanner}>
            <MessageSquareText size={16} color={'#2563EB'} style={{ marginTop: 2 }} />
            <Text style={s.smsText}>{smsMessage}</Text>
          </View>
        )}

        <Card style={{ width: '100%', maxWidth: 280, padding: 20, marginTop: smsMessage ? 12 : 24 }}>
          <Text style={s.sectionLabel}>Your Bid</Text>
          <Text style={s.bidAmount}>{formatCurrency(userBid ?? 0)}</Text>
          <View style={s.divider} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.infoLabel}>Product</Text>
            <Text style={s.infoValue}>{auction.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.infoLabel}>Status</Text>
            <Text style={[s.infoValue, { color: colors.emerald600 }]}>Recorded ✓</Text>
          </View>
          {bidTicketNumber && (
            <TouchableOpacity onPress={handleCopyTicket} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }} activeOpacity={0.7}>
              <Text style={s.infoLabel}>Ticket</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[s.infoValue, { fontFamily: 'monospace', fontSize: 11 }]}>{bidTicketNumber}</Text>
                {copiedTicket ? <Check size={11} color={colors.emerald600} /> : <Copy size={11} color={colors.mutedForeground} />}
              </View>
            </TouchableOpacity>
          )}
        </Card>

        <Text style={s.keepWatching}>Keep watching — you might be the lowest unique bidder!</Text>
      </ScrollView>
      <View style={[s.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={{ gap: 8 }}>
          <CTAButton variant="navy" onPress={() => go('my-bids')}>
            <TicketCheck size={18} /> View My Bids
          </CTAButton>
          {isAdmin ? (
            <CTAButton variant="orange" onPress={() => go('monitor')}>
              <Eye size={18} /> Monitor Auction
            </CTAButton>
          ) : (
            <CTAButton variant="outline" onPress={() => go('auctions')}>
              <Home size={18} /> Browse More Auctions
            </CTAButton>
          )}
        </View>
      </View>
    </View>
  )
}


const s = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  pingRing: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.emerald400 + '4D',
  },
  checkInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.emerald500,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.emerald500, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 24 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', maxWidth: 280, marginTop: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground },
  bidAmount: { fontSize: 36, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  infoLabel: { fontSize: 12, color: colors.mutedForeground },
  infoValue: { fontSize: 12, fontWeight: '600', color: colors.navy },
  keepWatching: { fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', textAlign: 'center', maxWidth: 280, marginTop: 20 },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, padding: 16 },
  smsBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
    width: '100%', maxWidth: 280, marginTop: 16,
  },
  smsText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: '#1E40AF', flex: 1 },
})
