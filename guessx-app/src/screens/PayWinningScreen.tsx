import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { ShieldCheck, Info, Lock, X, AlertTriangle, Wallet, Trophy } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AppBar, CTAButton, Card, AwashMark } from '../components/AuctionUI'
import { formatCurrency } from '../mockDataV0'
import { api } from '../api'
import { colors } from '../theme'

export function PayWinningScreen() {
  const { go, goBack, selectedId, userBid, payWinning, getAuction, authError, setPaymentMethod, walletBalance, refreshWallet } = useApp()
  const auction = getAuction(selectedId)

  const [selected] = useState<'AWASH'>('AWASH')

  useEffect(() => {
    refreshWallet()
  }, [refreshWallet])

  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [pinLocked, setPinLocked] = useState(false)
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null)

  const [needsPinSetup, setNeedsPinSetup] = useState(false)
  const [setupPin, setSetupPin] = useState('')
  const [setupConfirm, setSetupConfirm] = useState('')
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  const [checkingPin, setCheckingPin] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (showPinModal) {
      setPinInput('')
      setPinError(null)
    }
  }, [showPinModal])

  const [lockCountdown, setLockCountdown] = useState('')
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (!pinLocked || !pinLockedUntil) {
      setLockCountdown('')
      return
    }
    const update = () => {
      const ms = new Date(pinLockedUntil).getTime() - Date.now()
      if (ms <= 0) {
        setLockCountdown('')
        setPinLocked(false)
        setPinLockedUntil(null)
        setAttemptsRemaining(5)
        return
      }
      const totalSec = Math.ceil(ms / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      if (h > 0) {
        setLockCountdown(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`)
      } else {
        setLockCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`)
      }
    }
    update()
    tickRef.current = setInterval(update, 1000)
    return () => clearInterval(tickRef.current)
  }, [pinLocked, pinLockedUntil])

  if (!auction) return null

  const amount = auction.winning_bid_amount ?? userBid ?? 0
  const deadline = (auction as any).payment_deadline ? new Date((auction as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : 30 * 24
  const deadlineMins = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000)) : 30 * 24 * 60
  const deadlineDays = Math.floor(deadlineHrs / 24)
  const isSecondWinnerAssigned = Boolean((auction as any).second_winner_assigned)
  const isExpired = (deadlineHrs <= 0) || auction.payment_status === 'PAYMENT_DEFAULTED' || auction.payment_status === 'EXPIRED'
  const urgent = deadlineHrs < 24 && !isExpired

  const deadlineMessage = isExpired
    ? 'This auction is no longer eligible for payment. The payment deadline has expired.'
    : deadlineDays >= 30
      ? `Complete payment within ${Math.floor(deadlineDays / 30)} months (${deadlineDays} days) to claim your prize.`
      : deadlineDays >= 1
        ? `Complete payment within ${deadlineDays} days ${deadlineHrs % 24}h to claim your prize.`
        : `Complete payment within ${deadlineHrs}h ${deadlineMins % 60}m to claim your prize.`

  const handlePayPress = useCallback(async () => {
    setPaymentMethod('AWASH')
    setCheckingPin(true)
    try {
      const status = await api.wallet.pinStatus()
      setPinLocked(status.locked)
      setPinLockedUntil(status.lockedUntil)
      setAttemptsRemaining(status.locked ? 0 : status.attemptsRemaining)
      setNeedsPinSetup(!status.hasPin)
      setShowPinModal(true)
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || 'Failed to check wallet PIN status')
      setNeedsPinSetup(false)
      setPinLocked(false)
      setShowPinModal(true)
    } finally {
      setCheckingPin(false)
    }
  }, [amount, payWinning, selected, setPaymentMethod])

  const handleVerifyPin = useCallback(async () => {
    if (!pinInput) {
      setPinError('Please enter your wallet PIN')
      return
    }
    if (pinLocked) return
    setPinLoading(true)
    setPinError(null)
    try {
      const res = await api.wallet.verifyPin(pinInput)
      if (res.valid) {
        setShowPinModal(false)
        setLoading(true)
        try {
          await Promise.resolve(payWinning(amount, 'AWASH'))
        } finally {
          setLoading(false)
        }
      } else if (res.locked) {
        setPinLocked(true)
        setPinLockedUntil(res.lockedUntil)
        setAttemptsRemaining(0)
        setPinError(
          'Too many incorrect attempts. Your wallet PIN has been locked for 5 minutes.'
        )
      } else {
        setAttemptsRemaining(res.attemptsRemaining)
        if (res.attemptsRemaining <= 2) {
          setPinError(`Invalid PIN — ${res.attemptsRemaining} attempt${res.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout`)
        } else {
          setPinError('Invalid wallet PIN')
        }
      }
    } catch (err: unknown) {
      setPinError((err instanceof Error ? err.message : undefined) || 'Unable to verify PIN. Please try again.')
    } finally {
      setPinLoading(false)
    }
  }, [amount, payWinning, pinInput, pinLocked])

  const handleSetupPin = useCallback(async () => {
    if (!setupPin || setupPin.length < 4 || setupPin.length > 6 || !/^\d+$/.test(setupPin)) {
      setSetupError('PIN must be 4–6 digits')
      return
    }
    if (setupPin !== setupConfirm) {
      setSetupError('PINs do not match')
      return
    }
    setSetupLoading(true)
    setSetupError(null)
    try {
      await api.wallet.setPin(setupPin)
      setShowPinModal(false)
      setNeedsPinSetup(false)
      setLoading(true)
      try {
        await Promise.resolve(payWinning(amount, 'AWASH'))
      } finally {
        setLoading(false)
      }
    } catch (err: unknown) {
      setSetupError('Failed to set wallet PIN. Please try again.')
    } finally {
      setSetupLoading(false)
    }
  }, [amount, payWinning, setupPin, setupConfirm])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar
        title="Pay Winning Amount"
        onBack={goBack}
        right={
          <TouchableOpacity onPress={() => go('home')} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
            <AwashMark size={22} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.mutedForeground }}>
          {isSecondWinnerAssigned ? 'Pay your winning bid to claim your prize as the assigned winner.' : 'Pay the winning bid to claim your prize.'}
        </Text>

        {isSecondWinnerAssigned && (
          <Card style={{ padding: 14, backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '40', borderRadius: 14, gap: 6, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                Second Winner Assigned
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.navy, lineHeight: 18 }}>
              You have been awarded this auction because the original winner did not complete payment within the specified timeframe.
            </Text>
          </Card>
        )}

        <View style={[s.deadline, (isExpired || urgent) && { backgroundColor: colors.destructive + '22' }]}>
          <Info size={16} color={isExpired || urgent ? colors.destructive : colors.primary} />
          <Text style={[s.deadlineText, isExpired && { color: colors.destructive, fontWeight: '600' }]}>
            {deadlineMessage}
          </Text>
        </View>

        <Card style={{ alignItems: 'center', padding: 24, marginTop: 16, borderWidth: 1, borderColor: colors.primary + '1A', backgroundColor: colors.primary + '0D' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Trophy size={14} color={colors.primary} />
            <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.primary }}>
              {isSecondWinnerAssigned ? 'Second Winning Bid' : 'Primary Winning Bid'}
            </Text>
          </View>
          <Text style={s.amount}>{formatCurrency(amount)}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground, marginTop: 8 }}>for {auction.name}</Text>
        </Card>

        <Card style={{ padding: 16, marginTop: 16 }}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Winning amount</Text>
            <Text style={s.summaryValue}>{formatCurrency(amount)}</Text>
          </View>
          <View style={[s.summaryRow, { marginTop: 8 }]}>
            <Text style={s.summaryLabel}>Delivery</Text>
            <Text style={[s.summaryValue, { color: colors.emerald600 }]}>Free ✓</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={[s.summaryRow, { marginTop: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Total</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{formatCurrency(amount)}</Text>
          </View>
        </Card>

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 }}>Pay with</Text>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary + '66', padding: 16, marginTop: 4 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' }}>
            <AwashMark size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Awash Wallet</Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}><Wallet size={14} /> Balance: {formatCurrency(walletBalance)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, backgroundColor: colors.navy + '0D', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Lock size={12} color={colors.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>PIN required</Text>
          </View>
        </Card>

        <View style={s.infoBox}>
          <Info size={16} color={colors.navy + '99'} />
          <Text style={s.infoText}>Complete payment before the deadline to claim your prize. A payment receipt will be issued instantly.</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={16} color={colors.emerald600} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
            Secured by Awash Wallet
          </Text>
        </View>

        {authError && (
          <View style={{ borderRadius: 12, backgroundColor: colors.destructive + '22', padding: 12, marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' }}>{authError}</Text>
          </View>
        )}
      </ScrollView>

      <Card style={s.bottomCta}>
        {walletBalance < amount && (
          <View style={{ marginBottom: 10, gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center' }}>
              Insufficient balance: {formatCurrency(walletBalance)} (needs {formatCurrency(amount)})
            </Text>
            <TouchableOpacity
              onPress={() => go('deposit')}
              style={{
                borderRadius: 10,
                backgroundColor: colors.primary,
                paddingVertical: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 13 }}>
                + Top Up Wallet
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <CTAButton onPress={handlePayPress} disabled={isExpired || walletBalance < amount || checkingPin}>
          {isExpired ? 'Payment Deadline Expired' : loading || checkingPin ? 'Processing...' : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 14 }}>Proceed to Payment · {formatCurrency(amount)}</Text>
            </View>
          )}
        </CTAButton>
      </Card>

      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setShowPinModal(false)}>
            <View />
          </TouchableOpacity>
          <Card style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{needsPinSetup ? 'Set Wallet PIN' : 'Enter Wallet PIN'}</Text>
              <TouchableOpacity onPress={() => setShowPinModal(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {needsPinSetup ? (
              <>
                <Text style={s.modalDesc}>Create a 4–6 digit PIN to secure your wallet payments.</Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="New PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupPin}
                  onChangeText={setSetupPin}
                />
                <TextInput
                  style={s.pinInput}
                  placeholder="Confirm PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={setupConfirm}
                  onChangeText={setSetupConfirm}
                />
                {setupError && <Text style={s.pinError}>{setupError}</Text>}
                <CTAButton onPress={handleSetupPin} disabled={setupLoading}>
                  {setupLoading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : 'Set PIN & Pay'}
                </CTAButton>
              </>
            ) : pinLocked ? (
              <>
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <AlertTriangle size={40} color={colors.destructive} />
                  <Text style={s.modalTitle}>PIN Locked</Text>
                  <Text style={s.modalDesc}>
                    Too many incorrect attempts. Your wallet PIN has been locked for security. Try again in {lockCountdown || '05:00s'}.
                  </Text>
                </View>
                <CTAButton variant="outline" onPress={() => setShowPinModal(false)}>
                  Close
                </CTAButton>
              </>
            ) : (
              <>
                <Text style={s.modalDesc}>Enter your wallet PIN to confirm payment of {formatCurrency(amount)}.</Text>
                <TextInput
                  style={s.pinInput}
                  placeholder="Enter PIN"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  value={pinInput}
                  onChangeText={setPinInput}
                  autoFocus
                />
                {pinError && <Text style={s.pinError}>{pinError}</Text>}
                {attemptsRemaining != null && attemptsRemaining <= 3 && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.warning }}>
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                    </Text>
                  </View>
                )}
                <CTAButton onPress={handleVerifyPin} disabled={pinLoading || !pinInput.trim()}>
                  {pinLoading ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : 'Confirm Payment'}
                </CTAButton>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.accent, padding: 12, marginTop: 16 },
  deadlineText: { fontSize: 13, fontWeight: '600', color: colors.navy + 'CC', flex: 1 },
  amount: { fontSize: 36, fontWeight: '800', color: colors.navy, marginTop: 8, fontVariant: ['tabular-nums'] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: colors.mutedForeground },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.navy },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginTop: 12 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
  methodSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, marginTop: 12 },
  methodSelectorTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  methodSelectorSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  methodsList: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 8, marginTop: 8 },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, padding: 12 },
  methodOptionSelected: { backgroundColor: colors.primary + '1A' },
  methodOptionTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  methodOptionSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, backgroundColor: colors.navy + '0D', padding: 12, marginTop: 16 },
  infoText: { fontSize: 12, fontWeight: '500', lineHeight: 18, color: colors.navy + 'B3', flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  modalDesc: { fontSize: 13, fontWeight: '500', color: colors.mutedForeground, lineHeight: 20 },
  pinInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.input, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', color: colors.navy, backgroundColor: colors.muted, textAlign: 'center', letterSpacing: 8 },
  pinError: { fontSize: 13, fontWeight: '600', color: colors.destructive, textAlign: 'center' },
})
