import React, { useEffect, useRef, createContext, useContext } from 'react'
import { View, Animated, type ViewStyle } from 'react-native'
import { colors } from '../theme'

const ShimmerContext = createContext<Animated.Value | null>(null)

export function ShimmerProvider({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <ShimmerContext.Provider value={anim}>
      {children}
    </ShimmerContext.Provider>
  )
}

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const anim = useContext(ShimmerContext)
  if (!anim) return <View style={[{ backgroundColor: colors.border, borderRadius: 6 }, style]} />

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.border,
          borderRadius: 6,
          opacity,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard({ style, imageHeight = 140 }: { style?: ViewStyle; imageHeight?: number }) {
  return (
    <View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <ShimmerBlock style={{ width: '100%', height: imageHeight, borderRadius: 0 }} />
      <View style={{ padding: 12, gap: 8 }}>
        <ShimmerBlock style={{ width: '70%', height: 14 }} />
        <ShimmerBlock style={{ width: '40%', height: 12 }} />
        <ShimmerBlock style={{ width: '50%', height: 12 }} />
      </View>
    </View>
  )
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <ShimmerBlock style={{ width: 44, height: 44, borderRadius: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBlock style={{ width: '60%', height: 12 }} />
        <ShimmerBlock style={{ width: '35%', height: 10 }} />
      </View>
      <ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
    </View>
  )
}

export function SkeletonStatGrid({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 12 }, style]}>
      {[1, 2].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            padding: 16,
            gap: 8,
          }}
        >
          <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 6 }} />
          <ShimmerBlock style={{ width: '60%', height: 20 }} />
          <ShimmerBlock style={{ width: '80%', height: 12 }} />
        </View>
      ))}
    </View>
  )
}

export function SkeletonBanner() {
  return (
    <View
      style={{
        borderRadius: 12,
        backgroundColor: colors.border + '44',
        padding: 16,
        gap: 8,
      }}
    >
      <ShimmerBlock style={{ width: '50%', height: 14 }} />
      <ShimmerBlock style={{ width: '80%', height: 12 }} />
    </View>
  )
}
