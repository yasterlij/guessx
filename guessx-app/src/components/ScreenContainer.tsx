import React from 'react'
import { View, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, type ViewStyle, type ScrollViewProps } from 'react-native'
import { colors } from '../theme'

const NAV_BAR_HEIGHT = 50

export function ScreenContainer({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  style,
  contentStyle,
  scrollProps,
}: {
  children: React.ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  style?: ViewStyle
  contentStyle?: ViewStyle
  scrollProps?: Partial<ScrollViewProps>
}) {
  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[{ flex: 1 }, style]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  )

  if (!scroll) return content

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingBottom: 32 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressViewOffset={16}
          />
        ) : undefined
      }
      {...scrollProps}
    >
      {content}
    </ScrollView>
  )
}
