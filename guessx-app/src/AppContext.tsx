import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState as RNAppState, type AppStateStatus } from "react-native";
import {
  api,
  setApiToken,
  setRefreshToken,
  getApiToken,
  getRefreshToken,
  getUserFriendlyMessage,
  onSessionExpired,
  type SessionExpireReason,
  type ApiAuction,
} from "./api";
import { useToast } from "./components/Toast";
import { useAuctionSocket, applySocketUpdate } from "./hooks/useAuctionSocket";
import { useFavoriteAuctions } from "./hooks/useFavoriteAuctions";
import { useAuthSession } from "./hooks/useAuthSession";
import { useWalletBalance } from "./hooks/useWalletBalance";
import {
  registerForPushNotifications,
  useNotificationObserver,
} from "./hooks/usePushNotifications";
import { useUnreadNotifications } from "./hooks/useUnreadNotifications";
import { normalizeAuctionCategory } from "./lib/auctionCategories";
import {
  type Auction,
  type ProductSpecs,
  formatSpecSummary,
} from "./mockDataV0";

export type View =
  | "login"
  | "register"
  | "home"
  | "auctions"
  | "my-bids"
  | "wallet"
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
  | "admin-settlement"
  | "admin-monitor"
  | "admin-auction-monitor"
  | "deposit"
  | "payment-success"
  | "payment-failed"
  | "winners-list"
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
  favoriteAuctionIds: string[];
  favoritesLoading: boolean;
  unreadNotificationCount: number;
  myBids: PlacedBid[];
  user: User | null;
  users: User[];
  allBids: PlacedBid[];
  auctions: Auction[];
  auctionsLoading: boolean;
  authError: string | null;
  sessionEndReason: SessionExpireReason | null;
  paymentMethod: "AWASH";
  setFeePaid: (paid: boolean) => void;
  setPendingBidAmount: (amount: number | null) => void;
  go: (view: View) => void;
  goBack: () => void;
  selectAuction: (id: string) => void;
  selectAuctionForMonitor: (id: string) => void;
  payFee: (fee: number, paymentMethod?: "AWASH") => void;
  submitBid: (amount: number) => void;
  payWinning: (
    amount?: number,
    paymentMethod?: "AWASH",
    customerPhone?: string,
  ) => void;
  setPaymentMethod: (method: "AWASH") => void;
  checkPaymentStatus: () => Promise<boolean>;
  reset: () => void;
  login: (phone: string, password: string) => Promise<string | null>;
  register: (
    name: string,
    phone: string,
    password: string,
  ) => Promise<string | null>;
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
  getAuction: (id: string | null | undefined) => Auction | undefined;
  fetchAuctionById: (id: string) => Promise<Auction | undefined>;
};

const AppContext = createContext<AppState | null>(null);

const BID_FEE = 1;
const STORAGE_KEY = "guessx_data";
const LEGACY_STORAGE_KEY = "takelow_data";
const INITIAL_BALANCE = 0;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

