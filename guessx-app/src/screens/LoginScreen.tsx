import React, { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Eye, EyeOff, Smartphone, Lock, AlertCircle, LogOut } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashLogo } from '../components/AuctionUI'
import { colors } from '../theme'

const SESSION_END_MESSAGES: Record<string, string> = {
  idle: 'Your session ended because you were inactive. Please sign in to continue.',
  absolute: 'Your session expired after 12 hours. Please sign in again.',
  'refresh-failed': 'Your session has expired. Please sign in again.',
  expired: 'Your session has expired. Please sign in again.',
}

export function LoginScreen() {
  const { login, go, authError, sessionEndReason } = useApp()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneRef = useRef<TextInput>(null)
  const pwRef = useRef<TextInput>(null)

  const validate = (): boolean => {
    const clean = phone.trim()
    if (!clean) { setLocalError('Please enter your phone number'); phoneRef.current?.focus(); return false }
    if (clean.length < 9) { setLocalError('Phone number must be at least 9 digits'); phoneRef.current?.focus(); return false }
    if (!password.trim()) { setLocalError('Please enter your password'); pwRef.current?.focus(); return false }
    return true
  }

  const handleLogin = async () => {
    setLocalError('')
    if (!validate()) return
    setLoading(true)
    const err = await login(phone.trim(), password.trim())
    setLoading(false)
    if (err) setLocalError(err)
  }

  const displayError = localError || authError

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.navy }}
      contentContainerStyle={[s.container, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.body}>
        <AwashLogo variant="light" size={48} />
        <Text style={s.title}>Welcome Back</Text>
        <Text style={s.subtitle}>Sign in to your Guess X account</Text>

        {displayError ? (
          <View style={s.errorBox}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text style={s.errorText}>{displayError}</Text>
          </View>
        ) : null}

        {sessionEndReason && SESSION_END_MESSAGES[sessionEndReason] ? (
          <View style={s.sessionBox}>
            <LogOut size={16} color={colors.primary} />
            <Text style={s.sessionText}>{SESSION_END_MESSAGES[sessionEndReason]}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <Text style={s.label}>Phone Number</Text>
          <View style={[s.inputRow, phone.trim() && phone.trim().length >= 9 && { borderColor: colors.emerald500 + '66' }]}>
            <Smartphone size={18} color={colors.white + '99'} />
            <TextInput
              ref={phoneRef}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setLocalError('') }}
              placeholder="091 XXX XXXX"
              placeholderTextColor={colors.white + '40'}
              style={s.input}
              keyboardType="phone-pad"
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <View style={[s.inputRow, password.length >= 6 && { borderColor: colors.emerald500 + '66' }]}>
            <Lock size={18} color={colors.white + '99'} />
            <TextInput
              ref={pwRef}
              value={password}
              onChangeText={(t) => { setPassword(t); setLocalError('') }}
              secureTextEntry={!showPw}
              placeholder="password"
              placeholderTextColor={colors.white + '40'}
              style={s.input}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPw((s) => !s)} style={{ padding: 4 }}>
              {showPw ? <EyeOff size={16} color={colors.white + '99'} /> : <Eye size={16} color={colors.white + '99'} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[s.loginBtn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size={18} color={colors.primaryForeground} />
          ) : (
            <Text style={s.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 4 }}>
          <Text style={s.footer}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => go('register')}>
            <Text style={s.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  body: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navyForeground, marginTop: 32 },
  subtitle: { fontSize: 14, fontWeight: '500', color: colors.navyForeground + '99', marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, borderRadius: 12, backgroundColor: colors.destructive + '26', padding: 12, width: '100%', maxWidth: 320 },
  errorText: { fontSize: 12, fontWeight: '600', color: colors.destructive, textAlign: 'center', flex: 1 },
  sessionBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, borderRadius: 12, backgroundColor: colors.primary + '1A', padding: 12, width: '100%', maxWidth: 320 },
  sessionText: { fontSize: 12, fontWeight: '600', color: colors.primary, textAlign: 'center', flex: 1 },
  form: { marginTop: 32, width: '100%', maxWidth: 320 },
  label: { fontSize: 12, fontWeight: '600', color: colors.navyForeground + 'B3', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.navyForeground + '4D', backgroundColor: colors.white + '1A', paddingHorizontal: 16, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.navyForeground },
  loginBtn: { marginTop: 32, width: '100%', maxWidth: 320, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  loginBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  footer: { fontSize: 12, fontWeight: '500', color: colors.navyForeground + '80' },
  footerLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
})
