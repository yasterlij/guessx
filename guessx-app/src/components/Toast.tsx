import React, { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native'
import { colors } from '../theme'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const DURATION = 8000

const typeStyles: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; bar: string }> = {
  success: {
    icon: <CheckCircle2 size={20} color={colors.emerald600} />,
    bg: colors.emerald50,
    border: colors.emerald200,
    bar: colors.emerald500,
  },
  error: {
    icon: <AlertCircle size={20} color={colors.destructive} />,
    bg: '#FEF2F2',
    border: '#FECACA',
    bar: '#EF4444',
  },
  warning: {
    icon: <AlertTriangle size={20} color={colors.warning} />,
    bg: '#FFFBEB',
    border: '#FDE68A',
    bar: '#F59E0B',
  },
  info: {
    icon: <Info size={20} color={colors.primary} />,
    bg: '#EFF6FF',
    border: '#BFDBFE',
    bar: '#3B82F6',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, DURATION)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={s.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current
  const progress = useRef(new Animated.Value(1)).current
  const ts = typeStyles[toast.type]

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(DURATION - 500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(progress, {
        toValue: 0,
        duration: DURATION - 100,
        useNativeDriver: false,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[s.toast, { backgroundColor: ts.bg, borderColor: ts.border, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
        <View style={{ marginTop: 1 }}>{ts.icon}</View>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.navy, lineHeight: 18 }}>{toast.message}</Text>
        <TouchableOpacity onPress={onDismiss} style={{ padding: 2, marginTop: -2 }}><X size={16} color={colors.mutedForeground} /></TouchableOpacity>
      </View>
      <Animated.View style={{ height: 3, backgroundColor: ts.bar, borderRadius: 2, marginTop: 8, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </Animated.View>
  )
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
})
