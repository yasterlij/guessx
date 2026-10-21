export type { SocketUpdatePayload } from "@guessx/api";
import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import type { Auction } from "../mockDataV0"
import { getApiToken } from "../api"
import { AuctionSocketEvents, AUCTION_SOCKET_NAMESPACE, type SocketUpdatePayload } from "@guessx/api"

function getSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_ENGINE_API_BASE_URL as string | undefined
  if (explicit) {
    return explicit.replace(/\/api\/v1\/?$/, "")
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3002`
    }
    return window.location.origin
  }

  return "http://localhost:3002"
}

export function useAuctionSocket(
  selectedId: string | null,
  onUpdate: (payload: SocketUpdatePayload) => void,
) {
  const socketRef = useRef<Socket | null>(null)
  const subscribedRef = useRef<string | null>(null)
  const selectedIdRef = useRef<string | null>(selectedId)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  selectedIdRef.current = selectedId

  const syncSubscription = (socket: Socket, nextSelectedId: string | null) => {
    if (subscribedRef.current && subscribedRef.current !== nextSelectedId) {
      socket.emit(AuctionSocketEvents.unsubscribe, subscribedRef.current)
    }

    if (nextSelectedId) {
      socket.emit(AuctionSocketEvents.subscribe, nextSelectedId)
      subscribedRef.current = nextSelectedId
    } else {
      subscribedRef.current = null
    }
  }

  useEffect(() => {
    const token = getApiToken()
    if (!token) return

    const baseUrl = getSocketBaseUrl()

    const socket = io(`${baseUrl}${AUCTION_SOCKET_NAMESPACE}`, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on(AuctionSocketEvents.update, (payload: SocketUpdatePayload) => {
      onUpdateRef.current(payload)
    })

    socket.on("connect_error", (error) => {
      const message = (error instanceof Error ? error.message : undefined) || ""
      if (/auth|jwt|token|unauthorized|forbidden/i.test(message)) {
        socket.io.opts.reconnection = false
        window.dispatchEvent(new CustomEvent("session-expired"))
      }
    })

    socket.on("connect", () => {
      syncSubscription(socket, selectedIdRef.current)
    })

    if (socket.connected) {
      syncSubscription(socket, selectedIdRef.current)
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
      subscribedRef.current = null
    }
  }, [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return

    if (subscribedRef.current !== selectedId) {
      syncSubscription(socket, selectedId)
    }
  }, [selectedId])
}

export function applySocketUpdate(
  auctions: Auction[],
  payload: SocketUpdatePayload,
): Auction[] {
  return auctions.map((a) =>
    a.id === payload.auction_id
      ? { ...a, bidders: payload.total_bids, totalBids: payload.total_bids }
      : a,
  )
}
