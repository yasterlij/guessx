import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { Wallet, ArrowDown, CheckCircle2, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { api } from '../api'
import { AppBar, CTAButton, Card } from '../components/AuctionUI'
import { CURRENCY, formatCurrency, formatETB } from '../mockDataV0'
import { colors } from '../theme'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export function DepositScreen() {
  const { go, goBack, walletBalance, refreshWallet } = useApp()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numericAmount = parseFloat(amount || '0')
  const valid = numericAmount > 0
  const estimatedNewBalance = walletBalance + (valid ? numericAmount : 0)

  const handleDeposit = async () => {
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.wallet.deposit(numericAmount)
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => { setSuccess(false); go('home') }, 1800)
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : undefined) || 'Deposit failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBar title="Top Up Wallet" onBack={goBack} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}>
        {/* ── Balance Card ── */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
            <Wallet size={22} color={colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>Current Balance</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>{formatCurrency(walletBalance)}</Text>
          </View>
          <ArrowDown size={20} color={colors.emerald600} />
        </Card>

        {/* ── Amount Input ── */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.navy, marginTop: 24, marginBottom: 8 }}>Top Up Amount</Text>
        <View style={s.inputRow}>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1').slice(0, 8))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            style={s.amountInput}
          />
          <Text style={s.currency}>{CURRENCY}</Text>
        </View>

        {/* ── Quick Amount Chips ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {QUICK_AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAmount(String(a))}
              style={[s.quickBtn, numericAmount === a && s.quickBtnActive]}
            >
              <Text style={[s.quickBtnText, numericAmount === a && s.quickBtnTextActive]}>+{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Balance Preview ── */}
        {valid && (
          <Card style={s.previewCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.previewLabel}>Deposit Amount</Text>
              <Text style={s.previewValue}>+{formatCurrency(numericAmount)}</Text>
            </View>
            <View style={s.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} color={colors.emerald600} />
                <Text style={[s.previewLabel, { fontWeight: '700', color: colors.navy }]}>New Balance</Text>
              </View>
              <Text style={[s.previewValue, { fontSize: 16, color: colors.emerald600 }]}>{formatCurrency(estimatedNewBalance)}</Text>
            </View>
          </Card>
        )}

        <View style={s.securityBanner}>
          <ShieldCheck size={16} color={colors.primary} />
          <Text style={s.securityText}>Instant deposit credited to your Guess X bidding wallet.</Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.destructive, textAlign: 'center' }}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <Card style={{ alignItems: 'center', padding: 24, marginTop: 24, borderColor: colors.emerald500, backgroundColor: colors.emerald50 + '80' }}>
            <CheckCircle2 size={40} color={colors.emerald600} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.emerald700, marginTop: 12 }}>Deposit Successful!</Text>
            <Text style={{ fontSize: 12, color: colors.emerald600, marginTop: 4 }}>New balance: {formatCurrency(walletBalance)}</Text>
          </Card>
        ) : (
          <CTAButton disabled={!valid || loading} onPress={handleDeposit} style={{ marginTop: 24 }}>
            {loading ? <ActivityIndicator size={18} color="#fff" /> : `Deposit ${formatCurrency(numericAmount || 0)}`}
          </CTAButton>
        )}
      </ScrollView>
    </View>
  )
}


const s = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  amountInput: { width: 220, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 12, textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.navy },
  currency: { paddingBottom: 16, fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  quickBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.card },
  quickBtnActive: { borderColor: colors.primary, backgroundColor: colors.accent },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  quickBtnTextActive: { color: colors.primary, fontWeight: '800' },
  previewCard: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  previewLabel: { fontSize: 12, color: colors.mutedForeground },
  previewValue: { fontSize: 14, fontWeight: '700', color: colors.navy },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  securityBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 10, borderRadius: 10, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '25' },
  securityText: { fontSize: 11, fontWeight: '500', color: colors.navy, flex: 1 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: colors.destructive + '15' },
})
