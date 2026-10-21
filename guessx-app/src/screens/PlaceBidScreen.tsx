import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { Sparkles, TrendingDown, CheckCircle2, Minus, Plus, AlertTriangle, Info, Dices, Copy, Check } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, AwashMark } from '../components/AuctionUI'
import { useToast } from '../components/Toast'
import { CURRENCY, formatCurrency } from '../mockDataV0'
import { colors } from '../theme'
import { api } from '../api'

const QUICK_DELTAS = [0.05, 0.10, 0.50, 1.00, 5.00]

export function PlaceBidScreen() {
  const { go, goBack, selectedId, submitBid, getAuction, authError, feePaid, pendingBidAmount, setPendingBidAmount, myBids, user } = useApp()
  const auction = getAuction(selectedId)
  const [amountStr, setAmountStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const autoSubmittedRef = useRef(false)
  const [bidFlash, setBidFlash] = useState(false)
  const [serverBidAmounts, setServerBidAmounts] = useState<number[]>([])
  const [debouncedAmount, setDebouncedAmount] = useState(0)
  const [copiedCode, setCopiedCode] = useState(false)
  const toast = useToast()
  const STEP = 0.01

  useEffect(() => {
    if (user?.role === 'admin') {
      Alert.alert(
        'Bidding Restricted',
        'Administrators are not allowed to participate in bidding.',
      )
      goBack()
    }
  }, [user?.role, goBack])

  const amount = parseFloat(amountStr || '0')

  const hasPlacedBid = useCallback(
    (bAmount: number) =>
      myBids.some((b) => b.auctionId === selectedId && b.amount === bAmount) ||
      serverBidAmounts.some((a) => a === bAmount),
    [myBids, serverBidAmounts, selectedId],
  )

  useEffect(() => {
    const id = setTimeout(() => setDebouncedAmount(amount), 500)
    return () => clearTimeout(id)
  }, [amount])

  const isDuplicate = debouncedAmount > 0 && hasPlacedBid(debouncedAmount)
  const valid = amount >= 1 && !loading && !isDuplicate

  if (!auction) return null

  useEffect(() => {
    if (!bidFlash) return
    const id = setTimeout(() => setBidFlash(false), 240)
    return () => clearTimeout(id)
  }, [bidFlash])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    api.bid
      .myBids(selectedId)
      .then((res) => {
        if (active) setServerBidAmounts(res.bids.map((b) => b.amount))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [selectedId])

  const updateBid = useCallback((next: number) => {
    const safe = Math.max(1, Number(next.toFixed(2)))
    setAmountStr(safe.toFixed(2))
    setSubmitError(null)
    setBidFlash(true)
  }, [])

  const adjustBid = useCallback((delta: number) => {
    updateBid((amountStr ? Number(amountStr) : 1) + delta)
  }, [amountStr, updateBid])

  const suggestUniqueBid = useCallback(() => {
    // Generate an unexpected non-round decimal bid
    const base = Math.floor(Math.random() * 8) + 1
    const cents = Math.floor(Math.random() * 90) + 10
    const suggested = parseFloat(`${base}.${cents}`)
    updateBid(suggested)
    toast.show(`Suggested bid ${formatCurrency(suggested)} applied!`, 'info')
  }, [updateBid, toast])

  const copyAuctionCode = (code: string) => {
    setCopiedCode(true)
    toast.show(`Auction Code ${code} copied!`, 'success')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleSubmit = async () => {
    if (amount < 1) {
      setSubmitError('Minimum bid is 1.00')
      updateBid(1)
      return
    }
    if (hasPlacedBid(amount)) {
      Alert.alert(
        'Duplicate Bid',
        `You've already placed a bid of ${formatCurrency(amount)} on this auction. Please enter a different bid amount.`,
        [{ text: 'Change Bid Amount' }],
      )
      return
    }
    if (!valid) return
    setLoading(true)
    try {
      await submitBid(amount)
    } catch (e: unknown) {
      setSubmitError((e instanceof Error ? e.message : undefined) || 'Bid submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auction || !feePaid || pendingBidAmount == null || autoSubmittedRef.current) return
    if (hasPlacedBid(pendingBidAmount)) {
      Alert.alert(
        'Duplicate Bid',
        `You've already placed a bid of ${formatCurrency(pendingBidAmount)} on this auction. Please enter a different bid amount.`,
        [{ text: 'Change Bid Amount' }],
      )
      setPendingBidAmount(null)
      return
    }
    autoSubmittedRef.current = true
    setAmountStr(pendingBidAmount.toFixed(2))
    setLoading(true)
    setSubmitError(null)
    Promise.resolve(submitBid(pendingBidAmount))
      .catch((e: any) => {
        autoSubmittedRef.current = false
        setSubmitError((e instanceof Error ? e.message : undefined) || 'Bid submission failed. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [auction, feePaid, pendingBidAmount, submitBid, hasPlacedBid])

  const publicCode = auction.publicCode || auction.id.slice(0, 6).toUpperCase()
  const estSavings = auction.marketPrice > 0 && amount > 0 ? Math.max(0, auction.marketPrice - amount) : 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Place Your Bid"
        onBack={goBack}
        right={
          <TouchableOpacity onPress={() => go('home')} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
            <AwashMark size={22} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
        <Card style={s.snapshotCard}>
          <View style={s.snapshotHero}>
            <Text style={s.snapshotEyebrow}>Auction snapshot</Text>
            <Text style={s.snapshotTitle}>{auction.name}</Text>
            <TouchableOpacity onPress={() => copyAuctionCode(publicCode)} style={s.codeChip} activeOpacity={0.7}>
              <Text style={s.snapshotCode}>CODE {publicCode}</Text>
              {copiedCode ? <Check size={12} color="#FFF" /> : <Copy size={12} color="rgba(255,255,255,0.7)" />}
            </TouchableOpacity>
            {auction.specSummary ? <Text style={s.snapshotSummary}>{auction.specSummary}</Text> : null}
          </View>
        </Card>

        <View style={s.feePaidBanner}>
          <CheckCircle2 size={18} color={colors.emerald600} />
          <Text style={s.feePaidText}>Bid fee paid. You&apos;re in the auction for {auction.name}!</Text>
        </View>

        {feePaid && pendingBidAmount != null && (
          <Card style={{ padding: 12, marginTop: 12, backgroundColor: colors.awashBlue + '0D', borderWidth: 1, borderColor: colors.awashBlue + '1A' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.awashBlue }}>Saved bid {formatCurrency(pendingBidAmount)} detected. Submitting automatically after payment.</Text>
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {auction.maxBid && (
            <View style={s.statChip}>
              <Text style={s.statChipText}>Max {auction.maxBid} bids</Text>
            </View>
          )}
          {auction.minBid && (
            <View style={s.statChip}>
              <Text style={s.statChipText}>Min {auction.minBid} bids</Text>
            </View>
          )}
          {estSavings > 0 && (
            <View style={[s.statChip, { backgroundColor: colors.emerald50 }]}>
              <Text style={[s.statChipText, { color: colors.emerald700 }]}>Save ~{formatCurrency(estSavings)}</Text>
            </View>
          )}
        </View>

        {auction.maxBid && (
          <Card style={s.bidProgress}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Total bids: {auction.totalBids || auction.bidders}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.mutedForeground }}>Capacity: {auction.maxBid}</Text>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min((auction.totalBids || auction.bidders) / auction.maxBid * 100, 100)}%`, height: '100%', borderRadius: 2, backgroundColor: (auction.totalBids || auction.bidders) / auction.maxBid > 0.8 ? colors.primary : colors.emerald500 }} />
            </View>
          </Card>
        )}

        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <Text style={s.enterBidTitle}>Enter your bid amount</Text>
          <Text style={s.enterBidSub}>Your bid must be a unique lowest amount to win.</Text>
        </View>

        <Card style={{ padding: 18, marginTop: 16, borderRadius: 20 }}>
          <View style={[s.bidControl, bidFlash && s.bidControlActive]}>
            <TouchableOpacity onPress={() => adjustBid(-STEP)} disabled={amount <= 1} style={[s.bidAdjustBtn, amount <= 1 && s.bidAdjustBtnDisabled]}>
              <Minus size={18} color={amount <= 1 ? colors.mutedForeground : colors.awashBlue} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TextInput
                value={amountStr}
                onChangeText={(t) => {
                  setAmountStr(t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1').slice(0, 13))
                  setSubmitError(null)
                }}
                onBlur={() => {
                  if (!amountStr) return
                  const normalized = Number(amountStr)
                  if (normalized < 1) {
                    setSubmitError('Minimum bid is 1.00')
                    updateBid(1)
                    return
                  }
                  updateBid(normalized)
                }}
                keyboardType="decimal-pad"
                style={s.bidInput}
              />
              <Text style={s.bidCurrency}>{CURRENCY}</Text>
            </View>
            <TouchableOpacity onPress={() => adjustBid(STEP)} style={s.bidAdjustBtn}>
              <Plus size={18} color={colors.awashBlue} />
            </TouchableOpacity>
          </View>

          {/* Quick Delta Chips */}
          <View style={s.quickDeltasRow}>
            {QUICK_DELTAS.map((delta) => (
              <TouchableOpacity
                key={delta}
                onPress={() => adjustBid(delta)}
                style={s.deltaChip}
                activeOpacity={0.7}
              >
                <Text style={s.deltaChipText}>+{delta.toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Suggest Unique Bid Helper */}
          <TouchableOpacity onPress={suggestUniqueBid} style={s.suggestBtn} activeOpacity={0.8}>
            <Dices size={15} color={colors.primary} />
            <Text style={s.suggestBtnText}>Suggest Strategic Bid</Text>
          </TouchableOpacity>

          {isDuplicate && (
            <View style={s.duplicateWarning}>
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={s.duplicateText}>
                You've already placed a bid of {formatCurrency(amount)}. Please enter a different amount.
              </Text>
            </View>
          )}

          <View style={s.tip}>
            <TrendingDown size={16} color={colors.primary} />
            <Text style={s.tipText}>Lower & unique = better chance to win</Text>
          </View>
        </Card>

        <View style={s.strategy}>
          <Sparkles size={18} color={colors.primary} />
          <Text style={s.strategyText}>
            The winner is the person with the <Text style={{ fontWeight: '700' }}>lowest bid that nobody else picked</Text>. Choose an unexpected amount!
          </Text>
        </View>

        <View style={s.limitBanner}>
          <Info size={16} color={colors.warning} />
          <Text style={s.limitText}>
            Limited Auction Bid Participation — each participant is limited to a maximum of 150 bids per auction to ensure fair play and prevent monopolization.
          </Text>
        </View>

        {(authError || submitError) && (
          <View style={s.error}>
            <Text style={s.errorText}>{submitError || authError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton disabled={!valid} onPress={handleSubmit}>
          {loading ? <ActivityIndicator size={18} color="#fff" /> : 'Submit Bid Amount'}
        </CTAButton>
        <Text style={s.footerNote}>Terms and conditions will apply</Text>
      </View>
    </View>
  )
}


const s = StyleSheet.create({
  snapshotCard: { padding: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 },
  snapshotHero: { borderRadius: 18, padding: 16, backgroundColor: colors.awashBlue },
  snapshotEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' },
  snapshotTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  snapshotCode: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  snapshotSummary: { fontSize: 12, fontWeight: '600', lineHeight: 18, color: 'rgba(255,255,255,0.9)', marginTop: 10 },
  feePaidBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.emerald50, padding: 12, marginTop: 12 },
  feePaidText: { fontSize: 12, fontWeight: '600', color: colors.emerald700, flex: 1 },
  statChip: { borderRadius: 6, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4 },
  statChipText: { fontSize: 10, fontWeight: '600', color: colors.primary },
  bidProgress: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginTop: 8 },
  enterBidTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  enterBidSub: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 4, maxWidth: 256, textAlign: 'center' },
  bidControl: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 8 },
  bidControlActive: { borderColor: colors.emerald200, shadowColor: colors.emerald500, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 2 },
  bidAdjustBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  bidAdjustBtnDisabled: { opacity: 0.45 },
  bidInput: { width: '100%', textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.navy, paddingVertical: 8 },
  bidCurrency: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.mutedForeground, paddingBottom: 4 },
  quickDeltasRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 12 },
  deltaChip: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, alignItems: 'center' },
  deltaChipText: { fontSize: 11, fontWeight: '700', color: colors.awashBlue },
  suggestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' },
  suggestBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  duplicateWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, backgroundColor: colors.warning + '1A', borderWidth: 1, borderColor: colors.warning + '40', paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  duplicateText: { fontSize: 12, fontWeight: '600', color: colors.warning, flex: 1 },
  tip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16 },
  tipText: { fontSize: 12, fontWeight: '600', color: colors.accentForeground },
  strategy: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  strategyText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'CC', flex: 1 },
  limitBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: colors.warning + '1A', borderWidth: 1, borderColor: colors.warning + '40', padding: 12, marginTop: 12 },
  limitText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.warning, flex: 1 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card + 'F2', padding: 16 },
  footerNote: { marginTop: 10, textAlign: 'center', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.mutedForeground, textTransform: 'uppercase' },
  error: { borderRadius: 12, backgroundColor: colors.destructive + '15', padding: 12, marginTop: 16 },
  errorText: { fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' },
})
