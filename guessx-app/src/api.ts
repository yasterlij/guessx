import { Platform } from "react-native";
import Constants from "expo-constants";

const PROD_HOST =
  process.env.EXPO_PUBLIC_API_HOST ?? "196.189.237.158";
const debuggerHost =
  Constants.expoConfig?.hostUri ||
  (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
const DEV_HOST = debuggerHost
  ? debuggerHost.split(":")[0]
  : Platform.OS === "android"
    ? "10.0.2.2"
    : "localhost";
const USE_PROD = process.env.EXPO_PUBLIC_USE_PROD === "true";
const HOST = USE_PROD ? PROD_HOST : DEV_HOST;
const UNIFIED_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "3000";
const UNIFIED_API = `http://${HOST}${USE_PROD ? "" : `:${UNIFIED_PORT}`}/api/v1`;
const IDENTITY_API = process.env.EXPO_PUBLIC_IDENTITY_URL ?? UNIFIED_API;
const QUERY_API = process.env.EXPO_PUBLIC_QUERY_URL ?? UNIFIED_API;
const ENGINE_API = process.env.EXPO_PUBLIC_ENGINE_URL ?? UNIFIED_API;

let _token: string | null = null;
let _refreshToken: string | null = null;

export type SessionExpireReason =
  | "expired"
  | "idle"
  | "absolute"
  | "refresh-failed"
  | "logout";

const ACCESS_REFRESH_MARGIN_MS = 60_000;

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === "function") {
    try {
      return atob(padded);
    } catch {
      /* fall through */
    }
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < padded.length; i++) {
    const c = padded[i];
    if (c === "=") break;
    const v = lookup[c];
    if (v === undefined) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(base64UrlDecode(part)) as { exp?: number };
  } catch {
    return null;
  }
}

export function getAccessTokenExpiry(): number | null {
  if (!_token) return null;
  const payload = decodeJwtPayload(_token);
  if (typeof payload?.exp !== "number") return null;
  return payload.exp * 1000;
}

let _accessRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearAccessRefreshTimer() {
  if (_accessRefreshTimer != null) {
    clearTimeout(_accessRefreshTimer);
    _accessRefreshTimer = null;
  }
}

function scheduleAccessRefresh() {
  clearAccessRefreshTimer();
  if (!_token || !_refreshToken) return;
  const exp = getAccessTokenExpiry();
  if (exp == null) return;
  const delay = Math.max(0, exp - Date.now() - ACCESS_REFRESH_MARGIN_MS);
  _accessRefreshTimer = setTimeout(
    async () => {
      try {
        await refreshAuth("refresh-failed");
      } catch {
        expireSession("refresh-failed");
      }
    },
    Math.min(delay, 2_147_000_000),
  );
}

export function setApiToken(token: string | null) {
  _token = token;
  scheduleAccessRefresh();
}

export function getApiToken() {
  return _token;
}

export function setRefreshToken(token: string | null) {
  _refreshToken = token;
  scheduleAccessRefresh();
}

export function getRefreshToken() {
  return _refreshToken;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  ERR_AUTH_INVALID_CREDENTIALS:
    "The phone number or password you entered is incorrect. Please try again.",
  ERR_AUTH_FORBIDDEN:
    "You do not have permission to perform this action.",
  ERR_AUTH_REQUIRED: "Please sign in to continue.",
  ERR_VALIDATION: "Please check your input and try again.",
  ERR_NOT_FOUND: "The requested information could not be found.",
  ERR_CONFLICT: "This action could not be completed because of a conflict.",
  ERR_RATE_LIMIT: "You are moving too fast! Please wait a moment.",
  ERR_SERVER: "Something went wrong on our end. Please try again.",
  ERR_NETWORK:
    "Unable to connect to the server. Please check your internet connection.",
  ERR_TIMEOUT: "The request took too long. Please try again.",
};

export type ErrorCategory =
  | "auth"
  | "validation"
  | "network"
  | "server"
  | "unknown";

class ApiError extends Error {
  status: number;
  errorCode: string;
  category: ErrorCategory;

  constructor(status: number, message: string, errorCode = "ERR_SERVER") {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.category = getCategory(status, errorCode);
  }
}

