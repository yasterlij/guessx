import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Image, TextInput, Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, ArrowLeft, Crown, Sparkles, ArrowRight, Gavel, Timer, CreditCard, Users, Search, X, TrendingDown, Award } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { Badge, Card } from '../components/AuctionUI'
import { colors } from '../theme'
import { formatCurrency, formatETB } from '../mockDataV0'

export function WinnersListScreen() {
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0)
  const { go, goBack, auctions, refreshAuctions, selectAuction, user } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'highest-savings' | 'my-wins'>('all')
  const [displayCount, setDisplayCount] = useState(10)

  useEffect(() => {
    setDisplayCount(10)
  }, [filterTab, searchQuery])

  const closedAuctions = useMemo(() => auctions.filter((a) => a.status === 'closed'), [auctions])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  const { filtered, totalSavings } = useMemo(() => {
    let list = [...closedAuctions].filter((auction) => {
      const winningAmount = Number(auction.winning_bid_amount ?? 0)
      const hasValidWinner = auction.winnersCount != null ? auction.winnersCount > 0 : Boolean(auction.winners?.length)
      const hasMeaningfulBid = winningAmount > 0 && winningAmount >= 1
      return hasValidWinner && hasMeaningfulBid
    })
    let savingsSum = 0

    list.forEach((a) => {
      const winningAmount = Number(a.winning_bid_amount ?? 0)
      if (winningAmount > 0 && winningAmount >= 1 && a.marketPrice > 0) {
        savingsSum += Math.max(0, a.marketPrice - winningAmount)
      }
    })

    if (filterTab === 'my-wins') {
      list = list.filter((a) => a.winners?.some((w) => w.user_id === user?.id))
    } else if (filterTab === 'highest-savings') {
      list = list.sort((a, b) => {
        const savA = Number(a.winning_bid_amount ?? 0) > 0 && a.marketPrice > 0 ? (1 - Number(a.winning_bid_amount ?? 0) / a.marketPrice) : 0
        const savB = Number(b.winning_bid_amount ?? 0) > 0 && b.marketPrice > 0 ? (1 - Number(b.winning_bid_amount ?? 0) / b.marketPrice) : 0
        return savB - savA
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.publicCode && a.publicCode.toLowerCase().includes(q))
      )
    }

    return { filtered: list, totalSavings: savingsSum }
  }, [closedAuctions, filterTab, searchQuery, user?.id])

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#002B5C', '#001F3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: topInset + 6, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, marginBottom: 4 }}>
          <TouchableOpacity onPress={() => goBack()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <ArrowLeft size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Crown size={20} color={colors.primary} />
            <Text style={{ fontFamily: 'System', fontSize: 17, fontWeight: '800', color: '#FFF' }}>Winners Circle</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          {closedAuctions.length} closed auction{closedAuctions.length !== 1 ? 's' : ''} • Lowest unique bids win
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Total Value Savings Banner ── */}
        {totalSavings > 0 && (
          <View style={s.savingsBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.savingsIconWrap}>
                <TrendingDown size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.savingsLabel}>Total Winner Savings</Text>
                <Text style={s.savingsAmount}>{formatCurrency(totalSavings)} saved!</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Search Bar ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search winners by product or code..."
            placeholderTextColor={colors.mutedForeground}
            style={s.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Filter Tabs ── */}
        <View style={s.filterTabsRow}>
          {(['all', 'highest-savings', 'my-wins'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilterTab(tab)}
              style={[s.tabBtn, filterTab === tab && s.tabBtnActive]}
            >
              <Text style={[s.tabBtnText, filterTab === tab && s.tabBtnTextActive]}>
                {tab === 'all' ? `All (${closedAuctions.length})` : tab === 'highest-savings' ? 'Top Savings' : 'My Wins'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {closedAuctions.length === 0 ? (
          <View style={s.empty}>
            <Trophy size={48} color={colors.neutralGray300} />
            <Text style={s.emptyTitle}>No winners yet</Text>
            <Text style={s.emptySub}>Closed auctions and their winners will appear here.</Text>
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Gavel size={16} color={colors.primaryForeground} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primaryForeground }}>Browse Live Auctions</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[s.empty, { paddingVertical: 24 }]}>
            <Text style={s.emptyTitle}>No matching winners found</Text>
            <Text style={s.emptySub}>Try adjusting your search or switching filter tabs.</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {filtered.slice(0, displayCount).map((a) => {
              const savings = a.winning_bid_amount != null && a.marketPrice > 0 ? Math.round((1 - a.winning_bid_amount / a.marketPrice) * 100) : 0
              const winnerCount = a.winnersCount ?? a.winners?.length ?? 0
              const primaryWinner = a.winners?.[0]
              const winnerDisplay = primaryWinner?.name || 'Verified Winner'

              return (
                <TouchableOpacity key={a.id} onPress={() => selectAuction(a.id)} activeOpacity={0.85}>
                  <Card style={s.card}>
                    <View style={s.cardImgWrap}>
                      {a.images?.[0] ? (
                        <Image source={{ uri: a.images[0] }} style={s.cardImgFull} resizeMode="cover" />
                      ) : (
                        <View style={[s.cardImgFull, { backgroundColor: colors.neutralGray200, justifyContent: 'center', alignItems: 'center' }]}>
                          <Trophy size={32} color={colors.neutralGray400} />
                        </View>
                      )}
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
                      <View style={s.cardImgTop}>
                        <Badge tone="gold"><Crown size={10} /> Winner</Badge>
                        {savings > 0 && <Badge tone="gold"><Trophy size={9} /> -{savings}%</Badge>}
                      </View>
                      <View style={s.cardImgBottom}>
                        <Text style={s.cardName} numberOfLines={1}>{a.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>
                            Won with {formatCurrency(a.winning_bid_amount ?? a.bidFee)}
                          </Text>
                          {a.marketPrice > 0 ? (
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', textDecorationLine: 'line-through' }}>
                              {formatCurrency(a.marketPrice)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' }}>
                            <Award size={12} color={colors.primary} />
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>
                            {winnerDisplay}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>View Breakdown</Text>
                          <ArrowRight size={12} color={colors.primary} />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border + '60', paddingTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>
                          {a.totalBids || a.bidders} total bids evaluated
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.awashBlue }}>
                          Code {a.publicCode || a.id.slice(0, 6).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              )
            })}

            {filtered.length > displayCount && (
              <TouchableOpacity
                onPress={() => setDisplayCount((prev) => prev + 10)}
                style={{
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 6,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  Load More Winners ({filtered.length - displayCount} remaining)
                </Text>
              </TouchableOpacity>
            )}

            {filtered.length > 0 && (
              <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>
                  Showing {Math.min(displayCount, filtered.length)} of {filtered.length} closed auctions
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  savingsBanner: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  savingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  savingsAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.foreground,
    padding: 0,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabBtnTextActive: {
    color: colors.navyForeground,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImgWrap: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  cardImgFull: {
    width: '100%',
    height: '100%',
  },
  cardImgTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardImgBottom: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    textAlign: 'center',
  },
})
