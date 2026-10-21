import { useCallback, useEffect, useState } from "react"
import { api } from "../api"

export function useUnreadNotifications({
  hydrated,
  userId,
}: {
  hydrated: boolean
  userId?: string | null
}) {
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const refreshUnreadNotifications = useCallback(async () => {
    if (!userId) {
      setUnreadNotificationCount(0)
      return
    }
    try {
      const items = await api.getInbox(true)
      setUnreadNotificationCount(items.length)
    } catch {
      setUnreadNotificationCount(0)
    }
  }, [userId])

  useEffect(() => {
    if (!hydrated) return
    if (!userId) {
      setUnreadNotificationCount(0)
      return
    }
    refreshUnreadNotifications()
  }, [hydrated, userId, refreshUnreadNotifications])

  useEffect(() => {
    if (!hydrated || !userId) return
    const interval = setInterval(refreshUnreadNotifications, 60000)
    return () => clearInterval(interval)
  }, [hydrated, userId, refreshUnreadNotifications])

  return {
    unreadNotificationCount,
    refreshUnreadNotifications,
  }
}