import { useCallback, useEffect, useRef, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { api, getUserFriendlyMessage } from "../api"

const LOCAL_WATCHED_DROPS_KEY = "guessx_watched_drops"
const LEGACY_WATCHED_DROPS_KEY = "takelow_watched_drops"

export function useFavoriteAuctions({
  hydrated,
  userId,
  onError,
}: {
  hydrated: boolean
  userId?: string | null
  onError?: (message: string) => void
}) {
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const [favoriteAuctionIds, setFavoriteAuctionIds] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const localDropsRef = useRef<string[]>([])

  const loadLocalDrops = useCallback(async () => {
    try {
      let raw = await AsyncStorage.getItem(LOCAL_WATCHED_DROPS_KEY)
      if (!raw) {
        raw = await AsyncStorage.getItem(LEGACY_WATCHED_DROPS_KEY)
        if (raw) await AsyncStorage.setItem(LOCAL_WATCHED_DROPS_KEY, raw)
      }
      const ids = raw ? JSON.parse(raw) : []
      localDropsRef.current = ids
      return ids
    } catch {
      return []
    }
  }, [])

  const saveLocalDrops = useCallback(async (ids: string[]) => {
    localDropsRef.current = ids
    try {
      await AsyncStorage.setItem(LOCAL_WATCHED_DROPS_KEY, JSON.stringify(ids))
    } catch {}
  }, [])

  const refreshFavorites = useCallback(async () => {
    const localDrops = await loadLocalDrops()
    if (!userId) {
      setFavoriteAuctionIds(localDrops)
      return
    }
    setFavoritesLoading(true)
    try {
      const res = await api.getFavorites()
      const serverIds = (res.data || []).map((item) => item.auction_id)
      const merged = Array.from(new Set([...serverIds, ...localDrops]))
      setFavoriteAuctionIds(merged)
    } catch {
      onErrorRef.current?.("Failed to refresh favorites")
      setFavoriteAuctionIds(localDrops)
    } finally {
      setFavoritesLoading(false)
    }
  }, [userId, loadLocalDrops])

  useEffect(() => {
    if (!hydrated) return
    refreshFavorites()
  }, [hydrated, userId, refreshFavorites])

  const isFavorite = useCallback(
    (auctionId: string) => favoriteAuctionIds.includes(auctionId),
    [favoriteAuctionIds]
  )

  const toggleFavorite = useCallback(
    async (auctionId: string) => {
      const isComingSoon = auctionId.startsWith("cs-")

      if (isComingSoon) {
        const localDrops = localDropsRef.current
        const currentlyWatched = localDrops.includes(auctionId)
        const updated = currentlyWatched
          ? localDrops.filter((id) => id !== auctionId)
          : [...localDrops, auctionId]
        await saveLocalDrops(updated)
        setFavoriteAuctionIds((prev) =>
          currentlyWatched ? prev.filter((id) => id !== auctionId) : [...prev, auctionId]
        )
        return
      }

      if (!userId) {
        onErrorRef.current?.("Please sign in to save auctions to your watchlist")
        return
      }

      const currentlyFavorite = favoriteAuctionIds.includes(auctionId)
      setFavoriteAuctionIds((prev) =>
        currentlyFavorite ? prev.filter((id) => id !== auctionId) : [...prev, auctionId]
      )

      try {
        if (currentlyFavorite) {
          await api.removeFavorite(auctionId)
        } else {
          await api.addFavorite(auctionId)
        }
      } catch (e: unknown) {
        setFavoriteAuctionIds((prev) =>
          currentlyFavorite ? [...prev, auctionId] : prev.filter((id) => id !== auctionId)
        )
        onErrorRef.current?.(getUserFriendlyMessage(e))
      }
    },
    [favoriteAuctionIds, userId, saveLocalDrops]
  )

  return {
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    isFavorite,
    toggleFavorite,
  }
}