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