function mapAuction(apiAuction: ApiAuction): Auction {
  const timeLeft = Math.max(
    0,
    Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000),
  );
  return {
    id: apiAuction.id,
    publicCode:
      apiAuction.public_code != null
        ? String(apiAuction.public_code)
        : undefined,
    name: apiAuction.product?.name || "Unknown Product",
    category: normalizeAuctionCategory(
      apiAuction.product?.category,
      apiAuction.product?.name,
    ),
    images: apiAuction.product?.image_urls || [],
    marketPrice: Number(apiAuction.product?.current_market_price || 0),
    bidFee: apiAuction.bid_fee != null ? Number(apiAuction.bid_fee) : BID_FEE,
    bidders: apiAuction.stats?.total_bids ?? 0,
    uniqueBidders: apiAuction.stats?.unique_bidders ?? 0,
    totalBids: apiAuction.stats?.total_bids ?? 0,
    timeLeft,
    endTime: apiAuction.end_time,
    status: (apiAuction.status === "ACTIVE"
      ? timeLeft < 3600
        ? "ending-soon"
        : "live"
      : "closed") as Auction["status"],
    description: apiAuction.product?.description || "",
    highlights: [],
    specs: apiAuction.product?.specs || null,
    specSummary: formatSpecSummary(apiAuction.product?.specs),
    minBid: apiAuction.min_bid ?? undefined,
    maxBid: apiAuction.max_bid ?? undefined,
    winners:
      apiAuction.winners?.map((w: any) => ({
        ...w,
        name: w.name || w.user_name || null,
      })) ?? undefined,
    winnersCount:
      apiAuction.winnersCount ?? apiAuction.winners?.length ?? undefined,
    winning_bid_amount: apiAuction.winning_bid_amount ?? null,
    payment_status: apiAuction.payment_status ?? null,
    payment_deadline: apiAuction.payment_deadline ?? null,
    payment_deadline_hours: apiAuction.payment_deadline_hours ?? null,
    escalation_rule: apiAuction.escalation_rule ?? null,
    second_winner_assigned: Boolean(apiAuction.second_winner_assigned),
  };
}

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
  const toast = useToast();
  const [view, setView] = useState<View>("login");
  const [viewHistory, setViewHistory] = useState<View[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userBid, setUserBid] = useState<number | null>(null);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);
  const [bidTicketNumber, setBidTicketNumber] = useState<string | null>(null);
  const [feePaid, setFeePaid] = useState(false);
  const [paymentMethod, setPaymentMethodState] = useState<"AWASH">("AWASH");
  const [myBids, setMyBids] = useState<PlacedBid[]>([]);
  const [allBids, setAllBids] = useState<PlacedBid[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const users: User[] = [];
  const refreshing = useRef(false);
  const logoutRef = useRef<(reason?: SessionExpireReason) => void>(() => {});
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
    onError: (msg) => toast.show(msg, "error"),
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
    onError: (message) => toast.show(message, "error"),
  });
  const { unreadNotificationCount, refreshUnreadNotifications } =
    useUnreadNotifications({ hydrated, userId: user?.id });

  useAuctionSocket(selectedId, (payload) => {
    setAuctions((prev) => applySocketUpdate(prev, payload));
  });

  useNotificationObserver();

  useEffect(() => {
    (async () => {
      let raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (!raw) {
        raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY).catch(() => null);
        if (raw) await AsyncStorage.setItem(STORAGE_KEY, raw).catch(() => {});
      }
      if (!raw) {
        setHydrated(true);
        return;
      }
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
        if (typeof saved.walletBalance === "number") setWalletBalance(saved.walletBalance);
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
          if (ok) {
            refreshWallet();
            resetTo("home");
          }
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const tokens = user
      ? { accessToken: getApiToken(), refreshToken: getRefreshToken() }
      : {};
    AsyncStorage.setItem(
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
    ).catch(() => {});
  }, [
    auctions,
    allBids,
    myBids,
    walletBalance,
    pendingBidAmount,
    user,
    hydrated,
  ]);

  const refreshAuctions = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setAuctionsLoading(true);
    try {
      const [activeRes, closedRes] = await Promise.all([
        api.listAuctions().catch(() => ({ data: [] })),
        api.listClosedAuctions().catch(() => ({ data: [] })),
      ]);
      const allMapped = [
        ...activeRes.data.map(mapAuction),
        ...closedRes.data.map(mapAuction),
      ];
      const unique = Array.from(
        new Map(allMapped.map((a) => [a.id, a])).values(),
      );
      setAuctions(unique);
    } catch {
      toast.show("Failed to refresh auctions", "error");
    } finally {
      setAuctionsLoading(false);
      refreshing.current = false;
    }
  }, [toast]);

  useEffect(() => {
    if (!hydrated) return;
    refreshAuctions();
  }, [hydrated, refreshAuctions]);

  useEffect(() => {
    if (!hydrated || !user) return;
    const isLiveView = LIVE_VIEWS.includes(view);
    if (!isLiveView) return;
    const interval = setInterval(refreshAuctions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [hydrated, user, view, refreshAuctions]);

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
        "admin-users",
        "admin-monitor",
        "admin-auction-monitor",
        "monitor",
      ];
      if (adminViews.includes(next) && user?.role !== "admin") return;
      navigate(next);
    },
    [user, navigate],
  );

  const selectAuctionForMonitor = useCallback((id: string) => {
    setSelectedId(id);
    navigate("admin-auction-monitor");
  }, [navigate]);

  const selectAuction = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFeePaid(false);
      setPendingBidAmount(null);
      setUserBid(null);
      setBidTicketNumber(null);
      const auction = auctions.find((a) => a.id === id);
      if (auction && auction.status === "closed") {
        navigate("winner");
      } else {
        navigate("product");
      }
    },
    [auctions, navigate],
  );

  const payFee = useCallback(
    async (fee: number, paymentMethod?: "AWASH") => {
      if (!selectedId) return;
      if (user?.role === "admin") {
        const msg = "Administrators are not allowed to participate in bidding.";
        setAuthError(msg);
        toast.show(msg, "error");
        return;
      }

      if (walletBalance < fee) {
        setAuthError("Insufficient balance to pay bid fee");
        toast.show("Insufficient balance to pay bid fee", "error");
        return;
      }
      try {
        await api.payBidFeeWithWallet(selectedId);
        setWalletBalance((b) => b - fee);
        setFeePaid(true);
        navigate("place-bid");
      } catch (e: unknown) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast.show(msg, "error");
      }
    },
    [selectedId, walletBalance, toast, user?.role],
  );

  const submitBid = useCallback(
    async (amount: number) => {
      if (!selectedId || !user) return;
      if (user?.role === "admin") {
        const msg = "Administrators are not allowed to participate in bidding.";
        setAuthError(msg);
        toast.show(msg, "error");
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
        setTimeout(() => refreshAuctions(), 3000);
        const name =
          auctions.find((a) => a.id === selectedId)?.name || "Unknown";
        const smsText = `Your bid of ${amount.toFixed(2)} birr on '${name}' has been placed successfully. Your BID ticket: ${ticket || "N/A"}`;
        toast.show(`📱 SMS: ${smsText}`, "success");
      } catch (e: unknown) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast.show(msg, "error");
      }
    },
    [selectedId, user, refreshAuctions, auctions],
  );

  const setPaymentMethod = useCallback((method: "AWASH") => {
    setPaymentMethodState(method);
  }, []);

  const checkPaymentStatus = useCallback(async () => {
    if (!selectedId) return false;
    try {
      const status = await api.getPaymentLinkStatus(selectedId);
      return status.status === "SUCCESSFUL";
    } catch {
      return false;
    }
  }, [selectedId]);

  const payWinning = useCallback(
    async (
      amount?: number,
      method?: "AWASH",
      customerPhone?: string,
    ) => {
      if (!selectedId) return;
      setAuthError(null);
      if (amount != null) setUserBid(amount);
      if (amount != null && walletBalance < amount) {
        setAuthError("Insufficient balance to pay winning amount");
        toast.show("Insufficient balance to pay winning amount", "error");
        return;
      }
      try {
        await api.payWinningWithWallet(selectedId);
        if (amount != null) setWalletBalance((b) => b - amount);
        navigate("payment-confirmed");
      } catch (e: unknown) {
        const msg = getUserFriendlyMessage(e);
        setAuthError(msg);
        toast.show(msg, "error");
      }
    },
    [selectedId, paymentMethod, walletBalance, toast],
  );

  const reset = useCallback(() => {
    resetTo("home");
    setSelectedId(null);
    setUserBid(null);
    setBidTicketNumber(null);
    setFeePaid(false);
    setPendingBidAmount(null);
    setPaymentMethodState("AWASH");
    setAuthError(null);
  }, [resetTo]);

  const login = useCallback(
    async (phone: string, password: string): Promise<string | null> => {
      const err = await authLogin(phone, password);
      if (!err) {
        resetTo("home");
        refreshWallet();
        refreshAuctions();
        registerForPushNotifications();
      }
      return err;
    },
    [authLogin, resetTo, refreshWallet, refreshAuctions],
  );

  const register = useCallback(
    async (name: string, phone: string, password: string): Promise<string | null> => {
      const err = await authRegister(phone, password, name);
      if (!err) {
        resetTo("home");
        refreshWallet();
        refreshAuctions();
      }
      return err;
    },
    [authRegister, resetTo, refreshWallet, refreshAuctions],
  );

  const logout = useCallback((reason: SessionExpireReason = "logout") => {
    authLogout(reason);
    setSelectedId(null);
    setUserBid(null);
    setBidTicketNumber(null);
    setFeePaid(false);
    setWalletBalance(0);
    setMyBids([]);
    setAllBids([]);
    setAuctions([]);
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : {};
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...saved,
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionStartedAt: null,
          }),
        ).catch(() => {});
      })
      .catch(() => {});
    resetTo("login");
  }, [authLogout, resetTo]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    onSessionExpired((reason) => logoutRef.current(reason));
    return () => onSessionExpired(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    const resetIdleTimer = () => {
      if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (IDLE_TIMEOUT_MS > 60 * 1000) {
        idleWarnTimerRef.current = setTimeout(
          () => {
            toast.show(
              "You will be signed out in 1 minute due to inactivity",
              "warning",
            );
          },
          IDLE_TIMEOUT_MS - 60 * 1000,
        );
      }
      idleTimerRef.current = setTimeout(
        () => logoutRef.current("idle"),
        IDLE_TIMEOUT_MS,
      );
    };
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "active") {
        const started = sessionStartedAtRef.current;
        if (started != null && Date.now() - started > ABSOLUTE_TIMEOUT_MS) {
          logoutRef.current("absolute");
          return;
        }
        resetIdleTimer();
      }
    };
    const sub = RNAppState.addEventListener("change", onAppStateChange);
    resetIdleTimer();
    return () => {
      sub.remove();
      if (idleWarnTimerRef.current) clearTimeout(idleWarnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleWarnTimerRef.current = null;
      idleTimerRef.current = null;
    };
  }, [user, toast]);

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
        toast.show("Auction created successfully", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
      }
      navigate("admin-auctions");
    },
    [refreshAuctions, user, toast, navigate],
  );

  const closeAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.closeAuction(id);
        await refreshAuctions();
        toast.show("Auction closed successfully", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
      }
    },
    [refreshAuctions, user, toast],
  );

  const forceCloseAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.forceCloseAuction(id);
        await refreshAuctions();
        toast.show("Auction force-closed successfully", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
      }
    },
    [refreshAuctions, user, toast],
  );

  const reopenAuction = useCallback(
    async (id: string, data: any) => {
      if (user?.role !== "admin") return;
      try {
        await api.reopenAuction(id, data);
        await refreshAuctions();
        toast.show("Auction reopened successfully", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
        throw e;
      }
    },
    [refreshAuctions, user, toast],
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
              api.reopenAuction(id, {
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
          toast.show("Failed to reopen the selected auctions", "error");
        } else {
          toast.show(`Successfully reopened ${reopenedCount} auction${reopenedCount > 1 ? "s" : ""}`, "success");
        }
        return { total: ids.length, reopened: reopenedCount };
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
        throw e;
      }
    },
    [refreshAuctions, user, toast],
  );

  const updateAuction = useCallback(
    async (id: string, data: any) => {
      if (user?.role !== "admin") return;
      try {
        const auction =
          auctions.find((a: any) => a.id === id) ||
          (await api.getAuction(id));
        const productId =
          (auction && "product" in auction && (auction as any).product?.id) ||
          (auction && "productId" in auction ? (auction as any).productId : undefined);
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
            (data as any).paymentDeadlineHours != null ||
            (data as any).escalationRule != null
          ) {
            await api.updateAuction(id, {
              ...(data.startTime ? { start_time: data.startTime } : {}),
              ...(data.endTime ? { end_time: data.endTime } : {}),
              ...(data.minBid != null ? { min_bid: data.minBid } : {}),
              ...(data.maxBid != null ? { max_bid: data.maxBid } : {}),
              ...(data.bidFee != null ? { bid_fee: data.bidFee } : {}),
              ...((data as any).paymentDeadlineHours != null
                ? { payment_deadline_hours: (data as any).paymentDeadlineHours }
                : {}),
              ...((data as any).escalationRule != null
                ? { escalation_rule: (data as any).escalationRule }
                : {}),
            });
          }
        }
        await refreshAuctions();
        toast.show("Auction updated successfully", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
      }
    },
    [auctions, refreshAuctions, user, toast],
  );

  const deleteAuction = useCallback(
    async (id: string) => {
      if (user?.role !== "admin") return;
      try {
        await api.deleteAuction(id);
        await refreshAuctions();
        toast.show("Auction deleted", "success");
      } catch (e: unknown) {
        toast.show(getUserFriendlyMessage(e), "error");
      }
    },
    [refreshAuctions, user, toast],
  );

  const getAuction = useCallback(
    (id: string | null | undefined): Auction | undefined => {
      if (!id) return undefined;
      return auctions.find((a) => a.id === id);
    },
    [auctions],
  );

  const fetchAuctionById = useCallback(
    async (id: string): Promise<Auction | undefined> => {
      const cached = auctions.find((a) => a.id === id);
      if (cached) return cached;
      try {
        const res = await api.getAuction(id);
        const mapped = mapAuction(res);
        setAuctions((prev) => {
          const exists = prev.find((a) => a.id === mapped.id);
          if (exists) return prev;
          return [...prev, mapped];
        });
        return mapped;
      } catch {
        return undefined;
      }
    },
    [auctions],
  );

  const value = useMemo(
    () => ({
      view,
      selectedId,
      userBid,
      bidTicketNumber,
      feePaid,
      walletBalance,
      favoriteAuctionIds,
      favoritesLoading,
      unreadNotificationCount,
      paymentMethod,
      setFeePaid,
      myBids,
      user,
      users,
      allBids,
      pendingBidAmount,
      auctions,
      auctionsLoading,
      authError,
      sessionEndReason,
      go,
      goBack,
      selectAuction,
      selectAuctionForMonitor,
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
      getAuction,
      fetchAuctionById,
    }),
    [
      view,
      selectedId,
      userBid,
      bidTicketNumber,
      feePaid,
      walletBalance,
      favoriteAuctionIds,
      favoritesLoading,
      unreadNotificationCount,
      paymentMethod,
      setFeePaid,
      pendingBidAmount,
      myBids,
      user,
      users,
      allBids,
      auctions,
      auctionsLoading,
      authError,
      sessionEndReason,
      go,
      goBack,
      selectAuction,
      selectAuctionForMonitor,
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
      getAuction,
      fetchAuctionById,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
