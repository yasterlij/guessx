import React, { useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Linking, Modal, Pressable } from 'react-native'
import { Package, CheckCircle2, Circle, Bike, Home, MapPin, Phone, ImageIcon, FileText, X, Copy, Check, ShieldCheck } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { useToast } from '../components/Toast'
import { CURRENCY, formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'

export function DeliveryScreen() {
  const { go, goBack, selectedId, userBid, reset, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [showReceipt, setShowReceipt] = useState(false)
  const [copiedReceipt, setCopiedReceipt] = useState(false)
  const toast = useToast()

  if (!auction) return null

  const steps = [
    { label: 'Order Confirmed', time: 'Just now', done: true, icon: CheckCircle2 },
    { label: 'Packed & Ready', time: 'Processed', done: true, icon: Package },
    { label: 'Out for Delivery', time: 'In progress', done: false, icon: Bike, active: true },
    { label: 'Delivered', time: 'Estimated 4:30 PM', done: false, icon: Home },
  ]

  const orderPrefix = auction.id.slice(0, 6).toUpperCase()
  const orderNumber = `TK-DEL-${orderPrefix}`
  const winningAmount = auction.winning_bid_amount ?? userBid ?? 0

  const handleCallCourier = () => {
    Linking.openURL('tel:+251911000000').catch(() => {
      toast.show('Courier phone: +251 911 000 000', 'info')
    })
  }

  const handleCopyReceipt = () => {
    setCopiedReceipt(true)
    toast.show(`Order receipt ${orderNumber} copied!`, 'success')
    setTimeout(() => setCopiedReceipt(false), 2000)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Track Delivery" onBack={goBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, borderColor: colors.primary + '4D', backgroundColor: colors.accent, padding: 16 }}>
          <View style={s.courierIcon}>
            <Bike size={28} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>On its way!</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navy + 'B3', marginTop: 2 }}>Arriving today · Estimated 4:30 PM</Text>
          </View>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 12 }}>
          <View style={s.productImgWrap}>
            {auction.images?.[0] ? <Image source={{ uri: auction.images[0] }} style={{ width: 64, height: 64 }} resizeMode="cover" /> : <ImageIcon size={24} color="#94a3b8" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>{auction.name}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 }}>Order #{orderNumber}</Text>
          </View>
        </Card>

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginBottom: 16 }}>Delivery Progress</Text>
          {steps.map((step, i) => {
            const Icon = step.icon
            const isDone = step.done
            const isActive = 'active' in step && step.active
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', width: 32 }}>
                  <View style={[s.stageIcon, isDone && s.stageIconDone, isActive && s.stageIconActive]}>
                    {isDone ? <CheckCircle2 size={16} color={colors.white} /> : <Circle size={16} color={isActive ? colors.navyForeground : colors.mutedForeground} />}
                  </View>
                  {isActive && <View style={s.stageActiveRing} />}
                  {i < steps.length - 1 && <View style={[s.stageLine, isDone && s.stageLineDone]} />}
                </View>
                <View style={{ marginLeft: 12, marginBottom: i < steps.length - 1 ? 24 : 0 }}>
                  <Text style={[s.stageLabel, (isDone || isActive) && s.stageLabelActive]}>{step.label}</Text>
                  <Text style={s.stageTime}>{step.time}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <Card style={{ padding: 16, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MapPin size={18} color={colors.navy} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Delivery Address</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground, marginTop: 4 }}>
                Bole Sub-city, Woreda 03, Addis Ababa
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.mutedForeground + '99', marginTop: 4 }}>
                Leave at gate if not home
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
            <TouchableOpacity onPress={handleCallCourier} style={s.actionBtn} activeOpacity={0.8}>
              <Phone size={16} color={colors.primary} />
              <Text style={s.actionText}>Call Courier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowReceipt(true)} style={s.actionBtn} activeOpacity={0.8}>
              <FileText size={16} color={colors.navy} />
              <Text style={[s.actionText, { color: colors.navy }]}>View Receipt</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      <View style={s.bottomCta}>
        <CTAButton variant="navy" onPress={() => goBack()}>
          <Home size={18} /> Back to Home
        </CTAButton>
      </View>

      {/* ── Receipt Modal ── */}
      <Modal visible={showReceipt} transparent animationType="fade" onRequestClose={() => setShowReceipt(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setShowReceipt(false)}>
          <View />
        </Pressable>
        <View style={s.receiptCard}>
          <View style={s.receiptHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color={colors.primary} />
              <Text style={s.receiptTitle}>Official Prize Receipt</Text>
            </View>
            <TouchableOpacity onPress={() => setShowReceipt(false)}>
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Order Number</Text>
            <TouchableOpacity onPress={handleCopyReceipt} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.receiptVal, { fontFamily: 'monospace' }]}>{orderNumber}</Text>
              {copiedReceipt ? <Check size={12} color={colors.emerald600} /> : <Copy size={12} color={colors.mutedForeground} />}
            </TouchableOpacity>
          </View>

          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Product Won</Text>
            <Text style={s.receiptVal}>{auction.name}</Text>
          </View>

          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Winning Bid Paid</Text>
            <Text style={[s.receiptVal, { color: colors.primary, fontWeight: '800' }]}>{formatCurrency(winningAmount)}</Text>
          </View>

          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Market Value</Text>
            <Text style={s.receiptVal}>{formatCurrency(auction.marketPrice)}</Text>
          </View>

          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Delivery Status</Text>
            <Text style={[s.receiptVal, { color: colors.emerald600 }]}>Out for Delivery ✓</Text>
          </View>

          <TouchableOpacity onPress={() => setShowReceipt(false)} style={s.closeReceiptBtn} activeOpacity={0.85}>
            <Text style={s.closeReceiptText}>Close Receipt</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}


const s = StyleSheet.create({
  courierIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  productImgWrap: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.secondary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', shadowColor: colors.awashBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  stageIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  stageIconDone: { backgroundColor: colors.primary },
  stageIconActive: { backgroundColor: colors.navy },
  stageActiveRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 4, borderColor: colors.navy + '26' },
  stageLine: { width: 2, height: 36, backgroundColor: colors.border, marginTop: 4 },
  stageLineDone: { backgroundColor: colors.primary },
  stageLabel: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
  stageLabelActive: { color: colors.navy },
  stageTime: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 2 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.card },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  bottomCta: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, padding: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  receiptCard: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 },
  receiptTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  receiptLabel: { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  receiptVal: { fontSize: 13, fontWeight: '700', color: colors.navy },
  closeReceiptBtn: { marginTop: 16, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeReceiptText: { color: colors.navyForeground, fontSize: 13, fontWeight: '700' },
})
