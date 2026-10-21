import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Gavel, Trophy, Shield, Loader2, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, AwashLogo, Card } from '../components/AuctionUI'
import { colors, CURRENCY } from '../theme'
import { formatCurrency, formatETB } from '../mockDataV0'
import { api } from '../api'
import { isStaffRole } from '@guessx/api'

export function ClosedScreen() {
  const insets = useSafeAreaInsets()
  const { go, goBack, selectedId, user, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const isAdmin = isStaffRole(user?.role)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + 4
      })
    }, 90)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => setDone(true), 500)
      return () => clearTimeout(t)
    }
  }, [progress])

  const handleReveal = async () => {
    setRevealing(true)
    try {
      await api.closeAuction(selectedId!)
      go('winner')
    } catch {
      go('winner')
    } finally {
      setRevealing(false)
    }
  }

  if (!auction) return null

  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      <AppBar
        title="Auction Closed"
        onBack={() => goBack()}
        right={<AwashLogo variant="light" size={22} />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Icon */}
        <View style={{
          width: 88, height: 88, borderRadius: 44,
          backgroundColor: done ? colors.primary : colors.awashBlue,
          justifyContent: 'center', alignItems: 'center',
          shadowColor: done ? colors.primary : colors.awashBlue,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: done ? 0.4 : 0.2,
          shadowRadius: 20,
          elevation: 8,
        }}>
          {done ? (
            <Trophy size={44} color={colors.primaryForeground} />
          ) : (
            <Gavel size={44} color={colors.primary} />
          )}
        </View>
        {done && (
          <View style={{
            position: 'absolute', top: -4, right: 8,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.emerald500,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <CheckCircle2 size={18} color="#FFF" />
          </View>
        )}

        <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 24, color: colors.foreground, marginTop: 24 }}>
          {done ? 'Auction Closed!' : 'Closing Auction...'}
        </Text>

        {/* Auction Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: colors.awashBlue + '1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.awashBlue + '33' }}>
          <Gavel size={14} color={colors.awashBlue} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.awashBlue }}>{auction.name}</Text>
        </View>

        {/* Progress */}
        <View style={{ width: '100%', maxWidth: 280, marginTop: 32, alignItems: 'center' }}>
          {done ? (
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '1A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + '33' }}>
                  <Sparkles size={14} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Result Ready</Text>
                </View>
                {auction.second_winner_assigned && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald600 + '1A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.emerald600 + '33' }}>
                    <Trophy size={13} color={colors.emerald600} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.emerald600 }}>Second Winner Assigned</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Bid Amount</Text>
                  <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 16, color: colors.primary }}>{formatCurrency(auction.bidFee)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Savings</Text>
                  <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 16, color: colors.emerald600 }}>{savings}%</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1, color: colors.mutedForeground }}>Bidders</Text>
                  <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 16, color: colors.awashBlue }}>{auction.totalBids || auction.bidders}</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: colors.neutralGray200, overflow: 'hidden' }}>
                <View style={{ width: `${progress}%`, height: '100%', borderRadius: 5, backgroundColor: colors.primary }} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, marginTop: 8, fontVariant: ['tabular-nums'] }}>
                Analyzing bids... {progress}%
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: colors.accent, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.primary + '33' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.primary }}>Finding the lowest unique bid...</Text>
              </View>
            </>
          )}
        </View>

        {/* Non-admin info */}
        {done && !isAdmin && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 24, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, maxWidth: 280, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Shield size={16} color={colors.warning} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#92400E', flex: 1 }}>
              Results are being reviewed by the admin. You will be notified once the winner is declared.
            </Text>
          </View>
        )}

        {/* Admin prompt */}
        {done && isAdmin && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, backgroundColor: colors.awashBlue + '1A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.awashBlue + '33' }}>
            <Shield size={14} color={colors.awashBlue} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.awashBlue }}>Close to draw and reveal the winner</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <Card style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
        {isAdmin ? (
          <CTAButton disabled={!done || revealing} onPress={handleReveal}>
            {revealing ? (
              <><ActivityIndicator size="small" color={colors.primaryForeground} /> Closing & Drawing...</>
            ) : done ? (
              <><Trophy size={16} color={colors.primaryForeground} /> Reveal Winner</>
            ) : (
              'Determining...'
            )}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onPress={() => goBack()}>Back to Home</CTAButton>
        )}
      </Card>
    </View>
  )
}
