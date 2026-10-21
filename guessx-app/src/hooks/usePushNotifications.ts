import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { api } from '../api'

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Guess X',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  }).catch(() => {})
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data

    const platform = Platform.OS as 'android' | 'ios'
    try {
      await api.auth.registerPushToken(token, platform)
    } catch {}

    return token
  } catch {
    return null
  }
}

export function useNotificationObserver() {
  const responseListener = useRef<any>(null)

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data
      if (data?.auction_id && data?.type === 'won') {
      }
    })

    return () => {
      if (responseListener.current?.remove) {
        responseListener.current.remove()
      }
    }
  }, [])
}
