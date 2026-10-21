import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AlertTriangle, RefreshCw } from 'lucide-react-native'
import { colors } from '../theme'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null; stackShown: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, stackShown: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, stackShown: false }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => this.setState({ hasError: false, error: null, stackShown: false })

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.iconWrap}>
            <AlertTriangle size={40} color={colors.primary} />
          </View>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.subtitle}>An unexpected error occurred. Please try again.</Text>
          <Text style={s.message}>{this.state.error instanceof Error ? this.state.error.message : undefined}</Text>
          <TouchableOpacity
            style={s.button}
            onPress={this.handleReset}
            activeOpacity={0.85}
          >
            <RefreshCw size={16} color={colors.primaryForeground} />
            <Text style={s.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => this.setState((s) => ({ stackShown: !s.stackShown }))}
            style={{ marginTop: 16 }}
          >
            <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
              {this.state.stackShown ? 'Hide details' : 'Show details'}
            </Text>
          </TouchableOpacity>
          {this.state.stackShown && this.state.error?.stack && (
            <Text style={s.stack}>
              {this.state.error.stack}
            </Text>
          )}
        </View>
      )
    }
    return this.props.children
  }
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  subtitle: { fontSize: 13, fontWeight: '500', color: colors.mutedForeground, textAlign: 'center', marginBottom: 16 },
  message: { fontSize: 12, color: colors.destructive, textAlign: 'center', marginBottom: 24, fontFamily: 'monospace' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { fontSize: 14, fontWeight: '700', color: colors.primaryForeground },
  stack: { marginTop: 16, padding: 12, backgroundColor: colors.secondary, borderRadius: 8, fontSize: 9, fontFamily: 'monospace', color: colors.mutedForeground, width: '100%' },
})
