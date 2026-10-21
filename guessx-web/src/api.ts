import {
  createGuessXApi,
  ApiError,
  type SessionExpireReason,
  type ErrorCategory,
  type ApiProduct,
  type ApiWinnerInfo,
  type ApiAuction,
  type ReopenAuctionPayload,
  type ApiBid,
  type ApiWinnerResult,
  type ApiAuctionResult,
  type AuthResponse,
  type ApiUser,
  type ApiNotification,
  type ApiFavorite,
  type ApiSettlementReport,
  type ApiSettlementRow,
  type ApiDailySettlement,
  type ApiPendingWinner,
  type ApiWinnerStats,
  type ApiDispute,
  type ApiBidderHistory,
  type ApiNotificationTemplate,
  type ApiRbacOverride,
  type ApiAccessDecision,
  type ApiAuctionTransactions,
  type ApiUnifiedTransaction,
  type ApiTransactionsListResponse,
  type ApiComplianceReport,
  type EnterpriseRole,
  type RoleDefinition,
  type ApiUserPermission,
  ENTERPRISE_ROLES,
  isStaffRole,
} from "@guessx/api";

export type {
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
  ApiBidderHistory,
  ApiNotificationTemplate,
  ApiRbacOverride,
  ApiAccessDecision,
  ApiAuctionTransactions,
  ApiUnifiedTransaction,
  ApiTransactionsListResponse,
  ApiComplianceReport,
  EnterpriseRole,
  RoleDefinition,
  ApiUserPermission,
};
export { ApiError, ENTERPRISE_ROLES, isStaffRole };

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api/v1";
const IDENTITY_API =
  (import.meta.env.VITE_IDENTITY_API_BASE_URL as string | undefined) ||
  API_BASE;
const ENGINE_API =
  (import.meta.env.VITE_ENGINE_API_BASE_URL as string | undefined) || API_BASE;
const QUERY_API =
  (import.meta.env.VITE_QUERY_API_BASE_URL as string | undefined) || API_BASE;

const client = createGuessXApi({
  identityBaseUrl: IDENTITY_API,
  engineBaseUrl: ENGINE_API,
  queryBaseUrl: QUERY_API,
  onSessionExpired: (reason) => {
    window.dispatchEvent(
      new CustomEvent("session-expired", { detail: { reason } }),
    );
  },
});

export const {
  api,
  setApiToken,
  getApiToken,
  setRefreshToken,
  getRefreshToken,
  getAccessTokenExpiry,
  getUserFriendlyMessage,
  onSessionExpired,
} = client;

let _sikinaPopup: Window | null = null;

const SIKINA_POPUP_W = 420;
const SIKINA_POPUP_H = 700;

export function openSikinaPopup(url: string): Window | null {
  if (_sikinaPopup && !_sikinaPopup.closed) {
    _sikinaPopup.focus();
    return _sikinaPopup;
  }
  const w = SIKINA_POPUP_W;
  const h = SIKINA_POPUP_H;
  const left = Math.max(
    0,
    Math.round(window.screenX + (window.outerWidth - w) / 2),
  );
  const top = Math.max(
    0,
    Math.round(window.screenY + (window.outerHeight - h) / 2),
  );
  _sikinaPopup = window.open(
    url,
    "sikina-pay",
    `popup=yes,width=${w},height=${h},left=${left},top=${top},menubar=no,status=no,location=no,toolbar=no,directories=no,scrollbars=yes,resizable=yes`,
  );
  return _sikinaPopup;
}

export function closeSikinaPopup(): void {
  if (_sikinaPopup && !_sikinaPopup.closed) _sikinaPopup.close();
  _sikinaPopup = null;
}

export function isSikinaPopupOpen(): boolean {
  return !!(_sikinaPopup && !_sikinaPopup.closed);
}
