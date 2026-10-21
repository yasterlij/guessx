import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Image, StyleSheet, Animated, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Users, Radio, Eye, ImageIcon, Trophy, TrendingDown } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, Badge } from '../components/AuctionUI'
import { Countdown } from '../components/Countdown'
import { CURRENCY, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function MonitorScreen() {
  const insets = useSafeAreaInsets()
  const { go, goBack, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const bellAnim = useRef(new Animated.Value(1)).current

  const [seconds, setSeconds] = useState(auction?.timeLeft ?? 0)

  useEffect(() => {
    setSeconds(auction?.timeLeft ?? 0)
  }, [auction?.timeLeft])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (seconds <= 0) {
      const t = setTimeout(() => go('closed'), 1200)
      return () => clearTimeout(t)
    }
  }, [seconds, go])

  useEffect(() => {
    if (seconds > 0 && seconds <= 60) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(bellAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      )
      loop.start()
      return () => loop.stop()
    } else {
      bellAnim.setValue(1)
    }
  }, [seconds])

  if (!auction) return null

  const endingSoon = seconds <= 60
  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Auction in Progress" onBack={goBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Animated.View style={[s.liveBadge, { opacity: pulseAnim }]}>
            <Radio size={14} color={colors.emerald700} />
            <Text style={s.liveText}>LIVE</Text>
          </Animated.View>
        </View>

        <Card style={{ alignItems: 'center', padding: 20, marginTop: 16 }}>
          <View style={s.productImage}>
            {auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: 96, height: 96 }} resizeMode="cover" /> : <ImageIcon size={32} color="#94a3b8" />}
          </View>
          <Text style={s.productName}>{auction.name}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Time Left</Text>
          <View style={{ marginTop: 8 }}>
            <Countdown seconds={seconds} size="lg" />
          </View>

        </Card>

        {auction.maxBid && (
          <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Total bids: {auction.totalBids || auction.bidders}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Capacity: {auction.maxBid}</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${bidProgress * 100}%`, height: '100%', borderRadius: 3, backgroundColor: bidProgress > 0.8 ? colors.primary : colors.emerald500 }} />
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
            <Users size={20} color={colors.navy} />
            <Text style={s.statNumber}>{auction.totalBids || auction.bidders || 0}</Text>
            <Text style={s.statLabel}>Total Bids</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
            <Users size={20} color={colors.primary} />
            <Text style={[s.statNumber, { color: colors.primary }]}>{auction.uniqueBidders || 0}</Text>
            <Text style={s.statLabel}>Bidders</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center', padding: 16 }}>
            <TrendingDown size={20} color={colors.emerald600} />
            <Text style={s.bidStat}>{formatETB(userBid ?? 0)}</Text>
            <Text style={s.statLabel}>Your Bid</Text>
          </Card>
        </View>

        {endingSoon && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', backgroundColor: colors.accent, padding: 16, marginTop: 16 }}>
            <Animated.View style={[s.alertIcon, { opacity: bellAnim }]}>
              <Bell size={20} color={colors.primaryForeground} />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Auction Ending Soon!</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navy + 'B3' }}>{auction.name} is about to close. Stay tuned!</Text>
            </View>
          </Card>
        )}

        {auction.minBid && (auction.totalBids || auction.bidders) < auction.minBid && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: colors.orange + '44', backgroundColor: colors.orange + '11', padding: 12, marginTop: 12 }}>
            <Bell size={16} color={colors.orange} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.orange, flex: 1 }}>
              Only {(auction.totalBids || auction.bidders)}/{auction.minBid} bids — may extend if under minimum
            </Text>
          </Card>
        )}

        <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '500', color: colors.navy + '99', marginTop: 16 }}>
          Keep watching — you might be the lowest unique bidder!
        </Text>
      </ScrollView>

      <Card style={[s.bottomCta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <CTAButton variant="navy" onPress={() => go('closed')}>
          <Eye size={18} /> View Result Now
        </CTAButton>
      </Card>
    </View>
  )
}


const s = StyleSheet.create({
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: colors.emerald100, paddingHorizontal: 12, paddingVertical: 4 },
  liveText: { fontSize: 12, fontWeight: '700', color: colors.emerald700 },
  productImage: { width: 96, height: 96, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  productName: { fontSize: 18, fontWeight: '800', color: colors.navy, marginTop: 12 },
  statNumber: { fontSize: 24, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground, marginTop: 4 },
  bidStat: { fontSize: 24, fontWeight: '800', color: colors.emerald600, fontVariant: ['tabular-nums'] },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
})
