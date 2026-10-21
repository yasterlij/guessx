import type {
  SessionExpireReason,
  ErrorCategory,
  ApiProduct,
  ApiWinnerInfo,
  ApiAuction,
  ReopenAuctionPayload,
  ApiBid,
  ApiWinnerResult,
  ApiAuctionResult,
  AuthResponse,
  ApiUser,
  ApiNotification,
  ApiFavorite,
  ApiSettlementReport,
  ApiSettlementRow,
  ApiDailySettlement,
  ApiPendingWinner,
  ApiWinnerStats,
  ApiDispute,
  ApiRbacOverride,
  ApiAccessDecision,
  ApiBidderHistory,
  ApiNotificationTemplate,
  ApiAuctionTransactions,
  ApiSettlementConfig,
  ApiUnifiedTransaction,
  ApiTransactionsListResponse,
  ApiComplianceReport,
} from "./types";

export type GuessXApiConfig = {
  identityBaseUrl: string;
  engineBaseUrl: string;
  queryBaseUrl: string;
  onSessionExpired?: (reason: SessionExpireReason) => void;
  requestTimeoutMs?: number;
};

export class ApiError extends Error {
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

export function createGuessXApi(config: GuessXApiConfig) {
  const IDENTITY_API = config.identityBaseUrl.replace(/\/$/, "");
  const ENGINE_API = config.engineBaseUrl.replace(/\/$/, "");
  const QUERY_API = config.queryBaseUrl.replace(/\/$/, "");
  const REQUEST_TIMEOUT_MS = config.requestTimeoutMs;

let _token: string | null = null;
let _refreshToken: string | null = null;

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

function getAccessTokenExpiry(): number | null {
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

function setApiToken(token: string | null) {
  _token = token;
  scheduleAccessRefresh();
}
function getApiToken() {
  return _token;
}
function setRefreshToken(token: string | null) {
  _refreshToken = token;
  scheduleAccessRefresh();
}
function getRefreshToken() {
  return _refreshToken;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  ERR_AUTH_INVALID_CREDENTIALS:
    "The phone number or password you entered is incorrect. Please try again.",
  ERR_AUTH_FORBIDDEN:
    "You do not have permission to perform this action. Please sign in with an admin account.",
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

function getUserFriendlyMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.errorCode === "ERR_VALIDATION" && err.message) {
      return err.message;
    }
    return FRIENDLY_ERRORS[err.errorCode] || err.message;
  }
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  if (err instanceof Error) {
    if (err.message === "No refresh token")
      return "Your session has expired. Please sign in again.";
    if (err.message === "Token refresh failed")
      return "Your session has expired. Please sign in again.";
    if (err.message.includes("exhausted retries"))
      return "The server is not responding. Please try again later.";
    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const DEFAULT_PLATFORM_SHARE_PERCENT = 10;
const DEFAULT_TAX_PERCENT = 15;
const DEFAULT_COMMISSION_PERCENT = 5;

let _refreshing: Promise<void> | null = null;

let _sessionExpiredHandler: ((reason: SessionExpireReason) => void) | null =
  config.onSessionExpired ?? null;

function onSessionExpired(
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
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (_token) headers["Authorization"] = "Bearer " + _token;
  if (extraHeaders) Object.assign(headers, extraHeaders);
  const url = `${base || IDENTITY_API}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller =
        REQUEST_TIMEOUT_MS != null ? new AbortController() : undefined;
      const timeoutId =
        controller && REQUEST_TIMEOUT_MS != null
          ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
          : null;
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body
            ? isFormData
              ? (body as FormData)
              : JSON.stringify(body)
            : undefined,
          signal: controller?.signal,
        });
      } finally {
        if (timeoutId != null) clearTimeout(timeoutId);
      }
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (
          contentType.includes("text/csv") ||
          contentType.includes("text/plain") ||
          contentType.includes("application/octet-stream")
        ) {
          return (await res.text()) as unknown as T;
        }
        return res.json();
      }

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
        (e.message === "No refresh token" ||
          e.message === "Token refresh failed")
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


const api = {
  auth: {
    login(phone_number: string, password: string) {
      return request<AuthResponse>(
        "POST",
        "/auth/login/phone",
        { phone_number, password },
        IDENTITY_API,
      );
    },
    register(phone_number: string, password: string, full_name: string) {
      return request<AuthResponse>(
        "POST",
        "/auth/register",
        { phone_number, password, full_name },
        IDENTITY_API,
      );
    },
    refresh(refreshToken: string) {
      return request<AuthResponse>(
        "POST",
        "/auth/refresh",
        { refresh_token: refreshToken },
        IDENTITY_API,
      );
    },
    profile() {
      return request<ApiUser>("GET", "/auth/profile", undefined, IDENTITY_API);
    },
    registerPushToken(token: string, platform: "android" | "ios") {
      return request<{ registered: boolean }>(
        "POST",
        "/auth/fcm-token",
        { token, platform },
        IDENTITY_API,
      );
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
    deposit(amount: number, referenceId?: string) {
      return request<{ balance: number }>(
        "POST",
        "/wallet/deposit",
        { amount, ...(referenceId ? { reference_id: referenceId } : {}) },
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

  adminGetRevenueAnalytics(params?: { start?: string; end?: string }) {
    const q = new URLSearchParams();
    if (params?.start) q.set("start", params.start);
    if (params?.end) q.set("end", params.end);
    const qs = q.toString();
    return request<{
      total_bid_fee_revenue: number;
      total_winning_payment_revenue: number;
      total_revenue: number;
      revenue_trend: Array<{ day: string; bid_fee_revenue: number; refund_total: number }>;
      top_auctions_by_revenue: Array<{
        auction_id: string;
        product_name: string;
        winning_amount: number;
        bid_fee_revenue: number;
        total_revenue: number;
      }>;
    }>(
      "GET",
      `/admin/analytics/revenue${qs ? `?${qs}` : ""}`,
      undefined,
      QUERY_API,
    );
  },

  adminGetProductEngagement(params?: {
    start?: string;
    end?: string;
    category?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.start) q.set("start", params.start);
    if (params?.end) q.set("end", params.end);
    if (params?.category) q.set("category", params.category);
    const qs = q.toString();
    return request<
      Array<{
        product_id: string;
        product_name: string;
        category: string | null;
        total_watchers: number;
        unique_bidders: number;
        total_bids: number;
        avg_bids_per_user: number;
        revenue_generated: number;
        engagement_score: number;
      }>
    >(
      "GET",
      `/admin/analytics/product-engagement${qs ? `?${qs}` : ""}`,
      undefined,
      QUERY_API,
    );
  },

  adminGetCategoryDistribution(params?: { start?: string; end?: string }) {
    const q = new URLSearchParams();
    if (params?.start) q.set("start", params.start);
    if (params?.end) q.set("end", params.end);
    const qs = q.toString();
    return request<
      Array<{
        category: string;
        auction_count: number;
        total_bids: number;
        unique_bidders: number;
        watchers: number;
        revenue: number;
      }>
    >(
      "GET",
      `/admin/analytics/category-distribution${qs ? `?${qs}` : ""}`,
      undefined,
      QUERY_API,
    );
  },

  adminGetBidVolume(params?: {
    start?: string;
    end?: string;
    granularity?: "hour" | "day";
  }) {
    const q = new URLSearchParams();
    if (params?.start) q.set("start", params.start);
    if (params?.end) q.set("end", params.end);
    if (params?.granularity) q.set("granularity", params.granularity);
    const qs = q.toString();
    return request<{
      points: Array<{ bucket: string; count: number }>;
      total_bids: number;
      unique_bidders: number;
    }>(
      "GET",
      `/admin/analytics/bid-volume${qs ? `?${qs}` : ""}`,
      undefined,
      QUERY_API,
    );
  },

  // Queries
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
  getAuction(id: string) {
    return request<ApiAuction>("GET", `/auctions/${id}`, undefined, QUERY_API);
  },
  getAuctionResult(id: string) {
    return request<ApiAuctionResult>(
      "GET",
      `/auctions/${id}/result`,
      undefined,
      ENGINE_API,
    );
  },

  // Admin (engine)
  adminListAuctions(page = 1, limit = 100) {
    return request<{ data: ApiAuction[]; meta: any }>(
      "GET",
      `/admin/auctions?page=${page}&limit=${limit}`,
      undefined,
      ENGINE_API,
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
      payment_deadline_hours: number;
      escalation_rule: string;
    }>,
  ) {
    return request<ApiAuction>(
      "PATCH",
      `/admin/auctions/${id}`,
      data,
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
  reopenAuction(id: string, data: ReopenAuctionPayload) {
    return request<ApiAuction>(
      "POST",
      `/admin/auctions/${id}/reopen`,
      data,
      ENGINE_API,
    );
  },
  adminReopenAuction(id: string, data: ReopenAuctionPayload) {
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
      failed: number;
      results: { id: string; success: boolean; error?: string }[];
    }>(
      "POST",
      "/admin/auctions/bulk-reopen",
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
  drawWinner(id: string) {
    return request<ApiWinnerResult>(
      "GET",
      `/admin/auctions/${id}/winner`,
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
  createPaymentLink(
    auctionId: string,
    paymentMethod?: string,
    customerPhone?: string,
  ) {
    let path = `/payments/${auctionId}/link`;
    const params = new URLSearchParams();
    if (paymentMethod) params.set("payment_method", paymentMethod);
    if (customerPhone) params.set("customer_phone", customerPhone);
    const qs = params.toString();
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
  createBidFeePaymentLink(
    auctionId: string,
    paymentMethod?: "SIKINAPAY" | "AWASH",
  ) {
    const path = paymentMethod
      ? `/payments/bid-fee/${auctionId}/link?payment_method=${paymentMethod}`
      : `/payments/bid-fee/${auctionId}/link`;
    return request<{
      payment_url: string;
      proxy_url: string;
      transaction_id: string;
    }>("POST", path, undefined, ENGINE_API);
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
  payWinningWithWallet(auctionId: string) {
    return request<{ paid: boolean }>(
      "POST",
      `/payments/${auctionId}/wallet-pay`,
      undefined,
      ENGINE_API,
    );
  },

  // Admin (products)
  createProduct(data: {
    name: string;
    description?: string;
    image_urls?: string[];
    current_market_price: number;
    category?: string;
    brand?: string;
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
      brand: string;
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
  uploadProductImage(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>(
      "POST",
      "/admin/products/upload-image",
      form,
      ENGINE_API,
    );
  },
  downloadProductImages(id: string) {
    return request<{
      downloaded: number;
      total: number;
      message?: string;
    }>("POST", `/admin/products/${id}/download-images`, undefined, ENGINE_API);
  },
  listPendingProducts(page = 1, limit = 20) {
    return request<{ data: ApiProduct[]; meta: any }>(
      "GET",
      `/admin/products/pending?page=${page}&limit=${limit}`,
      undefined,
      ENGINE_API,
    );
  },
  approveProduct(id: string) {
    return request<ApiProduct>(
      "POST",
      `/admin/products/${id}/approve`,
      undefined,
      ENGINE_API,
    );
  },
  rejectProduct(id: string, reason?: string) {
    return request<ApiProduct>(
      "POST",
      `/admin/products/${id}/reject`,
      { reason },
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

  // Admin (identity)
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
  getUserDetail(id: string) {
    return request<ApiUser & { bids: any[]; auctions: any[] }>(
      "GET",
      `/admin/users/${id}/detail`,
      undefined,
      IDENTITY_API,
    );
  },
  getUserTransactions(id: string) {
    return request<any[]>(
      "GET",
      `/admin/users/${id}/transactions`,
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
  updateUserRole(id: string, role: string) {
    return request<ApiUser>(
      "PATCH",
      `/admin/users/${id}/role`,
      { role },
      IDENTITY_API,
    );
  },
  toggleUserBan(id: string) {
    return request<ApiUser>(
      "PATCH",
      `/admin/users/${id}/ban`,
      {},
      IDENTITY_API,
    );
  },
  bulkUpdateUserRole(ids: string[], role: string) {
    return request<any>(
      "POST",
      "/admin/users/bulk/role",
      { ids, role },
      IDENTITY_API,
    );
  },
  bulkToggleUserBan(ids: string[], banned: boolean) {
    return request<any>(
      "POST",
      "/admin/users/bulk/ban",
      { ids, banned },
      IDENTITY_API,
    );
  },
  adminListTransactions(page = 1, limit = 50) {
    return request<{ data: any[]; meta: any }>(
      "GET",
      `/admin/users/transactions/all?page=${page}&limit=${limit}`,
      undefined,
      IDENTITY_API,
    );
  },
  adminListAuditLogs(
    pageOrParams: number | { page?: number; limit?: number; entity_type?: string; entity_id?: string; actor_id?: string; action?: string } = 1,
    limit = 50,
  ) {
    let query = "";
    if (typeof pageOrParams === "number") {
      query = `page=${pageOrParams}&limit=${limit}`;
    } else if (pageOrParams) {
      const q = new URLSearchParams();
      if (pageOrParams.page != null) q.set("page", String(pageOrParams.page));
      if (pageOrParams.limit != null) q.set("limit", String(pageOrParams.limit));
      if (pageOrParams.entity_type) q.set("entity_type", pageOrParams.entity_type);
      if (pageOrParams.entity_id) q.set("entity_id", pageOrParams.entity_id);
      if (pageOrParams.actor_id) q.set("actor_id", pageOrParams.actor_id);
      if (pageOrParams.action) q.set("action", pageOrParams.action);
      query = q.toString();
    } else {
      query = "page=1&limit=50";
    }
    return request<{ data: any[]; meta: any }>(
      "GET",
      `/audit/logs?${query}`,
      undefined,
      QUERY_API,
    ).catch(() =>
      request<{ data: any[]; meta: any }>(
        "GET",
        `/admin/users/audit/list?${query}`,
        undefined,
        IDENTITY_API,
      ),
    );
  },
  adminGetAuditStats() {
    return request<{
      total_logs: number;
      unique_actors: number;
      last_24h_logs: number;
      action_breakdown: Record<string, number>;
    }>("GET", "/audit/stats", undefined, QUERY_API);
  },
  adminExportAuditLogsCsv(
    filters: {
      actor_id?: string;
      action?: string;
      entity_type?: string;
      entity_id?: string;
      start?: string;
      end?: string;
    } = {},
  ) {
    const q = new URLSearchParams();
    if (filters.actor_id) q.set("actor_id", filters.actor_id);
    if (filters.action) q.set("action", filters.action);
    if (filters.entity_type) q.set("entity_type", filters.entity_type);
    if (filters.entity_id) q.set("entity_id", filters.entity_id);
    if (filters.start) q.set("start", filters.start);
    if (filters.end) q.set("end", filters.end);
    const query = q.toString() ? `?${q.toString()}` : "";
    return request<string>("GET", `/audit/export${query}`, undefined, QUERY_API);
  },
  adminExportUsersCsv() {
    return request<string>(
      "GET",
      "/admin/users/export/csv",
      undefined,
      IDENTITY_API,
    );
  },
  adminExportTransactionsCsv() {
    return request<string>(
      "GET",
      "/admin/users/transactions/export/csv",
      undefined,
      IDENTITY_API,
    );
  },
  // Admin (engine) exports + bulk
  adminExportAuctionsCsv() {
    return request<string>(
      "GET",
      "/admin/auctions/export/csv",
      undefined,
      ENGINE_API,
    );
  },
  adminExportProductsCsv() {
    return request<string>(
      "GET",
      "/admin/products/export/csv",
      undefined,
      ENGINE_API,
    );
  },
  adminBulkDeleteAuctions(ids: string[]) {
    return request<any>(
      "POST",
      "/admin/auctions/bulk-delete",
      { ids },
      ENGINE_API,
    );
  },
  adminBulkDeleteProducts(ids: string[]) {
    return request<any>(
      "POST",
      "/admin/products/bulk-delete",
      { ids },
      ENGINE_API,
    );
  },
  adminDownloadProductImages(id: string) {
    return request<any>(
      "POST",
      `/admin/products/${id}/download-images`,
      undefined,
      ENGINE_API,
    );
  },
  adminGetStats() {
    return request<any>("GET", "/admin/stats", undefined, QUERY_API);
  },

  // Notifications
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

  // Settlement
  adminGetSettlementReport(start: string, end: string) {
    return request<ApiSettlementReport>(
      "GET",
      `/admin/settlement/report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      QUERY_API,
    );
  },
  adminGetDailySettlement(date: string) {
    return request<ApiDailySettlement>(
      "GET",
      `/admin/settlement/daily?date=${encodeURIComponent(date)}`,
      undefined,
      QUERY_API,
    );
  },
  adminExportSettlementCsv(start: string, end: string) {
    return request<string>(
      "GET",
      `/admin/settlement/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      QUERY_API,
    );
  },

  // Winner Management
  adminGetPendingWinners() {
    return request<ApiPendingWinner[]>(
      "GET",
      "/admin/winners/pending",
      undefined,
      QUERY_API,
    );
  },
  adminGetExpiredWinners() {
    return request<ApiPendingWinner[]>(
      "GET",
      "/admin/winners/expired",
      undefined,
      QUERY_API,
    );
  },
  adminGetWinnerStats() {
    return request<ApiWinnerStats>(
      "GET",
      "/admin/winners/stats",
      undefined,
      QUERY_API,
    );
  },
  adminExtendWinnerDeadline(winnerId: string, new_deadline: string) {
    return request<any>(
      "POST",
      `/admin/winners/${winnerId}/extend-deadline`,
      { new_deadline },
      QUERY_API,
    );
  },
  adminReassignWinner(winnerId: string) {
    return request<any>(
      "POST",
      `/admin/winners/${winnerId}/reassign`,
      undefined,
      QUERY_API,
    );
  },
  adminCancelWinner(winnerId: string, reason?: string) {
    return request<any>(
      "POST",
      `/admin/winners/${winnerId}/cancel`,
      { reason },
      QUERY_API,
    );
  },
  adminSendPaymentReminder(winnerId: string) {
    return request<{ success: boolean; message: string }>(
      "POST",
      `/admin/winners/${winnerId}/remind`,
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

  // Disputes
  getUserDisputes() {
    return request<ApiDispute[]>(
      "GET",
      "/disputes",
      undefined,
      IDENTITY_API,
    );
  },
  createDispute(data: { auction_id?: string; type: string; description: string }) {
    return request<ApiDispute>(
      "POST",
      "/disputes",
      data,
      IDENTITY_API,
    );
  },
  adminListAllDisputes(status?: string, page = 1, limit = 50) {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== "ALL") q.append("status", status);
    return request<{ disputes: ApiDispute[]; total: number } | ApiDispute[]>(
      "GET",
      `/disputes/all?${q.toString()}`,
      undefined,
      IDENTITY_API,
    );
  },
  adminUpdateDisputeStatus(id: string, status: string, resolution?: string, document_urls?: string) {
    return request<ApiDispute>(
      "PATCH",
      `/disputes/${id}/status`,
      { status, resolution, document_urls },
      IDENTITY_API,
    );
  },

  // RBAC
  adminGetRbacAbilities() {
    return request<any>("GET", "/rbac/abilities", undefined, IDENTITY_API);
  },
  adminGetAccessDecisions(page = 1, limit = 50) {
    return request<any>(
      "GET",
      `/rbac/access-decisions?page=${page}&limit=${limit}`,
      undefined,
      IDENTITY_API,
    );
  },
  adminGetRbacOverrides(activeOnly = false) {
    return request<ApiRbacOverride[]>(
      "GET",
      `/rbac/overrides${activeOnly ? "?active=true" : ""}`,
      undefined,
      IDENTITY_API,
    );
  },
  adminGrantRbacOverride(data: {
    user_id: string;
    permissions: Record<string, string[]>;
    reason: string;
    expires_at: string;
  }) {
    return request<any>("POST", "/rbac/overrides", data, IDENTITY_API);
  },
  adminRevokeRbacOverride(id: string) {
    return request<any>("PATCH", `/rbac/overrides/${id}/revoke`, {}, IDENTITY_API);
  },
  adminListPermissions() {
    return request<{ permissions: string[] }>(
      "GET",
      "/admin/users/permissions/list",
      undefined,
      IDENTITY_API,
    );
  },
  adminGetUserPermissions(userId: string) {
    return request<{
      user_id: string;
      permissions: Array<{
        id: string;
        permission: string;
        granted_by?: string;
        granted_by_name?: string | null;
        created_at: string;
      }>;
    }>(
      "GET",
      `/admin/users/${userId}/permissions`,
      undefined,
      IDENTITY_API,
    );
  },
  adminGrantUserPermissions(userId: string, permissions: string[]) {
    return request<{ granted: string[] }>(
      "POST",
      `/admin/users/${userId}/permissions/grant`,
      { permissions },
      IDENTITY_API,
    );
  },
  adminRevokeUserPermissions(userId: string, permissions: string[]) {
    return request<{ revoked: string[] }>(
      "POST",
      `/admin/users/${userId}/permissions/revoke`,
      { permissions },
      IDENTITY_API,
    );
  },


  // Product Approvals
  adminGetPendingProducts(page = 1, limit = 20) {
    return request<any>(
      "GET",
      `/admin/products/pending?page=${page}&limit=${limit}`,
      undefined,
      ENGINE_API,
    );
  },
  adminApproveProduct(id: string) {
    return request<any>(
      "POST",
      `/admin/products/${id}/approve`,
      undefined,
      ENGINE_API,
    );
  },
  adminRejectProduct(id: string, reason?: string) {
    return request<any>(
      "POST",
      `/admin/products/${id}/reject`,
      { reason },
      ENGINE_API,
    );
  },
  adminGetAuctionTransactions(auctionId: string) {
    return request<ApiAuctionTransactions>(
      "GET",
      `/admin/auctions/${auctionId}/transactions`,
      undefined,
      QUERY_API,
    ).catch(async () => {
      let localConfig: ApiSettlementConfig | null = null;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const raw = localStorage.getItem(`tl_settlement_${auctionId}`);
          if (raw) localConfig = JSON.parse(raw);
        } catch {}
      }
      const winAmt = localConfig?.winning_price ?? 0;
      const bidFees = localConfig?.bid_fees_collected ?? 0;
      const pPercent = localConfig?.platform_share_percent ?? DEFAULT_PLATFORM_SHARE_PERCENT;
      const pShare = localConfig?.platform_share ?? (winAmt * pPercent) / 100;
      const netSeller =
        localConfig?.net_to_seller ??
        (winAmt > 0 ? Math.max(0, winAmt - pShare) : 0);
      return {
        auction_id: auctionId,
        product_name: "Auction " + auctionId.slice(0, 8),
        public_code: 0,
        status: "CLOSED",
        winner_user_id: null,
        winner_name: null,
        winner_phone: null,
        winning_bid_amount: winAmt,
        payment_status: "PENDING",
        payment_deadline: null,
        second_winner_assigned: false,
        escalation_rule: "LOWEST_UNIQUE_BID",
        bid_fee: 10,
        total_bids_count: 0,
        total_bid_fees_collected: bidFees,
        revenue_sharing: {
          winning_amount: winAmt,
          platform_share: pShare,
          platform_share_percent: pPercent,
          tax: (winAmt * DEFAULT_TAX_PERCENT) / 100,
          tax_percent: DEFAULT_TAX_PERCENT,
          commission: (winAmt * DEFAULT_COMMISSION_PERCENT) / 100,
          commission_percent: DEFAULT_COMMISSION_PERCENT,
          net_to_seller: netSeller,
          platform_total_net: bidFees + pShare,
          is_custom_configured: !!localConfig,
          configured_by: localConfig?.configured_by,
          configured_at: localConfig?.configured_at,
        },
        bids: [],
        winner_payments: [],
        fee_payments: [],
        refunds: [],
        escalations: [],
      } as ApiAuctionTransactions;
    });
  },
  adminGetAuctionSettlementConfig(auctionId: string) {
    return request<ApiSettlementConfig | null>(
      "GET",
      `/admin/auctions/${auctionId}/settlement-config`,
      undefined,
      QUERY_API,
    ).catch(() => {
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const raw = localStorage.getItem(`tl_settlement_${auctionId}`);
          return raw ? JSON.parse(raw) : null;
        } catch {}
      }
      return null;
    });
  },
  adminSaveAuctionSettlementConfig(auctionId: string, config: ApiSettlementConfig) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(`tl_settlement_${auctionId}`, JSON.stringify(config));
      } catch {}
    }
    return request<ApiSettlementConfig>(
      "POST",
      `/admin/auctions/${auctionId}/settlement-config`,
      config,
      QUERY_API,
    ).catch(() => config);
  },
  adminResetAuctionSettlementConfig(auctionId: string) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(`tl_settlement_${auctionId}`);
      } catch {}
    }
    return request<{ success: boolean }>(
      "DELETE",
      `/admin/auctions/${auctionId}/settlement-config`,
      undefined,
      QUERY_API,
    ).catch(() => ({ success: true }));
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
  adminExportTransactions(filters: {
    auction_id?: string;
    user_id?: string;
    type?: string;
    category?: "all" | "auction" | "wallet";
    status?: string;
    start?: string;
    end?: string;
    search?: string;
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
    return request<string>(
      "GET",
      `/admin/transactions/export?${q.toString()}`,
      undefined,
      QUERY_API,
    );
  },
  adminGetComplianceReport(start: string, end: string) {
    return request<ApiComplianceReport>(
      "GET",
      `/admin/compliance/report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      QUERY_API,
    );
  },
};

let _sikinaPopup: Window | null = null;

const SIKINA_POPUP_W = 420;
const SIKINA_POPUP_H = 700;


  return {
    api,
    setApiToken,
    getApiToken,
    setRefreshToken,
    getRefreshToken,
    getAccessTokenExpiry,
    getUserFriendlyMessage,
    onSessionExpired,
    ApiError,
  };
}

export type GuessXApiClient = ReturnType<typeof createGuessXApi>;