function getCategory(status: number, errorCode: string): ErrorCategory {
  if ([401, 403].includes(status)) return "auth";
  if ([400, 409, 422].includes(status)) return "validation";
  if (status === 429) return "network";
  if (status >= 500) return "server";
  if (errorCode.startsWith("ERR_AUTH")) return "auth";
  if (errorCode.startsWith("ERR_VALIDATION")) return "validation";
  return "unknown";
}

export function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (
      err.message &&
      err.message !== "Forbidden" &&
      err.message !== "Forbidden resource" &&
      err.message !== "Internal server error"
    ) {
      return err.message;
    }
    return FRIENDLY_ERRORS[err.errorCode] || (err instanceof Error ? err.message : String(err));
  }
  if (err instanceof TypeError && (err instanceof Error ? err.message : String(err)) === "Failed to fetch") {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  if (err instanceof Error) {
    if ((err instanceof Error ? err.message : String(err)) === "No refresh token")
      return "Your session has expired. Please sign in again.";
    if ((err instanceof Error ? err.message : String(err)) === "Token refresh failed")
      return "Your session has expired. Please sign in again.";
    if ((err instanceof Error ? err.message : String(err)).includes("exhausted retries"))
      return "The server is not responding. Please try again later.";
    return (err instanceof Error ? err.message : String(err));
  }
  return "An unexpected error occurred. Please try again.";
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

let _refreshing: Promise<void> | null = null;
let _sessionExpiredHandler: ((reason: SessionExpireReason) => void) | null =
  null;

export function onSessionExpired(
  handler: ((reason: SessionExpireReason) => void) | null,
) {
  _sessionExpiredHandler = handler;
}

function expireSession(reason: SessionExpireReason = "expired") {
  clearAccessRefreshTimer();
  _token = null;
  _refreshToken = null;
  _sessionExpiredHandler?.(reason);
}

async function refreshAuth(
  failReason: SessionExpireReason = "expired",
): Promise<void> {
  if (!_refreshToken) {
    expireSession(failReason);
    throw new Error("No refresh token");
  }
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const res = await fetch(`${IDENTITY_API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!res.ok) {
      expireSession(failReason);
      throw new Error("Token refresh failed");
    }
    const data = await res.json();
    _token = data.access_token;
    _refreshToken = data.refresh_token;
    scheduleAccessRefresh();
  })();
  try {
    await _refreshing;
  } finally {
    _refreshing = null;
  }
}

async function parseErrorBody(
  res: Response,
): Promise<{ message: string; errorCode: string }> {
  try {
    const json = await res.json();
    return {
      message: json.message || `Request failed (${res.status})`,
      errorCode: json.errorCode || "ERR_SERVER",
    };
  } catch {
    return {
      message: `Request failed (${res.status})`,
      errorCode: "ERR_SERVER",
    };
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  base?: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_token) headers["Authorization"] = "Bearer " + _token;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const url = `${base || IDENTITY_API}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return res.json();

      if (res.status === 401 && _refreshToken && attempt < MAX_RETRIES) {
        await refreshAuth();
        if (_token) headers["Authorization"] = "Bearer " + _token;
        continue;
      }

      if (res.status === 401) {
        expireSession();
      }

      const { message, errorCode } = await parseErrorBody(res);

      if (res.status < 500) {
        throw new ApiError(res.status, message, errorCode);
      }
      if (attempt === MAX_RETRIES) {
        throw new ApiError(res.status, message, errorCode);
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (e instanceof TypeError) {
        throw new ApiError(
          0,
          "Unable to connect to the server. Please check your internet connection.",
          "ERR_NETWORK",
        );
      }
      if (
        e instanceof Error &&
        ((e instanceof Error ? e.message : String(e)) === "No refresh token" ||
          (e instanceof Error ? e.message : String(e)) === "Token refresh failed")
      ) {
        throw new ApiError(
          401,
          "Your session has expired. Please sign in again.",
          "ERR_AUTH_REQUIRED",
        );
      }
      if (attempt === MAX_RETRIES)
        throw new ApiError(
          0,
          "The server is not responding. Please try again later.",
          "ERR_TIMEOUT",
        );
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }
  }

  throw new ApiError(
    0,
    "The server is not responding. Please try again later.",
    "ERR_TIMEOUT",
  );
}

export type ApiProduct = {
  id: string;
  name: string;
  description: string | null;
  image_urls: string[] | null;
  current_market_price: number;
  category: string | null;
  brand: string | null;
  specs?: Record<string, string> | null;
  created_at: string;
};

export type ApiWinnerInfo = {
  user_id: string;
  amount: number;
  name: string | null;
  phone: string | null;
  rank: number;
  payment_status: string | null;
  payment_deadline: string | null;
};

export type ApiAuction = {
  id: string;
  public_code?: string;
  product_id: string;
  product: ApiProduct | null;
  start_time: string;
  end_time: string;
  status: "ACTIVE" | "CLOSED" | "EXPIRED";
  winner_user_id: string | null;
  winning_bid_amount: number | null;
  created_at: string;
  winners?: ApiWinnerInfo[];
  winnersCount?: number;
  winners_count?: number;
  payment_status?: string | null;
  payment_deadline?: string | null;
  payment_deadline_hours?: number | null;
  escalation_rule?: string | null;
  second_winner_assigned?: boolean;
  bid_fee?: number | null;
  min_bid?: number | null;
  max_bid?: number | null;
  num_winners?: number;
  stats?: { total_bids: number; unique_bidders: number } | null;
};

export type ApiBid = {
  id: string;
  user_id: string;
  user_name?: string | null;
  auction_id: string;
  amount: number;
  bid_time: string;
  service_fee_paid: boolean;
  ticket_number?: string;
};

export type ApiWinnerResult = {
  id: string;
  product: ApiProduct | null;
  status: string;
  start_time: string;
  end_time: string;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_phone: string | null;
  winning_bid_amount: number | null;
  total_bids: number;
  unique_bidders: number;
  lowest_unique_bid: number | null;
  all_winners: ApiWinnerInfo[];
  bids: ApiBid[];
  created_at: string;
  payment_status: string | null;
  payment_deadline: string | null;
};

export type ApiAuctionResult = {
  id: string;
  product: ApiProduct | null;
  status: string;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_phone: string | null;
  winning_bid_amount: number | null;
  total_bids: number;
  unique_bidders: number;
  lowest_unique_bid: number | null;
  all_winners: ApiWinnerInfo[];
  bids?: ApiBid[];
  my_bid: {
    amount: number;
    bid_time: string;
    service_fee_paid: boolean;
  } | null;
  created_at: string;
  payment_status: string | null;
  payment_deadline: string | null;
  second_winner_assigned?: boolean;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: string; phone_number: string };
};

