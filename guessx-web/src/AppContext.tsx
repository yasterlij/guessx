import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import type { ReactNode } from "react";
import {
  api,
  setApiToken,
  setRefreshToken,
  getApiToken,
  getRefreshToken,
  getUserFriendlyMessage,
  getAccessTokenExpiry,
  type SessionExpireReason,
  type ApiAuction,
} from "./api";
import { toast } from "./store/toast.store";
import { useAuctionSocket, applySocketUpdate } from "./hooks/useAuctionSocket";
import { useFavoriteAuctions } from "./hooks/useFavoriteAuctions";
import { useUnreadNotifications } from "./hooks/useUnreadNotifications";
import { useAuthSession } from "./hooks/useAuthSession";
import { useWalletBalance } from "./hooks/useWalletBalance";
import { useAuctionStore, mapAuction } from "./hooks/useAuctionStore";
import { normalizeAuctionCategory } from "./lib/auctionCategories";
import type { Auction, ProductSpecs } from "./mockDataV0";
import { formatSpecSummary } from "./mockDataV0";

export type View =
  | "login"
  | "register"
  | "home"
  | "auctions"
  | "my-bids"
  | "product"
  | "pay-fee"
  | "place-bid"
  | "bid-confirmed"
  | "monitor"
  | "closed"
  | "winner"
  | "pay-winning"
  | "payment-confirmed"
  | "delivery"
  | "admin-dashboard"
  | "admin-auctions"
  | "admin-products"
  | "admin-users"
  | "admin-transactions"
  | "admin-audit"
  | "admin-monitor"
  | "admin-auction-monitor"
  | "admin-settlement"
  | "admin-analytics"
  | "admin-disputes"
  | "admin-winners"
  | "admin-rbac"
  | "deposit"
  | "wallet"
  | "payment-success"
  | "payment-failed"
  | "closed-auctions"
  | "profile"
  | "notifications"
  | "favorites";

export type UserRole = "admin" | "user";

export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
};

export type PlacedBid = {
  auctionId: string;
  amount: number;
  placedAt: number;
  userId?: string;
  userName?: string;
  ticketNumber?: string;
};

type AppState = {
  view: View;
  selectedId: string | null;
  userBid: number | null;
  pendingBidAmount: number | null;
  bidTicketNumber: string | null;
  feePaid: boolean;
  walletBalance: number;
  paymentMethod: "AWASH" | "WALLET";
  lastPaymentMethod: "AWASH" | "WALLET" | null;
  paymentContext: "bid-fee" | "winning" | null;
  setPaymentContext: (ctx: "bid-fee" | "winning" | null) => void;
  favoriteAuctionIds: string[];
  favoritesLoading: boolean;
  unreadNotificationCount: number;
  myBids: PlacedBid[];
  user: User | null;
  allBids: PlacedBid[];
  auctions: Auction[];
  auctionsLoading: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectCategory: (cat: string) => void;
  authError: string | null;
  sessionEndReason: SessionExpireReason | null;
  go: (view: View) => void;
  goBack: () => void;
  selectAuction: (id: string) => void;
  selectAuctionForMonitor: (id: string) => void;
  setSelectedIdOnly: (id: string) => void;
  setFeePaid: (paid: boolean) => void;
  setPendingBidAmount: (amount: number | null) => void;
  payFee: (fee: number, paymentMethod?: "AWASH") => Promise<void>;
  submitBid: (amount: number) => Promise<void>;
  payWinning: (
    amount: number,
    paymentMethod?: "AWASH" | "WALLET",
    customerPhone?: string,
  ) => Promise<void>;
  setPaymentMethod: (method: "AWASH" | "WALLET") => void;
  checkPaymentStatus: () => Promise<boolean>;
  reset: () => void;
  login: (phone: string, password: string) => Promise<boolean>;
  register: (phone: string, password: string, name: string) => Promise<boolean>;
  logout: (reason?: SessionExpireReason) => void;
  addAuction: (a: {
    name: string;
    category: string;
    marketPrice: number;
    bidFee: number;
    description: string;
    highlights: string[];
    specs?: ProductSpecs;
    startTime: string;
    endTime: string;
    images?: string[];
    minBid?: number;
    maxBid?: number;
    paymentDeadlineHours?: number;
    escalationRule?: string;
  }) => Promise<void>;
  updateAuction: (
    id: string,
    data: Partial<
      Pick<
        Auction,
        | "name"
        | "category"
        | "marketPrice"
        | "description"
        | "highlights"
        | "images"
        | "specs"
      >
    > & {
      startTime?: string;
      endTime?: string;
      minBid?: number;
      maxBid?: number;
      bidFee?: number;
    },
  ) => Promise<void>;
  deleteAuction: (id: string) => Promise<void>;
  closeAuction: (id: string) => Promise<void>;
  forceCloseAuction: (id: string) => Promise<void>;
  reopenAuction: (id: string, data: any) => Promise<void>;
  bulkReopenAuctions: (
    ids: string[],
    options?: {
      startTime?: string;
      endTime?: string;
      bidFee?: number;
      durationDays?: number;
    },
  ) => Promise<{ total: number; reopened: number }>;
  refreshAuctions: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  refreshUnreadNotifications: () => Promise<void>;
  toggleFavorite: (auctionId: string) => Promise<void>;
  isFavorite: (auctionId: string) => boolean;
  fetchAuctionById: (id: string) => Promise<Auction | undefined>;
  getAuction: (id: string | null | undefined) => Auction | undefined;
};

