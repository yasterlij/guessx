import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { WifiOff } from 'lucide-react-native'
import { colors } from '../theme'

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const slideAnim = useState(new Animated.Value(-50))[0]

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false
      setIsOffline(offline)
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })

    return () => unsubscribe()
  }, [slideAnim])

  if (!isOffline) return null

  return (
    <Animated.View style={[s.banner, { transform: [{ translateY: slideAnim }] }]}>
      <WifiOff size={16} color="#FFF" />
      <Text style={s.text}>No internet connection. Waiting for network...</Text>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.destructive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
})