export type ApiUser = {
  id: string;
  phone_number: string;
  full_name: string;
  role: string;
  wallet_balance: number;
  avatar_url: string | null;
};

export type ApiFavorite = {
  user_id: string;
  auction_id: string;
  created_at: string;
};

export type ApiNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  sent_at: string;
};

export type ApiSettlementReport = {
  start_date: string;
  end_date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
  transaction_count: number;
  details: Array<{
    auction_id: string;
    product_name: string;
    winning_amount: number;
    participation_fee_revenue: number;
    platform_share: number;
    tax: number;
    commission: number;
    net_to_seller: number;
    payment_status: string;
    settled_at: string | null;
  }>;
  escrow_summary?: {
    total_held_in_escrow: number;
    total_released_to_platform: number;
    pending_delivery_count: number;
  };
  gateway_breakdown?: {
    awash_volume: number;
    awash_count: number;
  };
};

export type ApiUnifiedTransaction = {
  id: string;
  type: string;
  category: string;
  status: string;
  amount: number;
  user_id: string;
  auction_id: string | null;
  created_at: string;
  user_name?: string | null;
  user_phone?: string | null;
  ticket_number?: string | null;
  product_name?: string | null;
  gateway?: string | null;
  payment_type?: string | null;
  reference_id?: string | null;
  escalation_flag?: string | null;
};

export type ApiTransactionsListResponse = {
  data: ApiUnifiedTransaction[];
  summary: {
    auction_volume: number;
    wallet_topup_volume: number;
    winning_bid_volume: number;
    bid_fee_volume: number;
    total_volume: number;
    successful_count: number;
    pending_count: number;
    defaulted_count: number;
  };
  meta: {
    page: number;
    total_pages: number;
    total: number;
    limit?: number;
    [key: string]: unknown;
  };
};

