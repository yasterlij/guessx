import React from 'react'
import { View, Text, type ViewStyle } from 'react-native'
import { Inbox, SearchX, AlertCircle, ShoppingBag, type LucideIcon } from 'lucide-react-native'
import { CTAButton } from './AuctionUI'
import { colors } from '../theme'

const ICON_MAP: Record<string, LucideIcon> = {
  inbox: Inbox,
  'search-x': SearchX,
  alert: AlertCircle,
  bag: ShoppingBag,
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  icon?: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
}) {
  const Icon = ICON_MAP[icon] || Inbox

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32 }, style]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
        <Icon size={32} color={colors.mutedForeground} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 280 }}>{message}</Text>
      {actionLabel && onAction && (
        <View style={{ marginTop: 20 }}>
          <CTAButton onPress={onAction}>{actionLabel}</CTAButton>
        </View>
      )}
    </View>
  )
}
