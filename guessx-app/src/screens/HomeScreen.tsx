import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Pressable, Dimensions, RefreshControl, TextInput, Platform, StatusBar, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Gavel, Wallet, ArrowRight, Eye, EyeOff, Shield, LogOut, Sparkles, Trophy, Bell, Heart, Search, TicketCheck, Crown, PartyPopper, CheckCircle2, TrendingDown, Clock, Calendar, ShieldCheck } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashMark } from '../components/AuctionUI'
import { SmartImage } from '../components/SmartImage'
import { colors } from '../theme'
import { formatCurrency, formatETB, formatCountdown, COMING_SOON_ITEMS } from '../mockDataV0'
import { useCountdown } from '../components/Countdown'
import { AuctionCard } from './AuctionsScreen'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - 16 * 2

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const SCREEN_W_ACTUAL = Dimensions.get('window').width
const HERO_W = SCREEN_W_ACTUAL * 0.75
const HERO_H = HERO_W * (3 / 4)

function HeroSlide({ item, onJoin, counter }: { item: any; onJoin: () => void; counter?: string }) {
  const t = useCountdown(item.timeLeft)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = item.status === 'ending-soon' || (t > 0 && t < 3600)
  const publicCode = item.publicCode || item.id.slice(0, 6).toUpperCase()

  if (!item.images?.length) {
    return (
      <View style={{ width: HERO_W, height: HERO_H, marginRight: 12, borderRadius: 16, overflow: 'hidden' }}>
        <LinearGradient colors={['#002B5C', '#001F3F']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Gavel size={40} color="rgba(255,255,255,0.2)" />
          <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 }}>{item.name}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{
      width: HERO_W, height: HERO_H, marginRight: 12,
      borderRadius: 16, overflow: 'hidden',
      shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
    }}>
      <SmartImage uri={item.images[0]} alt={item.name} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
      <View style={{ position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,43,92,0.75)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Gavel size={12} color="#FFF" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Live Auction</Text>
          </View>
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 }}>CODE {publicCode}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {counter && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] }}>{counter}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <View style={{ backgroundColor: urgent ? colors.primary + '30' : 'rgba(255,255,255,0.8)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: urgent ? colors.primary + '40' : 'rgba(255,255,255,0.3)' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: urgent ? colors.primary : colors.awashBlue, fontVariant: ['tabular-nums'] }}>
            {d !== '00' ? `${parseInt(d)}d ` : ''}{h}:{m}:{s}
          </Text>
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 54, left: 10, right: 10, zIndex: 10 }}>
        <Text style={{ color: '#FFF', fontFamily: 'System', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
          {item.name}
        </Text>
        {item.specSummary ? <Text style={{ color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '600', marginTop: 4 }}>{item.specSummary}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <View style={{ borderRadius: 999, backgroundColor: colors.primary + '33', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '40' }}>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Entry Fee: {formatCurrency(item.bidFee)}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(236,253,245,0.92)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(167,243,208,0.45)' }}>
            <Text style={{ color: colors.emerald700, fontSize: 10, fontWeight: '700' }}>{item.totalBids || item.bidders} bidders</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onJoin} activeOpacity={0.85} style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>Join Auction</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const WINNER_CARD_W = 270
const WINNER_IMG_H = 140

function WinnerSlide({
  auction,
  index,
  onPress,
}: {
  auction: any
  index: number
  onPress: () => void
}) {
  const winnerInfo = auction.winners?.[0]
  const maskPhone = (p: string | null) => (p ? p.slice(0, 4) + 'XXXX' + p.slice(-2) : null)
  const maskedPhone = winnerInfo?.phone ? maskPhone(winnerInfo.phone) : null
  const firstName = winnerInfo?.name ? winnerInfo.name.split(' ')[0] : null
  const winnerName =
    firstName && maskedPhone
      ? `${firstName} (${maskedPhone})`
      : firstName || maskedPhone || `Winner #${index + 1}`
  const bidAmount = auction.winning_bid_amount ?? winnerInfo?.amount ?? 0
  const marketPrice = auction.marketPrice ?? 0
  const savings =
    marketPrice > 0 && bidAmount > 0
      ? Math.round((1 - bidAmount / marketPrice) * 100)
      : 0
  const savedAmount = marketPrice > bidAmount ? marketPrice - bidAmount : 0
  const hasImage = Boolean(auction.images?.[0])

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        width: WINNER_CARD_W,
        marginRight: 14,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.primary + '38',
        overflow: 'hidden',
        shadowColor: colors.awashBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
      }}
    >
      {/* ── Top Hero Image with celebratory overlays ── */}
      <View style={{ width: '100%', height: WINNER_IMG_H, position: 'relative', backgroundColor: colors.awashBlue, overflow: 'hidden' }}>
        {hasImage ? (
          <SmartImage
            uri={auction.images[0]}
            alt={auction.name}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#002B5C', '#001A3A']}
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
          >
            <Trophy size={48} color={colors.primary + '66'} />
          </LinearGradient>
        )}

        {/* Dual Gradient Overlay for legibility & prestige */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0, 31, 63, 0.92)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Badges */}
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 43, 92, 0.88)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '66' }}>
            <Crown size={12} color="#D4B85E" />
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 }}>WINNER #{index + 1}</Text>
          </View>
          {savings > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.emerald600, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 }}>
              <TrendingDown size={11} color="#FFF" />
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>-{savings}% OFF</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Sparkles size={11} color={colors.primaryForeground} />
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primaryForeground }}>CLAIMED</Text>
            </View>
          )}
        </View>

        {/* Product Title Overlaid On Bottom of Image */}
        <View style={{ position: 'absolute', bottom: 8, left: 10, right: 10, zIndex: 10 }}>
          <Text
            style={{
              color: '#FFF',
              fontFamily: 'System',
              fontSize: 15,
              fontWeight: '800',
              textShadowColor: 'rgba(0,0,0,0.85)',
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 4,
            }}
            numberOfLines={1}
          >
            {auction.name}
          </Text>
          {auction.specSummary ? (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 1 }} numberOfLines={1}>
              {auction.specSummary}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Bottom Details ── */}
      <View style={{ padding: 12, gap: 10 }}>
        {/* Winner Name & Verified Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary + '18', borderWidth: 1.5, borderColor: colors.primary + '55', justifyContent: 'center', alignItems: 'center' }}>
            <PartyPopper size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: 'System', fontSize: 13, fontWeight: '800', color: colors.navy }} numberOfLines={1}>
                {winnerName}
              </Text>
              <CheckCircle2 size={13} color={colors.emerald600} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>
              Lowest Unique Bid Winner
            </Text>
          </View>
        </View>

        {/* Price Box with Winning Bid vs Retail Value */}
        <View style={{ backgroundColor: colors.accent, borderRadius: 14, borderWidth: 1, borderColor: colors.primary + '22', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.primary }}>Winning Bid</Text>
            <Text style={{ fontFamily: 'System', fontSize: 17, fontWeight: '800', color: colors.navy, marginTop: 1, fontVariant: ['tabular-nums'] }}>
              {formatCurrency(bidAmount)}
            </Text>
          </View>
          {marketPrice > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.mutedForeground }}>Retail Value</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, textDecorationLine: 'line-through', marginTop: 1, fontVariant: ['tabular-nums'] }}>
                {formatCurrency(marketPrice)}
              </Text>
            </View>
          )}
        </View>

        {/* Footer: Savings highlight + Tap Action */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
          {savedAmount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} color={colors.primary} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.emerald700 }}>
                Saved {formatCurrency(savedAmount)}!
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>View Result</Text>
            <ArrowRight size={12} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function ComingSoonSlide({
  item,
  isWatched,
  onToggleWatch,
}: {
  item: any
  isWatched: boolean
  onToggleWatch: () => void
}) {
  const hasImage = Boolean(item.images?.[0])
  return (
    <View
      style={{
        width: WINNER_CARD_W,
        marginRight: 14,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: isWatched ? colors.primary + '90' : 'rgba(0, 43, 92, 0.12)',
        overflow: 'hidden',
        shadowColor: colors.awashBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      <View style={{ width: '100%', height: WINNER_IMG_H, position: 'relative', backgroundColor: colors.awashBlue, overflow: 'hidden' }}>
        {hasImage ? (
          <SmartImage
            uri={item.images[0]}
            alt={item.name}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient colors={['#002B5C', '#001A3A']} style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
            <Sparkles size={40} color={colors.primary + '66'} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,43,92,0.88)', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '60' }}>
            <Clock size={11} color={colors.primary} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Coming Soon
            </Text>
          </View>

          <TouchableOpacity
            onPress={onToggleWatch}
            activeOpacity={0.8}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isWatched ? colors.primary : 'rgba(0,0,0,0.5)',
              borderWidth: 1,
              borderColor: isWatched ? colors.primary : 'rgba(255,255,255,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Heart
              size={15}
              color={isWatched ? colors.primaryForeground : '#FFF'}
              fill={isWatched ? colors.primaryForeground : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3.5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color={colors.navy} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.navy }}>{item.dropTime}</Text>
          </View>
          <View style={{ backgroundColor: colors.primary + 'E6', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3.5 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primaryForeground, textTransform: 'uppercase' }}>
              {item.category}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 14, color: colors.foreground, lineHeight: 18 }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, lineHeight: 15 }} numberOfLines={2}>
          {item.specSummary}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.mutedForeground }}>Est. Bid Fee</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary, marginTop: 1, fontVariant: ['tabular-nums'] }}>
              {formatCurrency(item.bidFee)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.mutedForeground }}>Retail Value</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginTop: 1, fontVariant: ['tabular-nums'] }}>
              {formatCurrency(item.marketPrice)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onToggleWatch}
          activeOpacity={0.85}
          style={{
            marginTop: 4,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isWatched ? colors.primary : 'rgba(0,43,92,0.15)',
          }}
        >
          <LinearGradient
            colors={isWatched ? ['#002B5C', '#001A3A'] : ['#C8A642', '#D4B85E', '#C8A642']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 9,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Heart
              size={13}
              color={isWatched ? '#E6AF2E' : colors.primaryForeground}
              fill={isWatched ? '#E6AF2E' : 'transparent'}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isWatched ? '#FFF' : colors.primaryForeground,
              }}
            >
              {isWatched ? 'Added to Watchlist' : 'Notify Me (Watch)'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function HomeScreen() {
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0)
  const { go, walletBalance, user, logout, auctions, auctionsLoading, selectAuction, refreshAuctions, myBids, getAuction, unreadNotificationCount, isFavorite, toggleFavorite, favoriteAuctionIds } = useApp()
  const isAdmin = user?.role === 'admin'
  const [showBalance, setShowBalance] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  const winnerScrollRef = useRef<ScrollView>(null)
  const comingSoonScrollRef = useRef<ScrollView>(null)
  const heroScrollRef = useRef<ScrollView>(null)
  const isDraggingRef = useRef(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshAuctions()
    setRefreshing(false)
  }, [refreshAuctions])

  const activeAuctions = useMemo(
    () => auctions.filter((a) => a.status !== 'closed'),
    [auctions],
  )
  const closedAuctions = useMemo(
    () => auctions.filter((a) => a.status === 'closed'),
    [auctions],
  )
  const endingSoon = useMemo(
    () => activeAuctions.filter((a) => a.status === 'ending-soon' || a.timeLeft < 3600),
    [activeAuctions],
  )
  const displayHero = useMemo(
    () => (endingSoon.length > 0 ? endingSoon : activeAuctions),
    [endingSoon, activeAuctions],
  )
  const heroCount = displayHero.length
  const heroSlides = Math.min(heroCount, 10)
  const heroIds = useMemo(
    () => new Set(displayHero.slice(0, 10).map((a) => a.id)),
    [displayHero],
  )
  const liveGrid = useMemo(
    () => activeAuctions.filter((a) => !heroIds.has(a.id)),
    [activeAuctions, heroIds],
  )

  const bidAuctionIds = useMemo(
    () => new Set(myBids.map((b) => b.auctionId)),
    [myBids],
  )
  const bidCategories = useMemo(
    () =>
      new Set(
        myBids.map((b) => getAuction(b.auctionId)?.category).filter((c): c is string => !!c),
      ),
    [myBids, getAuction],
  )
  const suggestedAuctions = useMemo(
    () =>
      activeAuctions.filter(
        (a) => !heroIds.has(a.id) && !bidAuctionIds.has(a.id) && bidCategories.has(a.category),
      ),
    [activeAuctions, heroIds, bidAuctionIds, bidCategories],
  )
  const showSuggested = myBids.length > 0 && suggestedAuctions.length > 0

  const updateHeroIndex = useCallback((x: number) => {
    const step = HERO_W + 12
    setHeroIndex(Math.max(0, Math.min(Math.round(x / step), Math.max(heroSlides - 1, 0))))
  }, [heroSlides])

  const onHeroScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isDraggingRef.current) return
    updateHeroIndex(e.nativeEvent.contentOffset.x)
  }, [updateHeroIndex])

  const onHeroMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false
    setHeroPaused(false)
    updateHeroIndex(e.nativeEvent.contentOffset.x)
  }, [updateHeroIndex])

  const goToHero = useCallback((i: number) => {
    const idx = Math.max(0, Math.min(i, Math.max(heroSlides - 1, 0)))
    setHeroIndex(idx)
    heroScrollRef.current?.scrollTo({ x: idx * (HERO_W + 12), animated: true })
  }, [heroSlides])

  const safeHeroIndex = Math.min(heroIndex, Math.max(heroSlides - 1, 0))

  useEffect(() => {
    if (heroPaused || heroSlides <= 1) return
    const id = setInterval(() => {
      goToHero((heroIndex + 1) % heroSlides)
    }, 5000)
    return () => clearInterval(id)
  }, [heroPaused, heroSlides, heroIndex, goToHero])

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      <StatusBar barStyle="light-content" />
      {/* ── Header ── */}
      <View style={{ backgroundColor: colors.awashBlue, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: topInset + 6, paddingBottom: 8, height: topInset + 56 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}>
              <AwashMark size={28} />
            </View>
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Guess X</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>Hello, {user?.name ? user.name.split(' ')[0] : 'Bidder'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Header Watchlist Pill */}
            <TouchableOpacity
              onPress={() => go('favorites')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: favoriteAuctionIds.length > 0 ? 'rgba(200, 166, 66, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                borderColor: favoriteAuctionIds.length > 0 ? colors.primary + '80' : 'rgba(255, 255, 255, 0.25)',
                borderRadius: 20,
                paddingHorizontal: 11,
                paddingVertical: 6,
              }}
            >
              <Heart
                size={14}
                color={favoriteAuctionIds.length > 0 ? '#E6AF2E' : '#FFF'}
                fill={favoriteAuctionIds.length > 0 ? '#E6AF2E' : 'transparent'}
              />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>
                Watchlist
              </Text>
              {favoriteAuctionIds.length > 0 && (
                <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primaryForeground }}>
                    {favoriteAuctionIds.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => go('notifications')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <Bell size={18} color="#FFF" />
              {unreadNotificationCount > 0 && (
                <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: colors.primary, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: colors.primaryForeground, fontSize: 9, fontWeight: '800' }}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>{getInitials(user?.name || '?')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Trust & Guarantee Strip */}
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: -6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FEFCE8', borderRadius: 12, borderWidth: 1, borderColor: '#FEF08A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#854D0E" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#854D0E' }}>
              Awash Escrow Protected
            </Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#A16207' }}>
            UNCITRAL & ICC Verified
          </Text>
        </View>

        {/* ── Live Auctions Carousel ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,43,92,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,43,92,0.08)' }}>
                <Gavel size={18} color={colors.awashBlue} />
              </View>
              <View>
                <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 17, color: colors.foreground }}>Live Auctions</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>{activeAuctions.length} live · bid low, be unique!</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>View All</Text>
                <ArrowRight size={12} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={heroScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12, marginHorizontal: -16, paddingHorizontal: 16 }}
            onScroll={onHeroScroll}
            scrollEventThrottle={16}
            snapToInterval={HERO_W + 12}
            decelerationRate="fast"
            onScrollBeginDrag={() => {
              isDraggingRef.current = true
              setHeroPaused(true)
            }}
            onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              isDraggingRef.current = false
              setHeroPaused(false)
              updateHeroIndex(e.nativeEvent.contentOffset.x)
            }}
            onMomentumScrollEnd={onHeroMomentumEnd}
          >
            {auctionsLoading ? (
              <View style={{ width: HERO_W, height: HERO_H, borderRadius: 16, backgroundColor: colors.neutralGray200, marginRight: 12 }} />
            ) : displayHero.length > 0 ? (
              displayHero.slice(0, 10).map((a, i) => (
                <HeroSlide key={a.id} item={a} onJoin={() => selectAuction(a.id)} counter={`${i + 1} / ${heroSlides}`} />
              ))
            ) : (
              <View style={{ width: SCREEN_W - 32, height: 140, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(0,0,0,0.08)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)' }}>
                <Gavel size={28} color={colors.neutralGray300} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.neutralGray400, marginTop: 6 }}>No live auctions yet</Text>
              </View>
            )}
          </ScrollView>

          {!auctionsLoading && displayHero.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {displayHero.slice(0, 10).map((a, i) => (
                <TouchableOpacity key={a.id} onPress={() => goToHero(i)} activeOpacity={0.7}>
                  <View
                    style={{
                      width: i === safeHeroIndex ? 22 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === safeHeroIndex ? colors.primary : colors.neutralGray300,
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            {auctionsLoading && auctions.length === 0 ? (
              [1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: CARD_W, height: CARD_W * 0.75, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.neutralGray200 }} />
              ))
            ) : liveGrid.length > 0 ? (
              liveGrid.slice(0, 4).map((a) => (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  onOpen={() => selectAuction(a.id)}
                  isFav={isFavorite(a.id)}
                  onToggleFavorite={() => toggleFavorite(a.id)}
                />
              ))
            ) : null}
          </View>

          {!auctionsLoading && activeAuctions.length > 0 && (
            <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50', backgroundColor: colors.primary + '0D' }}>
              <LinearGradient colors={['rgba(200,166,66,0.08)', 'rgba(212,184,94,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>View All Live Auctions</Text>
                <ArrowRight size={14} color={colors.primary} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Suggested For You ── */}
        {showSuggested && (
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '20' }}>
                  <Sparkles size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 17, color: colors.foreground }}>Suggested For You</Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground }}>Based on the auctions you've joined</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden' }}>
                <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>View All</Text>
                  <ArrowRight size={12} color={colors.primaryForeground} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {suggestedAuctions.slice(0, 4).map((a) => (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  onOpen={() => selectAuction(a.id)}
                  isFav={isFavorite(a.id)}
                  onToggleFavorite={() => toggleFavorite(a.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Section B: Winners ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 26 }}>
          {/* Section Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <LinearGradient
                colors={['#C8A642', '#D4B85E', '#C8A642']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Crown size={22} color={colors.primaryForeground} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 18, color: colors.navy }}>
                    Celebrate Our Winners!
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginTop: 2 }}>
                  Real bidders winning big with lowest unique bids
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => go('winners-list')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>View All</Text>
                <ArrowRight size={12} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Celebratory Banner */}
          {closedAuctions.length > 0 && (
            <LinearGradient
              colors={['#002B5C', '#001833']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(200, 166, 66, 0.4)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: colors.awashBlue,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(200, 166, 66, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 166, 66, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
                  <PartyPopper size={18} color="#D4B85E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'System', fontSize: 13, fontWeight: '800', color: '#FFF' }}>
                    🎉 Verified GuessX Auction Winners
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                    {closedAuctions.length} completed auction{closedAuctions.length !== 1 ? 's' : ''} • Prizes delivered across Ethiopia
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Horizontal Winner Slides */}
          <ScrollView
            ref={winnerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
          >
            {closedAuctions.length > 0 ? (
              closedAuctions.slice(0, 6).map((a, i) => (
                <WinnerSlide
                  key={a.id}
                  auction={a}
                  index={i}
                  onPress={() => {
                    selectAuction(a.id)
                    go('winner')
                  }}
                />
              ))
            ) : (
              <View style={{ width: SCREEN_W - 32, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary + '33', borderStyle: 'dashed', backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary + '44' }}>
                  <Trophy size={28} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy, textAlign: 'center' }}>Winners Spotlight Coming Soon</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>
                  Auctions close when time expires or max bids are reached. The lowest unique bid always wins!
                </Text>
                <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ marginTop: 6, borderRadius: 12, overflow: 'hidden' }}>
                  <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Gavel size={14} color={colors.primaryForeground} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryForeground }}>Join Live Auctions</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom All Winners CTA Button */}
          {closedAuctions.length > 0 && (
            <TouchableOpacity onPress={() => go('winners-list')} activeOpacity={0.85} style={{ marginTop: 14, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '44' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Trophy size={16} color={colors.primaryForeground} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryForeground }}>Explore All Recent Winners ({closedAuctions.length})</Text>
                <ArrowRight size={14} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Section C: Coming Soon ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 26 }}>
          {/* Section Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <LinearGradient
                colors={['#002B5C', '#004B99', '#002B5C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.awashBlue,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Sparkles size={22} color="#D4B85E" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'System', fontWeight: '800', fontSize: 18, color: colors.navy }}>
                    Coming Soon to Guess X!
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mutedForeground, marginTop: 2 }}>
                  Preview upcoming Guess X drops & set alerts
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => go('favorites')} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary + '50' }}>
              <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primaryForeground }}>Watchlist</Text>
                <ArrowRight size={12} color={colors.primaryForeground} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Coming Soon Teaser Banner */}
          <LinearGradient
            colors={['#002B5C', '#001833']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              marginBottom: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(200, 166, 66, 0.4)',
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: colors.awashBlue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(200, 166, 66, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 166, 66, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
                <Bell size={18} color="#D4B85E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'System', fontSize: 13, fontWeight: '800', color: '#FFF' }}>
                  🚀 Get Early Drop Alerts
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                  Tap the heart to add items to your Watchlist and receive instant launch alerts
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Horizontal Coming Soon Slides */}
          <ScrollView
            ref={comingSoonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
          >
            {COMING_SOON_ITEMS.map((item) => (
              <ComingSoonSlide
                key={item.id}
                item={item}
                isWatched={isFavorite(item.id)}
                onToggleWatch={() => toggleFavorite(item.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Promo ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <LinearGradient colors={['#002B5C', '#001A3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary + '12' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '40' }}>
                <Sparkles size={13} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: 'System', fontWeight: '700', fontSize: 12, color: colors.primary }}>Guess X</Text>
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 18 }}>
              Premium phones, TVs, and laptops waiting for their lowest unique bid. The lower your bid, the better your chance to win.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{activeAuctions.length} live auctions</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>{closedAuctions.length} winners crowned</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>Lowest unique bid wins</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => go('auctions')} activeOpacity={0.85} style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#C8A642', '#D4B85E', '#C8A642']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryForeground }}>Browse Auctions</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => go('my-bids')} style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 10, alignItems: 'center' }} activeOpacity={0.85}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>My Bids</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenuOpen(false)}>
          <View />
        </Pressable>
        <View style={s.dropdown}>
          <View style={s.menuHeader}>
            <View style={s.menuAvatar}>
              <Text style={s.menuAvatarText}>{getInitials(user?.name || '?')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuName}>{user?.name || 'User'}</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>{user?.phone}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); go('wallet') }}>
            <Wallet size={16} color={colors.primary} />
            <Text style={s.menuItemText}>My Wallet</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); go('admin-dashboard') }}>
              <Shield size={16} color={colors.primary} />
              <Text style={s.menuItemText}>Admin Panel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.menuItem} onPress={() => { setMenuOpen(false); logout() }}>
            <LogOut size={16} color={colors.destructive} />
            <Text style={[s.menuItemText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdown: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.92)', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 20 },
  menuAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '1A', justifyContent: 'center', alignItems: 'center' },
  menuAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  menuName: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
})
