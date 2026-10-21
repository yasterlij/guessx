import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { Gavel, Clock, Trophy, ChevronRight, ImageIcon, Hash, Copy, Check, Search, X, Sparkles, TrendingUp, Wallet } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card, CTAButton } from '../components/AuctionUI'
import { useCountdown } from '../components/Countdown'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRow } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import { CURRENCY, formatCurrency, formatCountdown } from '../mockDataV0'
import { colors } from '../theme'

function TimeLeft({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const { d, h, m, s } = formatCountdown(t)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Clock size={12} color={colors.navy} />
      <Text style={{ fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.navy }}>
        {d !== '00' ? `${parseInt(d)}d ` : ''}{h}:{m}:{s} left
      </Text>
    </View>
  )
}

export function MyBidsScreen() {
  const { go, goBack, myBids, selectAuction, getAuction, auctionsLoading, refreshAuctions, refreshWallet } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'ended'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null)
  const toast = useToast()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshAuctions(), refreshWallet()])
    } finally {
      setRefreshing(false)
    }
  }, [refreshAuctions, refreshWallet])

  const copyTicket = (ticket: string) => {
    setCopiedTicket(ticket)
    toast.show(`Ticket ${ticket} copied!`, 'success')
    setTimeout(() => setCopiedTicket(null), 2500)
  }

  // Filter and stats calculations
  const { filteredBids, stats } = useMemo(() => {
    let totalBidsCount = myBids.length
    let activeAuctionsCount = 0
    let endedAuctionsCount = 0
    let totalSpent = 0

    const processed = myBids.map((b) => {
      const a = getAuction(b.auctionId)
      const isClosed = a?.status === 'closed'
      if (isClosed) endedAuctionsCount++
      else activeAuctionsCount++
      totalSpent += (a?.bidFee ?? 1)
      return { bid: b, auction: a, isClosed }
    })

    let filtered = processed

    if (filterTab === 'active') {
      filtered = filtered.filter((item) => !item.isClosed)
    } else if (filterTab === 'ended') {
      filtered = filtered.filter((item) => item.isClosed)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((item) =>
        item.auction?.name.toLowerCase().includes(q) ||
        (item.bid.ticketNumber && item.bid.ticketNumber.toLowerCase().includes(q)) ||
        (item.auction?.publicCode && item.auction.publicCode.toLowerCase().includes(q))
      )
    }

    return {
      filteredBids: filtered,
      stats: {
        totalBids: totalBidsCount,
        activeAuctions: activeAuctionsCount,
        endedAuctions: endedAuctionsCount,
        totalSpent,
      },
    }
  }, [myBids, getAuction, filterTab, searchQuery])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="My Bids" onBack={goBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Summary Stats Cards ── */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Gavel size={14} color={colors.primary} />
              <Text style={s.statLabel}>Bids Placed</Text>
            </View>
            <Text style={s.statValue}>{stats.totalBids}</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: colors.emerald500, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} color={colors.emerald600} />
              <Text style={s.statLabel}>Active</Text>
            </View>
            <Text style={s.statValue}>{stats.activeAuctions}</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: colors.awashBlue, borderLeftWidth: 4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Trophy size={14} color={colors.awashBlue} />
              <Text style={s.statLabel}>Ended</Text>
            </View>
            <Text style={s.statValue}>{stats.endedAuctions}</Text>
          </View>
        </View>

        {/* ── Search & Filter Tabs ── */}
        <View style={s.searchBarContainer}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bids by item or ticket..."
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

        <View style={s.filterTabsRow}>
          {(['all', 'active', 'ended'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilterTab(tab)}
              style={[s.tabBtn, filterTab === tab && s.tabBtnActive]}
            >
              <Text style={[s.tabBtnText, filterTab === tab && s.tabBtnTextActive]}>
                {tab === 'all' ? `All (${myBids.length})` : tab === 'active' ? `Active (${stats.activeAuctions})` : `Ended (${stats.endedAuctions})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {auctionsLoading && myBids.length === 0 ? (
          <View style={{ gap: 12, marginTop: 12 }}>
            {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : myBids.length === 0 ? (
          <EmptyState
            icon="bag"
            title="No bids yet"
            message="Browse the live auctions and place your first unique lowest bid to get started."
            actionLabel="Browse Live Auctions"
            onAction={() => go('auctions')}
          />
        ) : filteredBids.length === 0 ? (
          <EmptyState
            icon="search-x"
            title="No matching bids"
            message="No bids found for the current search/filter."
            actionLabel="Reset Filter"
            onAction={() => {
              setSearchQuery('')
              setFilterTab('all')
            }}
          />
        ) : (
          <View style={{ gap: 12, marginTop: 4 }}>
            {filteredBids.map(({ bid, auction, isClosed }) => {
              if (!auction) return null
              const isCopied = copiedTicket === bid.ticketNumber
              const publicCode = auction.publicCode || auction.id.slice(0, 6).toUpperCase()

              return (
                <TouchableOpacity
                  key={`${bid.auctionId}-${bid.placedAt}-${bid.amount}`}
                  onPress={() => selectAuction(bid.auctionId)}
                  activeOpacity={0.85}
                >
                  <Card style={s.bidRow}>
                    <View style={s.bidImg}>
                      {auction.images?.[0] ? (
                        <Image source={{ uri: auction.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <ImageIcon size={24} color="#94a3b8" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={s.auctionName} numberOfLines={1}>{auction.name}</Text>
                        <Badge tone={isClosed ? 'muted' : 'green'}>
                          {isClosed ? 'Ended' : <><Trophy size={10} /> Live</>}
                        </Badge>
                      </View>

                      <View style={s.bidAmountRow}>
                        <Text style={s.bidLabel}>Your Bid:</Text>
                        <Text style={s.bidValue}>{formatCurrency(bid.amount)}</Text>
                        {isClosed && auction.winning_bid_amount != null && Math.abs(bid.amount - auction.winning_bid_amount) < 0.001 && (
                          <Badge tone="gold">🏆 Winner</Badge>
                        )}
                      </View>

                      {bid.ticketNumber && (
                        <TouchableOpacity
                          style={s.ticketBadge}
                          onPress={(e) => {
                            e.stopPropagation?.()
                            copyTicket(bid.ticketNumber!)
                          }}
                          activeOpacity={0.7}
                        >
                          <Hash size={10} color={colors.awashBlue} />
                          <Text style={s.ticketText}>{bid.ticketNumber}</Text>
                          {isCopied ? (
                            <Check size={12} color={colors.emerald600} />
                          ) : (
                            <Copy size={11} color={colors.mutedForeground} />
                          )}
                        </TouchableOpacity>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        {isClosed ? (
                          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Auction ended</Text>
                        ) : (
                          <TimeLeft seconds={auction.timeLeft} />
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>View</Text>
                          <ChevronRight size={12} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}


const s = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 4,
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
    marginBottom: 12,
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
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bidImg: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  auctionName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.navy,
    flex: 1,
    marginRight: 6,
  },
  bidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bidLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  bidValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 4,
  },
  ticketText: {
    fontFamily: 'monospace',
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.awashBlue,
  },
})