declare global {
  interface Window {
    __guessXAppContext?: ReturnType<typeof createContext<AppState | null>>;
  }
}

const AppContext =
  window.__guessXAppContext || createContext<AppState | null>(null);
window.__guessXAppContext = AppContext;

const INITIAL_BALANCE = 0;
const STORAGE_KEY = "guessx_data";
const LEGACY_STORAGE_KEY = "takelow_data";
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const IDLE_WARNING_MS = 60 * 1000;


const POLL_INTERVAL = 30000;
const LIVE_VIEWS: View[] = [
  "home",
  "auctions",
  "product",
  "monitor",
  "my-bids",
  "wallet",
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("login");
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);
  const [bidTicketNumber, setBidTicketNumber] = useState<string | null>(null);
  const [feePaid, setFeePaid] = useState(false);
  const [paymentMethod, setPaymentMethodState] = useState<
    "AWASH" | "WALLET"
  >("AWASH");
  const [lastPaymentMethod, setLastPaymentMethod] = useState<
    "AWASH" | "WALLET" | null
  >(null);
  const [paymentContext, setPaymentContextState] = useState<
    "bid-fee" | "winning" | null
  >(null);
  const setPaymentContext = useCallback(
    (ctx: "bid-fee" | "winning" | null) => setPaymentContextState(ctx),
    [],
  );
  const [myBids, setMyBids] = useState<PlacedBid[]>([]);
  const [allBids, setAllBids] = useState<PlacedBid[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [hydrated, setHydrated] = useState(false);
  const logoutRef = useRef<(reason?: SessionExpireReason) => void>(() => {});
  const sessionChannelRef = useRef<BroadcastChannel | null>(null);
  const idleWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    user, setUser,
    authError, setAuthError,
    sessionEndReason, setSessionEndReason,
    sessionStartedAtRef,
    login: authLogin, register: authRegister, logout: authLogout, restoreSession,
  } = useAuthSession();

  const { walletBalance, setWalletBalance, refreshWallet } = useWalletBalance({
    onError: (msg) => toast(msg, "error"),
  });

  const {
    auctions, setAuctions,
    auctionsLoading,
    refreshAuctions,
    fetchAuctionById,
    getAuction,
    upsertAuction,
  } = useAuctionStore({ onError: (msg) => toast(msg, "error") });

  useAuctionSocket(selectedId, (payload) => {
    setAuctions((prev) => applySocketUpdate(prev, payload));
  });

  const {
    favoriteAuctionIds,
    favoritesLoading,
    refreshFavorites,
    isFavorite,
    toggleFavorite,
  } = useFavoriteAuctions({
    hydrated,
    userId: user?.id,
    onError: (message) => toast(message, "error"),
  });
  const { unreadNotificationCount, refreshUnreadNotifications } =
    useUnreadNotifications({ hydrated, userId: user?.id });

  useEffect(() => {
    const hydrate = async () => {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) localStorage.setItem(STORAGE_KEY, raw);
      }
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (!saved || typeof saved !== "object") return;
          if (typeof saved.sessionStartedAt === "number")
            sessionStartedAtRef.current = saved.sessionStartedAt;
          if (Array.isArray(saved.auctions) && saved.auctions.length) {
            const valid = saved.auctions.filter(
              (a: unknown) => a && typeof a === "object" && typeof (a as Auction).id === "string",
            ) as Auction[];
            const unique = Array.from(
              new Map<string, Auction>(
                valid.map((a) => [
                  a.id,
                  {
                    ...a,
                    category: normalizeAuctionCategory(a.category, a.name),
                  },
                ]),
              ).values(),
            );
            setAuctions(unique);
          }
          if (typeof saved.pendingBidAmount === "number")
            setPendingBidAmount(saved.pendingBidAmount);
          if (Array.isArray(saved.allBids) && saved.allBids.length) setAllBids(saved.allBids);
          if (Array.isArray(saved.myBids) && saved.myBids.length) setMyBids(saved.myBids);
          if (typeof saved.walletBalance === "number")
            setWalletBalance(saved.walletBalance);
          if (
            typeof saved.accessToken === "string" &&
            typeof saved.refreshToken === "string" &&
            saved.user && typeof saved.user === "object" &&
            typeof (saved.user as User).id === "string"
          ) {
            const ok = await restoreSession(
              saved.user as User,
              saved.accessToken,
              saved.refreshToken,
            );
            if (ok) resetTo("home");
          }
        } catch {
          // corrupt data — start fresh
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const tokens = user
      ? { accessToken: getApiToken(), refreshToken: getRefreshToken() }
      : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        auctions,
        allBids,
        myBids,
        walletBalance,
        pendingBidAmount,
        user,
        sessionStartedAt: sessionStartedAtRef.current,
        ...tokens,
      }),
    );
  }, [
    auctions,
    allBids,
    myBids,
    walletBalance,
    pendingBidAmount,
    user,
    hydrated,
  ]);

  useEffect(() => {
    const onSessionExpired = (e: Event) => {
      const reason =
        (e as CustomEvent<{ reason?: SessionExpireReason }>).detail?.reason ??
        "expired";
      logoutRef.current(reason);
    };
    window.addEventListener("session-expired", onSessionExpired);
    return () =>
      window.removeEventListener("session-expired", onSessionExpired);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("guessx-session");
    sessionChannelRef.current = channel;
    channel.onmessage = (ev: MessageEvent) => {
      if (ev.data?.type === "session-expired" && ev.data?.reason) {
        logoutRef.current(ev.data.reason);
      }
    };
    return () => {
      sessionChannelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const resetIdleTimer = () => {
      if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (IDLE_TIMEOUT_MS > IDLE_WARNING_MS) {
        idleWarnTimerRef.current = setTimeout(() => {
          toast(
            "You will be signed out in 1 minute due to inactivity",
            "warning",
          );
        }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);
      }
      idleTimerRef.current = setTimeout(
        () => logoutRef.current("idle"),
        IDLE_TIMEOUT_MS,
      );
    };
    resetIdleTimer();
    const events = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "mousemove",
    ];
    const onActivity = () => resetIdleTimer();
    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    );
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
      if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleWarnTimerRef.current = null;
      idleTimerRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    const checkAbsoluteTimeout = () => {
      const started = sessionStartedAtRef.current;
      if (started != null && Date.now() - started > ABSOLUTE_TIMEOUT_MS) {
        logoutRef.current("absolute");
      }
    };
    checkAbsoluteTimeout();
    const interval = setInterval(checkAbsoluteTimeout, 60_000);
    return () => clearInterval(interval);
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    refreshAuctions();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (!LIVE_VIEWS.includes(view)) return;
    const interval = setInterval(refreshAuctions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hydrated, user, view]);

  const navigate = useCallback(
    (next: View) => {
      setViewHistory((h) =>
        next === view ? h : [...h.slice(-19), view],
      );
      setView(next);
    },
    [view],
  );

  const resetTo = useCallback((next: View) => {
    setViewHistory([]);
    setView(next);
  }, []);

  const goBack = useCallback(() => {
    setViewHistory((h) => {
      if (h.length === 0) {
        setView(user ? "home" : "login");
        return h;
      }
      const prev = h[h.length - 1];
      setView(prev);
      return h.slice(0, -1);
    });
  }, [user]);

  const go = useCallback(
    (next: View) => {
      const adminViews: View[] = [
        "admin-dashboard",
        "admin-auctions",
        "admin-products",
        "admin-users",
        "admin-transactions",
        "admin-audit",
        "admin-monitor",
        "admin-auction-monitor",
        "monitor",
      ];
      if (adminViews.includes(next) && user?.role !== "admin") return;
      navigate(next);
    },
    [user, navigate],
  );

  const selectCategory = useCallback(
    (cat: string) => {
      setSelectedCategory(cat);
      navigate("auctions");
    },
    [navigate],
  );

  const selectAuction = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFeePaid(false);
      setPendingBidAmount(null);
      setUserBid(null);
      setBidTicketNumber(null);
      setPaymentContext(null);
      const auction = auctions.find((a) => a.id === id);
      if (auction?.status === "closed") {
        navigate("winner");
      } else {
        navigate("product");
      }
    },
    [auctions, navigate],
  );

  const setSelectedIdOnly = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const selectAuctionForMonitor = useCallback((id: string) => {
    setSelectedId(id);
    navigate("admin-auction-monitor");
  }, [navigate]);

  const payFee = useCallback(
    async (fee: number, paymentMethod?: "AWASH") => {
      if (!selectedId) return;
      if (user?.role === "admin") {
        const msg = "Administrators are not allowed to participate in bidding.";
        setAuthError(msg);
        toast(msg, "error");
        return;
      }
      try {
        setAuthError(null);
        await api.payBidFeeWithWallet(selectedId);
        setWalletBalance((b) => b - fee);
        setFeePaid(true);
        navigate("place-bid");
      } catch (e) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast(msg, "error");
      }
    },
    [selectedId, user?.role],
  );

  const submitBid = useCallback(
    async (amount: number) => {
      if (!selectedId || !user) return;
      if (user?.role === "admin") {
        const msg = "Administrators are not allowed to participate in bidding.";
        setAuthError(msg);
        toast(msg, "error");
        return;
      }
      try {
        const res = await api.bid.place(selectedId, amount);
        const ticket = res.ticket_number;
        setBidTicketNumber(ticket ?? null);
        const bid: PlacedBid = {
          auctionId: selectedId,
          amount,
          placedAt: Date.now(),
          userId: user.id,
          userName: user.name,
          ticketNumber: ticket,
        };
        setMyBids((prev) => [bid, ...prev]);
        setAllBids((prev) => [bid, ...prev]);
        setUserBid(amount);
        setPendingBidAmount(null);
        setAuctions((prev) =>
          prev.map((a) =>
            a.id === selectedId
              ? {
                  ...a,
                  bidders: (a.bidders ?? 0) + 1,
                  totalBids: (a.totalBids ?? 0) + 1,
                }
              : a,
          ),
        );
        navigate("bid-confirmed");
        refreshWallet();
        setTimeout(() => refreshAuctions(), 3000);
        const name =
          auctions.find((a) => a.id === selectedId)?.name || "Unknown";
        const smsText = `Your bid of birr ${amount} on '${name}' has been placed successfully. Your BID ticket: ${ticket || "N/A"}`;
        toast(`📱 SMS: ${smsText}`, "success");
      } catch (e) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast(msg, "error");
      }
    },
    [selectedId, user, auctions],
  );

  const setPaymentMethod = useCallback(
    (method: "AWASH" | "WALLET") => {
      setPaymentMethodState(method);
    },
    [],
  );

  const payWinning = useCallback(
    async (
      amount: number,
      method?: "AWASH" | "WALLET",
      customerPhone?: string,
    ) => {
      if (!selectedId) return;
      try {
        setAuthError(null);
        setUserBid(amount);
        await api.payWinningWithWallet(selectedId);
        setLastPaymentMethod("AWASH");
        refreshWallet();
        refreshAuctions();
        navigate("payment-confirmed");
      } catch (e) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast(msg, "error");
      }
    },
    [selectedId],
  );

  const checkPaymentStatus = useCallback(async () => {
    if (!selectedId) return false;
    try {
      const status = await api.getPaymentLinkStatus(selectedId);
      if (status.status === "SUCCESSFUL") return true;
      return false;
    } catch {
      return false;
    }
  }, [selectedId]);

  const reset = useCallback(() => {
    resetTo("home");
    setSelectedId(null);
    setUserBid(null);
    setBidTicketNumber(null);
    setFeePaid(false);
    setPendingBidAmount(null);
    setWalletBalance(INITIAL_BALANCE);
    setPaymentMethodState("AWASH");
    setPaymentContext(null);
    setMyBids([]);
  }, [resetTo]);




  const login = useCallback(
    async (phone: string, password: string): Promise<boolean> => {
      const ok = await authLogin(phone, password);
      if (ok) {
        resetTo("home");
        refreshWallet();
        refreshAuctions();
      }
      return ok;
    },
    [authLogin, resetTo, refreshWallet, refreshAuctions],
  );

  const register = useCallback(
    async (phone: string, password: string, name: string): Promise<boolean> => {
      const ok = await authRegister(phone, password, name);
      if (ok) {
        resetTo("home");
        refreshWallet();
        refreshAuctions();
      }
      return ok;
    },
    [authRegister, resetTo, refreshWallet, refreshAuctions],
  );

  const logout = useCallback((reason: SessionExpireReason = "logout") => {
    authLogout(reason);
    setSelectedId(null);
    setUserBid(null);
    setPendingBidAmount(null);
    setBidTicketNumber(null);
    setFeePaid(false);
    setWalletBalance(0);
    setMyBids([]);
    setAllBids([]);
    setAuctions([]);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...saved,
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionStartedAt: null,
          }),
        );
      } catch {
        /* ignore */
      }
    }
    if (reason !== "logout") {
      sessionChannelRef.current?.postMessage({
        type: "session-expired",
        reason,
      });
    }
    resetTo("login");
  }, [authLogout, resetTo]);
  logoutRef.current = logout;

  const addAuction = useCallback(
    async (a: {
      name: string;
      category: string;
      marketPrice: number;
      bidFee: number;
      description: string;
      highlights: string[];
      specs?: ProductSpecs;
      startTime: string;
      endTime: string;
      images?: string[];
      minBid?: number;
      maxBid?: number;
      paymentDeadlineHours?: number;
      escalationRule?: string;
    }) => {
      if (user?.role !== "admin") return;
      try {
        const product = await api.createProduct({
          name: a.name,
          description: a.description,
          current_market_price: a.marketPrice,
          category: a.category,
          ...(a.specs ? { specs: a.specs } : {}),
          ...(a.images?.length ? { image_urls: a.images } : {}),
        });
        await api.createAuction({
          product_id: product.id,
          start_time: a.startTime,
          end_time: a.endTime,
          min_bid: a.minBid,
          max_bid: a.maxBid,
          bid_fee: a.bidFee,
          payment_deadline_hours: a.paymentDeadlineHours,
          escalation_rule: a.escalationRule,
        });
        await refreshAuctions();
        toast("Auction created successfully", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to create auction", "error");
      }
      navigate("admin-auctions");
    },
    [refreshAuctions, user, navigate],
  );

  const closeAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.closeAuction(id);
        await refreshAuctions();
        toast("Auction closed successfully", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to close auction", "error");
      }
    },
    [refreshAuctions, user],
  );

  const forceCloseAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.forceCloseAuction(id);
        await refreshAuctions();
        toast("Auction force-closed without winner", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to force-close auction", "error");
      }
    },
    [refreshAuctions, user],
  );

  const reopenAuction = useCallback(
    async (id: string, data: any) => {
      if (user?.role !== "admin") return;
      try {
        await api.adminReopenAuction(id, data);
        await refreshAuctions();
        toast("Auction reopened successfully", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to reopen auction", "error");
        throw e;
      }
    },
    [refreshAuctions, user],
  );

  const bulkReopenAuctions = useCallback(
    async (
      ids: string[],
      options?: {
        startTime?: string;
        endTime?: string;
        bidFee?: number;
        durationDays?: number;
      },
    ) => {
      if (user?.role !== "admin" || !ids || ids.length === 0) {
        return { total: 0, reopened: 0 };
      }
      try {
        let reopenedCount = 0;
        try {
          const res = await api.adminBulkReopenAuctions({
            auction_ids: ids,
            start_time: options?.startTime,
            end_time: options?.endTime,
            bid_fee: options?.bidFee,
            duration_days: options?.durationDays,
          });
          reopenedCount = res.reopened;
        } catch {
          const results = await Promise.allSettled(
            ids.map((id) =>
              api.adminReopenAuction(id, {
                start_time: options?.startTime || new Date().toISOString(),
                end_time:
                  options?.endTime ||
                  new Date(Date.now() + (options?.durationDays ?? 7) * 86400000).toISOString(),
                bid_fee: options?.bidFee,
              }),
            ),
          );
          reopenedCount = results.filter((r) => {
            if (r.status === "fulfilled") return true;
            const message =
              r.reason instanceof Error ? r.reason.message : String(r.reason);
            return /already active/i.test(message);
          }).length;
        }
        await refreshAuctions();
        if (reopenedCount === 0) {
          toast("Failed to reopen the selected auctions", "error");
        } else {
          toast(`Successfully reopened ${reopenedCount} of ${ids.length} auction(s)`, "success");
        }
        return { total: ids.length, reopened: reopenedCount };
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to bulk reopen auctions", "error");
        throw e;
      }
    },
    [refreshAuctions, user],
  );

  const updateAuction = useCallback(
    async (id: string, data: any) => {
      if (user?.role !== "admin") return;
      try {
        const auction = getAuction(id) || (await api.getAuction(id));
        const productId =
          (auction && "product" in auction && auction.product?.id) ||
          (auction && "productId" in auction ? auction.productId : undefined);
        if (productId) {
          if (
            data.name ||
            data.marketPrice !== undefined ||
            data.description !== undefined ||
            data.category !== undefined ||
            data.images !== undefined
          ) {
            await api.updateProduct(productId, {
              ...(data.name ? { name: data.name } : {}),
              ...(data.marketPrice !== undefined
                ? { current_market_price: data.marketPrice }
                : {}),
              ...(data.description !== undefined
                ? { description: data.description }
                : {}),
              ...(data.category !== undefined
                ? { category: data.category }
                : {}),
              ...(data.images !== undefined ? { image_urls: data.images } : {}),
              ...(data.specs !== undefined ? { specs: data.specs } : {}),
            });
          }
          if (
            data.startTime ||
            data.endTime ||
            data.minBid != null ||
            data.maxBid != null ||
            data.bidFee != null ||
            data.paymentDeadlineHours != null ||
            data.escalationRule != null
          ) {
            await api.updateAuction(id, {
              ...(data.startTime ? { start_time: data.startTime } : {}),
              ...(data.endTime ? { end_time: data.endTime } : {}),
              ...(data.minBid != null ? { min_bid: data.minBid } : {}),
              ...(data.maxBid != null ? { max_bid: data.maxBid } : {}),
              ...(data.bidFee != null ? { bid_fee: data.bidFee } : {}),
              ...(data.paymentDeadlineHours != null
                ? { payment_deadline_hours: data.paymentDeadlineHours }
                : {}),
              ...(data.escalationRule != null
                ? { escalation_rule: data.escalationRule }
                : {}),
            });
          }
        }
        await refreshAuctions();
        toast("Auction updated successfully", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to update auction", "error");
      }
    },
    [refreshAuctions, user],
  );

  const deleteAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.deleteAuction(id);
        await refreshAuctions();
        toast("Auction deleted successfully", "success");
      } catch (e: unknown) {
        toast((e instanceof Error ? e.message : undefined) || "Failed to delete auction", "error");
      }
    },
    [getAuction, refreshAuctions, user],
  );

  const value = useMemo(
    () => ({
      view,
      selectedId,
      userBid,
      pendingBidAmount,
      bidTicketNumber,
      feePaid,
      walletBalance,
      paymentMethod,
      lastPaymentMethod,
      paymentContext,
      setPaymentContext,
      favoriteAuctionIds,
      favoritesLoading,
      unreadNotificationCount,
      myBids,
      user,
      allBids,
      auctions,
      auctionsLoading,
      selectedCategory,
      setSelectedCategory,
      selectCategory,
      authError,
      sessionEndReason,
      go,
      goBack,
      selectAuction,
      selectAuctionForMonitor,
      setSelectedIdOnly,
      setFeePaid,
      setPendingBidAmount,
      payFee,
      submitBid,
      payWinning,
      setPaymentMethod,
      checkPaymentStatus,
      reset,
      login,
      register,
      logout,
      addAuction,
      updateAuction,
      deleteAuction,
      closeAuction,
      forceCloseAuction,
      reopenAuction,
      bulkReopenAuctions,
      refreshAuctions,
      refreshWallet,
      refreshFavorites,
      refreshUnreadNotifications,
      toggleFavorite,
      isFavorite,
      fetchAuctionById,
      getAuction,
    }),
    [
      view,
      selectedId,
      userBid,
      pendingBidAmount,
      bidTicketNumber,
      feePaid,
      walletBalance,
      paymentMethod,
      lastPaymentMethod,
      paymentContext,
      setPaymentContext,
      favoriteAuctionIds,
      favoritesLoading,
      unreadNotificationCount,
      myBids,
      user,
      allBids,
      auctions,
      auctionsLoading,
      selectedCategory,
      setSelectedCategory,
      selectCategory,
      authError,
      sessionEndReason,
      go,
      goBack,
      selectAuction,
      selectAuctionForMonitor,
      setSelectedIdOnly,
      setFeePaid,
      setPendingBidAmount,
      payFee,
      submitBid,
      payWinning,
      setPaymentMethod,
      checkPaymentStatus,
      reset,
      login,
      register,
      logout,
      addAuction,
      updateAuction,
      deleteAuction,
      closeAuction,
      forceCloseAuction,
      reopenAuction,
      bulkReopenAuctions,
      refreshAuctions,
      refreshWallet,
      refreshFavorites,
      refreshUnreadNotifications,
      toggleFavorite,
      isFavorite,
      fetchAuctionById,
      getAuction,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
