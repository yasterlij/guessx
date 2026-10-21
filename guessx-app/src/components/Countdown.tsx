import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { formatCountdown } from '../mockDataV0'
import { colors, fontSize, borderRadius } from '../theme'

export function useCountdown(initialSeconds: number, running = true) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  return seconds
}

export function Countdown({
  seconds,
  size = 'md',
  labels = true,
}: {
  seconds: number
  size?: 'sm' | 'md' | 'lg'
  labels?: boolean
}) {
  const { d, h, m, s: secStr } = formatCountdown(seconds)
  const parts = [
    { v: d, l: 'DAYS' },
    { v: h, l: 'HRS' },
    { v: m, l: 'MIN' },
    { v: secStr, l: 'SEC' },
  ]

  const boxH = size === 'lg' ? 48 : size === 'sm' ? 28 : 36
  const boxW = size === 'lg' ? 56 : size === 'sm' ? 32 : 44
  const fontSize_ = size === 'lg' ? 28 : size === 'sm' ? 14 : 20

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {parts.map((p, i) => (
        <View key={p.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={[s.box, { width: boxW, height: boxH, borderRadius: borderRadius.md }]}>
              <Text style={[s.boxText, { fontSize: fontSize_ }]}>{p.v}</Text>
            </View>
            {labels && <Text style={s.label}>{p.l}</Text>}
          </View>
          {i < parts.length - 1 && <Text style={s.colon}>:</Text>}
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  box: {
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    fontFamily: 'System',
    fontWeight: '700',
    color: colors.navyForeground,
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  colon: {
    marginTop: -12,
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy + '66',
  },
})
