import React, { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Eye, EyeOff, Smartphone, Lock, User, AlertCircle } from 'lucide-react-native'
import { useApp } from '../AppContext'
import { AwashLogo } from '../components/AuctionUI'
import { colors } from '../theme'

export function RegisterScreen() {
  const { register, go, authError } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<TextInput>(null)
  const phoneRef = useRef<TextInput>(null)
  const pwRef = useRef<TextInput>(null)

  const validate = (): boolean => {
    if (!name.trim()) { setLocalError('Please enter your full name'); nameRef.current?.focus(); return false }
    if (!phone.trim()) { setLocalError('Please enter your phone number'); phoneRef.current?.focus(); return false }
    if (phone.trim().length < 9) { setLocalError('Phone number must be at least 9 digits'); phoneRef.current?.focus(); return false }
    if (!password.trim()) { setLocalError('Please enter a password'); pwRef.current?.focus(); return false }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters'); pwRef.current?.focus(); return false }
    return true
  }

  const handleRegister = async () => {
    setLocalError('')
    if (!validate()) return
    setLoading(true)
    const err = await register(name.trim(), phone.trim(), password.trim())
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
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join Guess X auctions</Text>

        {displayError ? (
          <View style={s.errorBox}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text style={s.errorText}>{displayError}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <Text style={s.label}>Full Name</Text>
          <View style={[s.inputRow, name.trim().length >= 2 && { borderColor: colors.emerald500 + '66' }]}>
            <User size={18} color={colors.white + '99'} />
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={(t) => { setName(t); setLocalError('') }}
              placeholder="Selam Tesfaye"
              placeholderTextColor={colors.white + '40'}
              style={s.input}
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <Text style={[s.label, { marginTop: 16 }]}>Phone Number</Text>
          <View style={[s.inputRow, phone.trim().length >= 9 && { borderColor: colors.emerald500 + '66' }]}>
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
              placeholder="min 8 characters"
              placeholderTextColor={colors.white + '40'}
              style={s.input}
              returnKeyType="go"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity onPress={() => setShowPw((s) => !s)} style={{ padding: 4 }}>
              {showPw ? <EyeOff size={16} color={colors.white + '99'} /> : <Eye size={16} color={colors.white + '99'} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[s.registerBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size={18} color={colors.primaryForeground} />
          ) : (
            <Text style={s.registerBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 4 }}>
          <Text style={s.footer}>Already have an account?</Text>
          <TouchableOpacity onPress={() => go('login')}>
            <Text style={s.footerLink}>Sign In</Text>
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
  form: { marginTop: 32, width: '100%', maxWidth: 320 },
  label: { fontSize: 12, fontWeight: '600', color: colors.navyForeground + 'B3', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.navyForeground + '4D', backgroundColor: colors.white + '1A', paddingHorizontal: 16, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.navyForeground },
  registerBtn: { marginTop: 32, width: '100%', maxWidth: 320, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  registerBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  footer: { fontSize: 12, fontWeight: '500', color: colors.navyForeground + '80' },
  footerLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
})
