import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Wallet,
  ArrowDown,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  Receipt,
  PhoneCall,
  Gavel,
  Check,
  TicketCheck,
  Trophy,
} from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { AppBar, Card, CTAButton, AwashLogo, AwashMark } from '../components/AuctionUI'
import { useToast } from '../components/Toast'
import { CURRENCY, formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export function WalletScreen() {
  const {
    go,
    walletBalance,
    refreshWallet,
    user,
    myBids,
    getAuction,
  } = useApp()
  const toast = useToast()

  const [showBalance, setShowBalance] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'topup' | 'transactions'>('topup')

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refreshWallet()
    } finally {
      setRefreshing(false)
    }
  }, [refreshWallet])

  const numericAmount = parseFloat(topUpAmount || '0')
  const isValidAmount = numericAmount > 0

  const handleDeposit = async (amt?: number) => {
    const depositValue = amt ?? numericAmount
    if (depositValue <= 0 || loading) return
    setLoading(true)
    try {
      await api.wallet.deposit(depositValue)
      await refreshWallet()
      setTopUpAmount('')
      toast.show(`Successfully deposited ${formatCurrency(depositValue)}!`, 'success')
    } catch (e: unknown) {
      toast.show((e instanceof Error ? e.message : undefined) || 'Deposit failed. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const maskedPhone = user?.phone
    ? user.phone.slice(-4)
    : '0913'

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      {/* ── App Bar ── */}
      <AppBar
        title="GuessX Wallet"
        variant="navy"
        right={
          <TouchableOpacity
            onPress={onRefresh}
            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Virtual Luxury Awash Bank Card ── */}
        <LinearGradient
          colors={['#002B5C', '#001A3A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.virtualCard}
        >
          {/* Background Ambient Glows */}
          <View style={s.cardGlow1} />
          <View style={s.cardGlow2} />

          {/* Top Row: Bank Mark & NFC Signal */}
          <View style={s.cardTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={s.cardLogoWrap}>
                <AwashMark size={24} />
              </View>
              <View>
                <Text style={s.cardBankTitle}>GUESSX</Text>
                <Text style={s.cardBankSubtitle}>ESCROW DIGITAL WALLET</Text>
              </View>
            </View>
            <View style={s.verifiedChip}>
              <CheckCircle2 size={12} color="#10B981" />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
          </View>

          {/* EMV Chip & Contactless */}
          <View style={s.chipRow}>
            <View style={s.emvChip}>
              <View style={s.emvLine1} />
              <View style={s.emvLine2} />
            </View>
            <TouchableOpacity onPress={() => setShowBalance((s) => !s)} style={s.balanceToggleBtn}>
              {showBalance ? (
                <Eye size={16} color="rgba(255,255,255,0.7)" />
              ) : (
                <EyeOff size={16} color="rgba(255,255,255,0.7)" />
              )}
              <Text style={s.balanceToggleText}>{showBalance ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Display */}
          <View style={{ marginTop: 8 }}>
            <Text style={s.balanceLabel}>Available Balance</Text>
            <Text style={s.balanceAmount}>
              {showBalance ? formatCurrency(walletBalance) : '••••••••'}
            </Text>
          </View>

          {/* Card Footer: Account Number & User Name */}
          <View style={s.cardFooter}>
            <View>
              <Text style={s.cardHolderLabel}>ACCOUNT HOLDER</Text>
              <Text style={s.cardHolderName}>{user?.name?.toUpperCase() || 'VALUED CUSTOMER'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.cardHolderLabel}>ACCOUNT</Text>
              <Text style={s.cardNumber}>**** **** **** {maskedPhone}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Sub Navigation Tabs ── */}
        <View style={s.tabsWrap}>
          <TouchableOpacity
            onPress={() => setActiveTab('topup')}
            style={[s.tabBtn, activeTab === 'topup' && s.tabBtnActive]}
            activeOpacity={0.8}
          >
            <TrendingUp size={14} color={activeTab === 'topup' ? colors.primary : colors.mutedForeground} />
            <Text style={[s.tabText, activeTab === 'topup' && s.tabTextActive]}>Top Up & Add Funds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('transactions')}
            style={[s.tabBtn, activeTab === 'transactions' && s.tabBtnActive]}
            activeOpacity={0.8}
          >
            <Receipt size={14} color={activeTab === 'transactions' ? colors.primary : colors.mutedForeground} />
            <Text style={[s.tabText, activeTab === 'transactions' && s.tabTextActive]}>
              Activity ({myBids.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'topup' ? (
          <>
            {/* ── Quick Top-Up Section ── */}
            <Card style={s.sectionCard}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={s.iconBadge}>
                    <ArrowDown size={16} color={colors.primary} />
                  </View>
                  <Text style={s.sectionTitle}>Instant Top-Up</Text>
                </View>
                <Text style={s.instantTag}>0% Service Fee</Text>
              </View>

              <Text style={s.sectionSubtitle}>
                Select an amount to instantly deposit funds into your Awash wallet for Guess X bids.
              </Text>

              {/* Quick Amount Chips */}
              <View style={s.quickGrid}>
                {QUICK_AMOUNTS.map((amt) => {
                  const isSelected = numericAmount === amt
                  return (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setTopUpAmount(String(amt))}
                      style={[s.quickAmountBtn, isSelected && s.quickAmountBtnActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.quickAmountText, isSelected && s.quickAmountTextActive]}>
                        +{amt}
                      </Text>
                      <Text style={[s.quickAmountCur, isSelected && s.quickAmountCurActive]}>
                        {CURRENCY}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Custom Input */}
              <View style={s.inputContainer}>
                <Text style={s.inputLabel}>Or enter custom amount ({CURRENCY})</Text>
                <View style={s.inputRow}>
                  <TextInput
                    value={topUpAmount}
                    onChangeText={(t) =>
                      setTopUpAmount(
                        t
                          .replace(/[^\d.]/g, '')
                          .replace(/(\..*)\./g, '$1')
                          .slice(0, 7)
                      )
                    }
                    keyboardType="numeric"
                    placeholder="e.g. 250"
                    placeholderTextColor={colors.mutedForeground}
                    style={s.inputField}
                  />
                  {isValidAmount && (
                    <TouchableOpacity onPress={() => setTopUpAmount('')} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Deposit Button */}
              <TouchableOpacity
                onPress={() => handleDeposit()}
                disabled={!isValidAmount || loading}
                activeOpacity={0.85}
                style={[s.depositBtn, (!isValidAmount || loading) && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={['#C8A642', '#D4B85E', '#C8A642']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.depositBtnInner}
                >
                  {loading ? (
                    <ActivityIndicator size={18} color={colors.primaryForeground} />
                  ) : (
                    <>
                      <Sparkles size={16} color={colors.primaryForeground} />
                      <Text style={s.depositBtnText}>
                        {isValidAmount
                          ? `Deposit ${formatCurrency(numericAmount)}`
                          : 'Enter Amount to Deposit'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Card>

            {/* ── Security & Awash Bank Guarantees ── */}
            <Card style={[s.sectionCard, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[s.iconBadge, { backgroundColor: colors.emerald50 }]}>
                  <ShieldCheck size={18} color={colors.emerald600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Bank-Grade Security</Text>
                  <Text style={s.sectionSubtitle}>
                    Integrated directly with GuessX Escrow Banking system.
                  </Text>
                </View>
              </View>

              <View style={s.securityList}>
                <View style={s.securityItem}>
                  <Check size={14} color={colors.emerald600} />
                  <Text style={s.securityText}>Instant automatic escrow & refund upon outbid</Text>
                </View>
                <View style={s.securityItem}>
                  <Check size={14} color={colors.emerald600} />
                  <Text style={s.securityText}>Fast Bidding Pass — no payment gateway delays</Text>
                </View>
                <View style={s.securityItem}>
                  <Check size={14} color={colors.emerald600} />
                  <Text style={s.securityText}>PIN-protected withdrawals & winning disbursements</Text>
                </View>
              </View>
            </Card>
          </>
        ) : (
          /* ── Transactions / Activity Tab ── */
          <Card style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.iconBadge}>
                  <Receipt size={16} color={colors.primary} />
                </View>
                <Text style={s.sectionTitle}>Recent Bids & Payments</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>
                {myBids.length} records
              </Text>
            </View>

            {myBids.length > 0 ? (
              <View style={{ marginTop: 10, gap: 10 }}>
                {myBids.map((b, idx) => {
                  const auction = getAuction(b.auctionId)
                  const isWinner = auction?.winning_bid_amount != null && Math.abs(b.amount - auction.winning_bid_amount) < 0.001
                  return (
                    <View key={b.ticketNumber || `${b.auctionId}-${b.placedAt}-${idx}`} style={s.txnRow}>
                      <View style={[s.txnIconWrap, isWinner && { backgroundColor: '#FEFCE8' }]}>
                        {isWinner ? (
                          <Trophy size={16} color={colors.primary} />
                        ) : (
                          <TicketCheck size={16} color={colors.navy} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.txnTitle} numberOfLines={1}>
                          {auction?.name || `Auction #${b.auctionId.slice(0, 6)}`}
                        </Text>
                        <Text style={s.txnMeta}>
                          Bid: {formatCurrency(b.amount)} • Ticket #{b.ticketNumber || String(idx + 1).padStart(6, '0')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.txnAmount}>-{formatCurrency(auction?.bidFee ?? 50)}</Text>
                        <Text style={[s.txnStatus, isWinner && { color: colors.primary, fontWeight: '800' }]}>
                          {isWinner ? 'Winner Claimed' : 'Fee Paid · GuessX Pay'}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            ) : (
              <View style={s.emptyTxnWrap}>
                <Clock size={36} color={colors.neutralGray300} />
                <Text style={s.emptyTxnTitle}>No Wallet Activity Yet</Text>
                <Text style={s.emptyTxnSubtitle}>
                  Place your first lowest unique bid to see automated fee payments and winning claims here.
                </Text>
                <TouchableOpacity
                  onPress={() => go('auctions')}
                  style={s.browseBtn}
                  activeOpacity={0.8}
                >
                  <Text style={s.browseBtnText}>Browse Live Auctions</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* ── Support & Helpline Banner ── */}
        <View style={s.helpBanner}>
          <PhoneCall size={16} color={colors.primary} />
          <Text style={s.helpText}>
            GuessX 24/7 Helpline: <Text style={{ fontWeight: '800' }}>8980</Text> • support@guessx.com
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  virtualCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 166, 66, 0.4)',
    padding: 20,
    overflow: 'hidden',
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  cardGlow1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(200, 166, 66, 0.12)',
  },
  cardGlow2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 43, 92, 0.3)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBankTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  cardBankSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  emvChip: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#D4B85E',
    borderWidth: 1,
    borderColor: '#C8A642',
    padding: 3,
    justifyContent: 'space-around',
  },
  emvLine1: {
    height: 1,
    backgroundColor: '#B38F30',
  },
  emvLine2: {
    height: 1,
    backgroundColor: '#B38F30',
  },
  balanceToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  balanceToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceAmount: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  cardHolderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },
  cardHolderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  cardNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  instantTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald700,
    backgroundColor: colors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    lineHeight: 18,
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickAmountBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickAmountBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  quickAmountTextActive: {
    color: colors.primary,
  },
  quickAmountCur: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  quickAmountCurActive: {
    color: colors.primary,
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  depositBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  depositBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  depositBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  securityList: {
    gap: 8,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.navy,
    flex: 1,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  txnMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.destructive,
  },
  txnStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald600,
    marginTop: 2,
  },
  emptyTxnWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTxnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 8,
  },
  emptyTxnSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  browseBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary + '18',
  },
  browseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  helpText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
})
