import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import {
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  ShieldCheck,
  CreditCard,
  Building2,
  Calendar,
  ChevronRight,
  PackageCheck,
  RotateCcw,
} from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, Badge, Card } from '../components/AuctionUI'
import { formatCurrency } from '../mockDataV0'
import { colors } from '../theme'
import { api, type ApiSettlementReport } from '../api'

type DateRange = 'today' | 'week' | 'month' | 'quarter'

export function AdminSettlementScreen() {
  const { go, goBack } = useApp()
  const [range, setRange] = useState<DateRange>('month')
  const [report, setReport] = useState<ApiSettlementReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [displayCount, setDisplayCount] = useState(10)

  useEffect(() => {
    setDisplayCount(10)
  }, [range])

  const getDateBounds = useCallback(() => {
    const end = new Date()
    const start = new Date()
    if (range === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (range === 'week') {
      start.setDate(end.getDate() - 7)
    } else if (range === 'month') {
      start.setDate(end.getDate() - 30)
    } else if (range === 'quarter') {
      start.setDate(end.getDate() - 90)
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }, [range])

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const bounds = getDateBounds()
      const data = await api.adminGetSettlementReport(bounds.start, bounds.end)
      setReport(data)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getDateBounds])

  useEffect(() => {
    loadData()
  }, [loadData])

  const bounds = getDateBounds()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Revenue & Settlement" onBack={() => goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Compliance Notice */}
        <Card style={s.complianceBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#854D0E" />
            <Text style={s.complianceTitle}>Automated Revenue Sharing & Settlement</Text>
          </View>
          <Text style={s.complianceDesc}>
            Aligned with UNCITRAL Procurement Model Law Art. 37 and ICC §4.2 guidelines. Proceeds automatically calculated and escrow-verified.
          </Text>
        </Card>

        {/* Date Range Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: '7 Days' },
            { key: 'month', label: '30 Days' },
            { key: 'quarter', label: '90 Days' },
          ].map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key as DateRange)}
              style={[s.rangePill, range === r.key && s.rangePillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.rangePillText, range === r.key && s.rangePillTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.dateRangeSubtitle}>
          Settlement Period: {bounds.start} to {bounds.end}
        </Text>

        {loading && !report ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 10 }}>Loading settlement report...</Text>
          </View>
        ) : report ? (
          <View style={{ gap: 14 }}>
            {/* KPI Cards */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={s.metricLabel}>Winning Bid Total</Text>
                <Text style={s.metricValue}>{formatCurrency(report.winning_price_total)}</Text>
                <Text style={s.metricHint}>{report.auction_count} auctions settled</Text>
              </Card>
              <Card style={{ flex: 1, padding: 14 }}>
                <Text style={s.metricLabel}>Participation Fees</Text>
                <Text style={[s.metricValue, { color: '#854D0E' }]}>
                  {formatCurrency(report.participation_fee_revenue)}
                </Text>
                <Text style={s.metricHint}>100% platform revenue</Text>
              </Card>
            </View>

            {/* Revenue Distribution Split Grid */}
            <Card style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Building2 size={16} color={colors.primary} />
                <Text style={s.sectionTitle}>Automated Revenue Sharing Breakdown</Text>
              </View>

              <View style={s.splitRow}>
                <View>
                  <Text style={s.splitLabel}>Platform Share (10%)</Text>
                  <Text style={s.splitSub}>Direct winning bid cut</Text>
                </View>
                <Text style={s.splitVal}>{formatCurrency(report.platform_share)}</Text>
              </View>

              <View style={s.splitRow}>
                <View>
                  <Text style={s.splitLabel}>VAT Tax Withholding (15%)</Text>
                  <Text style={s.splitSub}>Statutory tax withheld</Text>
                </View>
                <Text style={s.splitVal}>{formatCurrency(report.tax)}</Text>
              </View>

              <View style={s.splitRow}>
                <View>
                  <Text style={s.splitLabel}>Platform Commission (5%)</Text>
                  <Text style={s.splitSub}>Operational processing</Text>
                </View>
                <Text style={s.splitVal}>{formatCurrency(report.commission)}</Text>
              </View>

              <View style={[s.splitRow, { borderBottomWidth: 0, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View>
                  <Text style={[s.splitLabel, { fontWeight: '800', color: colors.emerald700 }]}>
                    Net Seller Proceeds
                  </Text>
                  <Text style={s.splitSub}>Disbursed to item sellers</Text>
                </View>
                <Text style={[s.splitVal, { color: colors.emerald700, fontSize: 15 }]}>
                  {formatCurrency(report.details.reduce((sum, d) => sum + d.net_to_seller, 0))}
                </Text>
              </View>

              <View style={[s.splitRow, { borderBottomWidth: 0, backgroundColor: colors.secondary, padding: 10, borderRadius: 10 }]}>
                <View>
                  <Text style={[s.splitLabel, { fontWeight: '800', color: colors.navy }]}>
                    Platform Net Revenue
                  </Text>
                  <Text style={s.splitSub}>Share + fees - deductions</Text>
                </View>
                <Text style={[s.splitVal, { color: colors.primary, fontSize: 16 }]}>
                  {formatCurrency(report.net_revenue)}
                </Text>
              </View>
            </Card>

            {/* Escrow Status Summary */}
            {report.escrow_summary && (
              <Card style={{ padding: 14, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <PackageCheck size={16} color="#1D4ED8" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1D4ED8' }}>Escrow Holdings (UNCITRAL)</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Held in Escrow</Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#1E40AF' }}>
                      {formatCurrency(report.escrow_summary.total_held_in_escrow)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#1E40AF', fontWeight: '500' }}>Pending Delivery</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E40AF' }}>
                      {report.escrow_summary.pending_delivery_count} Auctions
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Multi-Gateway Reconciliation */}
            {report.gateway_breakdown && (
              <Card style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <CreditCard size={16} color={colors.navy} />
                  <Text style={s.sectionTitle}>Payment Gateway Reconciliation</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>Awash Wallet</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 4 }}>
                      {formatCurrency(report.gateway_breakdown.awash_volume)}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.mutedForeground, marginTop: 2 }}>
                      {report.gateway_breakdown.awash_count} txns
                    </Text>
                  </View>

                  <View style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, padding: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.navy }}>SikinaPay</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#854D0E', marginTop: 4 }}>
                      {formatCurrency(report.gateway_breakdown.sikinapay_volume)}
                    </Text>
                    <Text style={{ fontSize: 9.5, color: colors.mutedForeground, marginTop: 2 }}>
                      {report.gateway_breakdown.sikinapay_count} txns
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Itemized Auction Settlements */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.navy, marginTop: 6 }}>
                Settled Auctions ({report.details.length})
              </Text>
              {report.details.slice(0, displayCount).map((d) => (
                <Card key={d.auction_id} style={{ padding: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy }} numberOfLines={1}>
                        {d.product_name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                        ID: {d.auction_id.slice(0, 8)} · Winner Paid
                      </Text>
                    </View>
                    <Badge tone={d.payment_status === 'PAID' ? 'green' : 'orange'}>
                      {d.payment_status}
                    </Badge>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View>
                      <Text style={{ fontSize: 9.5, color: colors.mutedForeground }}>Winning Price</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.navy }}>
                        {formatCurrency(d.winning_amount)}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9.5, color: colors.mutedForeground }}>Platform Share</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                        {formatCurrency(d.platform_share)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9.5, color: colors.mutedForeground }}>Net to Seller</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.emerald700 }}>
                        {formatCurrency(d.net_to_seller)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}

              {report.details.length > displayCount && (
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
                    Load More Settled Auctions ({report.details.length - displayCount} remaining)
                  </Text>
                </TouchableOpacity>
              )}

              {report.details.length > 0 && (
                <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.secondary, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>
                    Showing {Math.min(displayCount, report.details.length)} of {report.details.length} settled auctions
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  complianceBanner: {
    padding: 12,
    backgroundColor: '#FEFCE8',
    borderColor: '#FDE047',
    borderWidth: 1,
  },
  complianceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
    textTransform: 'uppercase',
  },
  complianceDesc: {
    fontSize: 10.5,
    color: '#854D0E',
    marginTop: 4,
    lineHeight: 15,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangePillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  rangePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  rangePillTextActive: {
    color: '#FFF',
  },
  dateRangeSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  metricHint: {
    fontSize: 9.5,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  splitLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.navy,
  },
  splitSub: {
    fontSize: 9.5,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  splitVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.navy,
    fontVariant: ['tabular-nums'],
  },
})
