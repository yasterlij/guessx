import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Gavel, Users, TrendingUp, DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle, Radio, Eye, ArrowUpRight, Trophy, RotateCcw, ShieldCheck, Receipt, FileText, Package, ChevronRight } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { CTAButton, Badge, Card } from '../components/AuctionUI'
import { formatCurrency } from '../mockDataV0'
import { colors } from '../theme'

export function AdminDashboardScreen() {
  const insets = useSafeAreaInsets()
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0)
  const { go, goBack, allBids, user, users, auctions } = useApp()
  const active = auctions.filter((a) => a.status !== 'closed')
  const closed = auctions.filter((a) => a.status === 'closed')
  const extended = auctions.filter((a) => a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000)
  const totalRevenue = allBids.length * 50

  const paidCount = closed.filter((a) => a.payment_status === 'PAID').length
  const expiredCount = closed.filter((a) => a.payment_status === 'EXPIRED').length
  const pendingCount = closed.filter((a) => a.payment_status !== 'PAID' && a.payment_status !== 'EXPIRED').length
  const secondWinnersCount = auctions.filter((a) => a.second_winner_assigned).length
  const totalWinnerPayments = closed
    .filter((a) => a.payment_status === 'PAID')
    .reduce((sum, a) => sum + Number(a.winning_bid_amount || 0), 0)

  const stats = [
    { icon: Gavel, label: 'Active Auctions', value: active.length, color: colors.primary },
    { icon: Users, label: 'Users', value: users.length, color: colors.navy },
    { icon: TrendingUp, label: 'Total Bids', value: allBids.length, color: colors.emerald600 },
    { icon: DollarSign, label: 'Bid Fee Revenue', value: formatCurrency(totalRevenue), color: colors.primary },
  ]

  const paymentStats = [
    { label: 'Pending Settlement', count: pendingCount, icon: Clock, color: colors.orange },
    { label: 'Winner Paid', count: paidCount, icon: CheckCircle2, color: colors.emerald600 },
    { label: 'Defaulted / Expired', count: expiredCount, icon: XCircle, color: colors.destructive },
    { label: '2nd Winners', count: secondWinnersCount, icon: RotateCcw, color: colors.primary },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: colors.navy, paddingTop: topInset + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navyForeground }}>Admin Panel</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navyForeground + '99', marginTop: 2 }}>Dashboard overview</Text>
          </View>
          <Badge tone="orange">Admin</Badge>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {stats.map((s) => (
            <Card key={s.label} style={s2.statCard}>
              <s.icon size={20} color={s.color} />
              <Text style={s2.statValue}>{s.value}</Text>
              <Text style={s2.statLabel}>{s.label}</Text>
            </Card>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {paymentStats.map((s) => (
            <Card key={s.label} style={{ flex: 1, padding: 10, alignItems: 'center' }}>
              <s.icon size={15} color={s.color} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 4 }}>{s.count}</Text>
              <Text style={{ fontSize: 9.5, fontWeight: '600', color: colors.mutedForeground, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Winner Proceeds & Compliance Banner */}
        <Card style={{ marginTop: 12, padding: 14, backgroundColor: '#FEFCE8', borderColor: '#FDE047' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#854D0E', textTransform: 'uppercase' }}>
                Winner Proceeds Collected
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.navy }}>
              {formatCurrency(totalWinnerPayments)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#FEF08A' }}>
            <ShieldCheck size={12} color="#854D0E" />
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#854D0E' }}>
              UNCITRAL Article 37 & ICC Rules Compliant Audit Ledger
            </Text>
          </View>
        </Card>

        {/* Quick Action Navigation Hub */}
        <View style={{ marginTop: 14, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.navy }}>Finance & Management Hub</Text>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => go('admin-transactions')}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <Card style={{ padding: 14, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Receipt size={18} color="#1D4ED8" />
                  <ChevronRight size={14} color="#1D4ED8" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF', marginTop: 8 }}>
                  Transactions Hub
                </Text>
                <Text style={{ fontSize: 10, color: '#3B82F6', marginTop: 2 }}>
                  Winner payments & fee logs
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => go('admin-settlement')}
              style={{ flex: 1 }}
              activeOpacity={0.8}
            >
              <Card style={{ padding: 14, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FileText size={18} color="#15803D" />
                  <ChevronRight size={14} color="#15803D" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534', marginTop: 8 }}>
                  Revenue & Settlement
                </Text>
                <Text style={{ fontSize: 10, color: '#22C55E', marginTop: 2 }}>
                  Proceeds split & escrow
                </Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {extended.length > 0 && (
          <Card style={{ borderColor: colors.orange + '44', backgroundColor: colors.secondary, marginTop: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} color={colors.orange} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.orange + 'CC' }}>{extended.length} Extended Auction(s)</Text>
            </View>
            {extended.map((a) => (
              <Text key={a.id} style={{ fontSize: 11, color: colors.orange, marginTop: 4 }}>
                {a.name} — extended due to low bids
              </Text>
            ))}
          </Card>
        )}

        {active.length > 0 && (
          <Card style={s2.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Radio size={14} color={colors.emerald600} />
                <Text style={s2.sectionTitle}>Monitor Live ({active.length})</Text>
              </View>
              <TouchableOpacity onPress={() => go('admin-monitor')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Monitor Live</Text>
                <ArrowUpRight size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {active.slice(0, 5).map((a) => (
              <TouchableOpacity key={a.id} onPress={() => go('admin-monitor')} activeOpacity={0.7}>
                <View style={s2.auctionRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s2.auctionName}>{a.name}</Text>
                      <Badge tone={a.status === 'ending-soon' ? 'orange' : 'green'}>{a.status === 'ending-soon' ? 'Ending' : 'Live'}</Badge>
                    </View>
                    <Text style={s2.auctionMeta}>
                      {a.totalBids || a.bidders} bids · {a.uniqueBidders} bidders
                      {a.maxBid ? ` · max ${a.maxBid}` : ''}
                    </Text>
                  </View>
                  <Eye size={14} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <Card style={s2.section}>
          <Text style={s2.sectionTitle}>All Auctions ({auctions.length})</Text>
          {auctions.slice(0, 10).map((a) => {
            const isExtended = a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000
            return (
              <View key={a.id} style={s2.auctionRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s2.auctionName}>{a.name}</Text>
                    {isExtended && <Badge tone="orange">Extended</Badge>}
                  </View>
                  <Text style={s2.auctionMeta}>
                    {a.totalBids || a.bidders} bids · {a.uniqueBidders} bidders
                    {a.maxBid ? ` · max ${a.maxBid}` : ''}
                    {a.minBid ? ` · min ${a.minBid}` : ''}
                  </Text>
                </View>
                <Badge tone={a.status === 'ending-soon' ? 'orange' : a.status === 'live' ? 'green' : 'muted'}>{a.status}</Badge>
              </View>
            )
          })}
          {auctions.length > 10 && (
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }}>
              +{auctions.length - 10} more auctions
            </Text>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1 }}><CTAButton variant="navy" onPress={() => go('admin-monitor')}>Monitor Live</CTAButton></View>
          <View style={{ flex: 1 }}><CTAButton variant="outline" onPress={() => go('admin-users')}>Manage Users</CTAButton></View>
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><CTAButton variant="primary" onPress={() => go('admin-auctions')}>+ New Auction</CTAButton></View>
          <View style={{ flex: 1 }}><CTAButton variant="outline" onPress={() => goBack()}>Back to App</CTAButton></View>
        </View>
      </ScrollView>
    </View>
  )
}

const s2 = StyleSheet.create({
  statCard: { width: '47%', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'], marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 },
  section: { marginTop: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  auctionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, backgroundColor: colors.secondary + '99', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  auctionName: { fontSize: 13, fontWeight: '600', color: colors.navy },
  auctionMeta: { fontSize: 10, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
})