export type ApiBidderHistory = {
  user_id: string;
  total_bids: number;
  total_auctions: number;
  highest_bid: number | null;
  lowest_bid: number | null;
  bids: ApiBid[];
  auctions?: ApiAuction[];
  user?: ApiUser | null;
  stats: {
    compliance_rate: number;
    auctions_won: number;
    payments_defaulted: number;
    total_bids: number;
  };
};

export const api = {
  auth: {
    register(phone_number: string, password: string, full_name: string) {
      return request<AuthResponse>("POST", "/auth/register", {
        phone_number,
        password,
        full_name,
      });
    },
    login(phone_number: string, password: string) {
      return request<AuthResponse>("POST", "/auth/login/phone", {
        phone_number,
        password,
      });
    },
    refresh(refreshToken: string) {
      return request<AuthResponse>("POST", "/auth/refresh", {
        refresh_token: refreshToken,
      });
    },
    profile() {
      return request<ApiUser>("GET", "/auth/profile");
    },
    registerPushToken(token: string, platform: "android" | "ios") {
      return request<{ registered: boolean }>("POST", "/auth/fcm-token", {
        token,
        platform,
      });
    },
  },

  wallet: {
    balance() {
      return request<{ balance: number }>(
        "GET",
        "/wallet/balance",
        undefined,
        IDENTITY_API,
      );
    },
    deposit(amount: number) {
      return request<{ balance: number }>(
        "POST",
        "/wallet/deposit",
        { amount },
        IDENTITY_API,
      );
    },
    setPin(pin: string) {
      return request<{ set: boolean }>(
        "POST",
        "/wallet/set-pin",
        { pin },
        IDENTITY_API,
      );
    },
    verifyPin(pin: string) {
      return request<{
        valid: boolean;
        attemptsRemaining: number;
        locked: boolean;
        lockedUntil: string | null;
      }>("POST", "/wallet/verify-pin", { pin }, IDENTITY_API);
    },
    hasPin() {
      return request<{ hasPin: boolean }>(
        "GET",
        "/wallet/has-pin",
        undefined,
        IDENTITY_API,
      );
    },
    pinStatus() {
      return request<{
        hasPin: boolean;
        attemptsRemaining: number;
        locked: boolean;
        lockedUntil: string | null;
      }>("GET", "/wallet/pin-status", undefined, IDENTITY_API);
    },
  },

  bid: {
    place(auctionId: string, amount: number) {
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const timestamp = Date.now().toString();
      return request<{
        message: string;
        new_total_bids: number;
        ticket_number?: string;
      }>("POST", `/auctions/${auctionId}/bid`, { amount }, ENGINE_API, {
        "x-bid-nonce": nonce,
        "x-bid-timestamp": timestamp,
      });
    },
    myBids(auctionId: string) {
      return request<{
        auction_id: string;
        bids: { amount: number; bid_time: string; ticket_number: string }[];
      }>("GET", `/auctions/${auctionId}/my-bids`, undefined, ENGINE_API);
    },
  },

  createProduct(data: {
    name: string;
    description?: string;
    image_urls?: string[];
    current_market_price: number;
    category?: string;
    specs?: Record<string, string>;
  }) {
    return request<ApiProduct>("POST", "/admin/products", data, ENGINE_API);
  },
  updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      image_urls: string[];
      current_market_price: number;
      category: string;
      specs: Record<string, string>;
    }>,
  ) {
    return request<ApiProduct>(
      "PATCH",
      `/admin/products/${id}`,
      data,
      ENGINE_API,
    );
  },
  listProducts(page = 1, limit = 20) {
    return request<{ data: ApiProduct[]; meta: any }>(
      "GET",
      `/admin/products?page=${page}&limit=${limit}`,
      undefined,
      ENGINE_API,
    );
  },
  deleteProduct(id: string) {
    return request<{ deleted: boolean; id: string }>(
      "DELETE",
      `/admin/products/${id}`,
      undefined,
      ENGINE_API,
    );
  },
  getFavorites() {
    return request<{ data: ApiFavorite[]; total: number }>(
      "GET",
      "/favorites",
      undefined,
      QUERY_API,
    );
  },
  addFavorite(auctionId: string) {
    return request<ApiFavorite>(
      "POST",
      `/favorites/${auctionId}`,
      undefined,
      QUERY_API,
    );
  },
  removeFavorite(auctionId: string) {
    return request<{ removed: boolean }>(
      "DELETE",
      `/favorites/${auctionId}`,
      undefined,
      QUERY_API,
    );
  },
  createAuction(data: {
    product_id: string;
    start_time: string;
    end_time: string;
    min_bid?: number;
    max_bid?: number;
    bid_fee?: number;
    payment_deadline_hours?: number;
    escalation_rule?: string;
  }) {
    return request<ApiAuction>("POST", "/admin/auctions", data, ENGINE_API);
  },
  reopenAuction(
    id: string,
    data: {
      start_time: string;
      end_time: string;
      min_bid?: number;
      max_bid?: number;
      bid_fee?: number;
      payment_deadline_hours?: number;
      escalation_rule?: string;
      product_id?: string;
      name?: string;
      category?: string;
      description?: string;
      image_urls?: string[];
      current_market_price?: number;
    },
  ) {
    return request<ApiAuction>(
      "POST",
      `/admin/auctions/${id}/reopen`,
      data,
      ENGINE_API,
    );
  },
  adminBulkReopenAuctions(data: {
    auction_ids: string[];
    start_time?: string;
    end_time?: string;
    bid_fee?: number;
    duration_days?: number;
  }) {
    return request<{
      total: number;
      reopened: number;
      failed?: number;
      results?: { id: string; success: boolean; error?: string }[];
    }>("POST", "/admin/auctions/bulk-reopen", data, ENGINE_API);
  },
  async listAuctions() {
    const data = await request<ApiAuction[]>(
      "GET",
      "/auctions/active?limit=200",
      undefined,
      QUERY_API,
    );
    return {
      data,
      meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 },
    };
  },
  async listClosedAuctions() {
    const data = await request<ApiAuction[]>(
      "GET",
      "/auctions/closed?limit=200",
      undefined,
      QUERY_API,
    );
    return {
      data,
      meta: { total: data.length, page: 1, limit: data.length, total_pages: 1 },
    };
  },
  adminListAuctions(page = 1, limit = 100) {
    return request<{ data: ApiAuction[]; meta: any }>(
      "GET",
      `/admin/auctions?page=${page}&limit=${limit}`,
      undefined,
      ENGINE_API,
    );
  },
  updateAuction(
    id: string,
    data: Partial<{
      product_id: string;
      start_time: string;
      end_time: string;
      status: string;
      min_bid: number;
      max_bid: number;
      bid_fee: number;
    }>,
  ) {
    return request<ApiAuction>(
      "PATCH",
      `/admin/auctions/${id}`,
      data,
      ENGINE_API,
    );
  },
  deleteAuction(id: string) {
    return request<{ deleted: boolean; id: string }>(
      "DELETE",
      `/admin/auctions/${id}`,
      undefined,
      ENGINE_API,
    );
  },
  closeAuction(id: string) {
    return request<ApiAuction>(
      "POST",
      `/admin/auctions/${id}/close`,
      undefined,
      ENGINE_API,
    );
  },
  forceCloseAuction(id: string) {
    return request<ApiAuction>(
      "POST",
      `/admin/auctions/${id}/force-close`,
      undefined,
      ENGINE_API,
    );
  },
  drawWinner(id: string) {
    return request<ApiWinnerResult>(
      "GET",
      `/admin/auctions/${id}/winner`,
      undefined,
      ENGINE_API,
    );
  },
  getAuctionResult(id: string) {
    return request<ApiAuctionResult>(
      "GET",
      `/auctions/${id}/result`,
      undefined,
      ENGINE_API,
    );
  },
  getAuctionBids(id: string) {
    return request<ApiBid[]>(
      "GET",
      `/admin/auctions/${id}/bids`,
      undefined,
      ENGINE_API,
    );
  },
  adminListUsers(page = 1, limit = 100, search?: string) {
    const query = `page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
    return request<{ data: ApiUser[]; meta: any }>(
      "GET",
      `/admin/users?${query}`,
      undefined,
      IDENTITY_API,
    );
  },
  getUser(id: string) {
    return request<ApiUser>(
      "GET",
      `/admin/users/${id}`,
      undefined,
      IDENTITY_API,
    );
  },
  updateUser(
    id: string,
    data: Partial<{ role: string; full_name: string; phone_number: string }>,
  ) {
    return request<ApiUser>("PATCH", `/admin/users/${id}`, data, IDENTITY_API);
  },
  getAuction(id: string) {
    return request<ApiAuction>("GET", `/auctions/${id}`, undefined, QUERY_API);
  },
  adminGetSettlementReport(start: string, end: string) {
    return request<ApiSettlementReport>(
      "GET",
      `/admin/settlement/report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      QUERY_API,
    );
  },
  adminListEnhancedTransactions(filters: {
    auction_id?: string;
    user_id?: string;
    type?: string;
    category?: "all" | "auction" | "wallet";
    status?: string;
    start?: string;
    end?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (filters.auction_id) q.set("auction_id", filters.auction_id);
    if (filters.user_id) q.set("user_id", filters.user_id);
    if (filters.type) q.set("type", filters.type);
    if (filters.category && filters.category !== "all") q.set("category", filters.category);
    if (filters.status) q.set("status", filters.status);
    if (filters.start) q.set("start", filters.start);
    if (filters.end) q.set("end", filters.end);
    if (filters.search) q.set("search", filters.search);
    if (filters.page != null) q.set("page", String(filters.page));
    if (filters.limit != null) q.set("limit", String(filters.limit));
    return request<ApiTransactionsListResponse>(
      "GET",
      `/admin/transactions/all?${q.toString()}`,
      undefined,
      QUERY_API,
    );
  },
  adminGetBidderHistory(userId: string) {
    return request<ApiBidderHistory>(
      "GET",
      `/admin/bidders/${userId}/history`,
      undefined,
      QUERY_API,
    );
  },
  createPaymentLink(
    auctionId: string,
    paymentMethod?: string,
    customerPhone?: string,
  ) {
    let path = `/payments/${auctionId}/link`;
    const params: string[] = [];
    if (paymentMethod)
      params.push(`payment_method=${encodeURIComponent(paymentMethod)}`);
    if (customerPhone)
      params.push(`customer_phone=${encodeURIComponent(customerPhone)}`);
    const qs = params.join("&");
    if (qs) path += `?${qs}`;
    return request<{
      payment_url: string;
      proxy_url: string;
      transaction_id: string;
      gateway: string;
    }>("POST", path, undefined, ENGINE_API);
  },
  getPaymentLinkStatus(auctionId: string) {
    return request<{
      status: string;
      payment_url: string | null;
      gateway?: string;
    }>("GET", `/payments/${auctionId}/status`, undefined, ENGINE_API);
  },
  confirmPayment(auctionId: string) {
    return request<{ paid: boolean }>(
      "POST",
      `/payments/${auctionId}/confirm`,
      undefined,
      ENGINE_API,
    );
  },
  payWinningWithWallet(auctionId: string) {
    return request<{ paid: boolean }>(
      "POST",
      `/payments/${auctionId}/wallet-pay`,
      undefined,
      ENGINE_API,
    );
  },
  createBidFeePaymentLink(auctionId: string) {
    return request<{
      payment_url: string;
      proxy_url: string;
      transaction_id: string;
    }>("POST", `/payments/bid-fee/${auctionId}/link`, undefined, ENGINE_API);
  },
  getBidFeePaymentStatus(auctionId: string) {
    return request<{ status: string; payment_url: string | null }>(
      "GET",
      `/payments/bid-fee/${auctionId}/status`,
      undefined,
      ENGINE_API,
    );
  },
  confirmBidFeePayment(auctionId: string) {
    return request<{ paid: boolean }>(
      "POST",
      `/payments/bid-fee/${auctionId}/confirm`,
      undefined,
      ENGINE_API,
    );
  },
  payBidFeeWithWallet(auctionId: string) {
    return request<{ paid: boolean }>(
      "POST",
      `/payments/bid-fee/${auctionId}/wallet-pay`,
      undefined,
      ENGINE_API,
    );
  },
  getInbox(unreadOnly = false) {
    return request<ApiNotification[]>(
      "GET",
      `/notify/inbox${unreadOnly ? "?unread=true" : ""}`,
      undefined,
      IDENTITY_API,
    );
  },
  markNotificationRead(id: string) {
    return request<{ read: boolean }>(
      "POST",
      `/notify/inbox/${id}/read`,
      undefined,
      IDENTITY_API,
    );
  },
  markAllNotificationsRead() {
    return request<{ read: boolean }>(
      "POST",
      "/notify/inbox/read-all",
      undefined,
      IDENTITY_API,
    );
  },
};
