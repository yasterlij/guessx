export type SessionExpireReason =
  | "expired"
  | "idle"
  | "absolute"
  | "refresh-failed"
  | "logout";

export type ErrorCategory =
  | "auth"
  | "validation"
  | "network"
  | "server"
  | "unknown";

/** Canonical winner record shape shared across auction-engine and query-service. */
export type WinnerRecord = {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: Date | string | null;
  notified_at?: Date | string | null;
  created_at?: Date | string | null;
};

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
  rank: number;
  payment_status?: string | null;
  payment_deadline?: string | null;
  name?: string;
  phone?: string;
};

export type ApiAuction = {
  id: string;
  public_code?: string;
  product_id: string;
  product: ApiProduct | null;
  start_time: string;
  end_time: string;
  status: "ACTIVE" | "CLOSED" | "EXPIRED" | "PAYMENT_DEFAULTED";
  payment_status?: string | null;
  payment_deadline?: string | null;
  payment_deadline_hours?: number | null;
  escalation_rule?: string | null;
  second_winner_assigned?: boolean;
  winner_user_id: string | null;
  winning_bid_amount: number | null;
  winners?: ApiWinnerInfo[];
  winners_count?: number;
  created_at: string;
  bid_fee?: number | null;
  min_bid?: number | null;
  max_bid?: number | null;
  num_winners?: number;
  stats?: { total_bids: number; unique_bidders: number } | null;
};

export type ReopenAuctionPayload = {
  start_time: string;
  end_time: string;
  min_bid?: number;
  max_bid?: number;
  bid_fee?: number;
  name?: string;
  category?: string;
  description?: string;
  image_urls?: string[];
  current_market_price?: number;
};

export type ApiBid = {
  id: string;
  user_id: string;
  user_name?: string | null;
  auction_id: string;
  amount: number;
  encrypted_amount?: string | null;
  amount_encrypted?: boolean;
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
  winning_bid_amount: number | null;
  total_bids: number;
  lowest_unique_bid: number | null;
  bids: ApiBid[];
  created_at: string;
  winner_name?: string | null;
  winner_phone?: string | null;
  unique_bidders?: number;
  all_winners?: ApiWinnerInfo[];
  winners_count?: number;
  payment_status?: string | null;
  payment_deadline?: string | null;
};

export type ApiAuctionResult = ApiWinnerResult & {
  my_bid?: { amount: number; service_fee_paid: boolean };
  all_winners?: ApiWinnerInfo[];
  winners_count?: number;
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

export type ApiFavorite = {
  user_id: string;
  auction_id: string;
  created_at: string;
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
  escrow_summary?: {
    total_held_in_escrow: number;
    total_released_to_platform: number;
    pending_delivery_count: number;
  };
  gateway_breakdown?: {
    awash_volume: number;
    awash_count: number;
  };
  details: ApiSettlementRow[];
};

export type ApiSettlementRow = {
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
};

export type ApiDailySettlement = {
  date: string;
  participation_fee_revenue: number;
  winning_price_total: number;
  platform_share: number;
  tax: number;
  commission: number;
  net_revenue: number;
  auction_count: number;
};

export type ApiPendingWinner = {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: string | null;
  created_at: string;
  user?: {
    id: string;
    phone_number: string;
    full_name: string | null;
    email: string | null;
  };
  auction?: {
    id: string;
    public_code: string;
    payment_deadline: string | null;
    payment_status?: string | null;
    second_winner_assigned?: boolean;
    product?: { id: string; name: string };
  };
};

export type ApiWinnerStats = {
  total_winners: number;
  paid_winners: number;
  pending_winners: number;
  expired_winners: number;
  average_payment_time_hours?: number;
};

export type ApiDispute = {
  id: string;
  user_id: string;
  auction_id: string | null;
  type: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  resolution: string | null;
  document_urls?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    phone_number: string;
    full_name: string | null;
  };
  auction?: {
    id: string;
    title?: string;
    public_code?: string;
  };
};

export type ApiBidderHistory = {
  user: {
    id: string;
    phone_number: string;
    full_name: string | null;
    email?: string | null;
    wallet_balance: number;
    created_at: string;
  };
  stats: {
    total_bids: number;
    auctions_participated: number;
    auctions_won: number;
    payments_completed: number;
    payments_defaulted: number;
    compliance_rate: number;
  };
  recent_bids: Array<{
    id: string;
    auction_id: string;
    auction_name: string;
    public_code?: string;
    amount: number;
    bid_time: string;
    ticket_number?: string;
    service_fee_paid: boolean;
  }>;
  won_auctions: Array<{
    id: string;
    auction_id: string;
    auction_name: string;
    public_code?: string;
    amount: number;
    rank: number;
    payment_status: string;
    payment_deadline: string | null;
    second_winner_assigned: boolean;
    created_at: string;
  }>;
};

export type ApiNotificationTemplate = {
  id: string;
  name: string;
  category: "PAYMENT_REMINDER" | "DEFAULT_NOTICE" | "SECOND_WINNER" | "AUCTION_ALERT";
  channels: Array<"PUSH" | "SMS" | "INAPP">;
  title_template: string;
  body_template: string;
  sample_data: Record<string, string>;
};

export type ApiRbacOverride = {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, string[]>;
  reason: string;
  expires_at: string | null;
  active: boolean;
};

export type ApiAccessDecision = {
  id: string;
  user_id: string;
  user_role?: string;
  action: string;
  subject: string;
  granted: boolean;
  reason?: string | null;
  created_at?: string;
  timestamp?: string;
};

export type ApiAuctionTransactions = {
  auction_id: string;
  product_name: string;
  public_code: number;
  status: string;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_phone: string | null;
  winning_bid_amount: number;
  payment_status: string;
  payment_deadline: string | null;
  second_winner_assigned: boolean;
  escalation_rule: string;
  bid_fee: number;
  total_bids_count: number;
  total_bid_fees_collected: number;
  revenue_sharing: {
    winning_amount: number;
    platform_share: number;
    platform_share_percent: number;
    tax: number;
    tax_percent: number;
    commission: number;
    commission_percent: number;
    net_to_seller: number;
    platform_total_net: number;
    is_custom_configured?: boolean;
    configured_by?: string;
    configured_at?: string;
  };
  bids: Array<{
    id: string;
    ticket_number: string;
    user_id: string;
    user_phone: string | null;
    user_name: string | null;
    amount: number;
    bid_time: string;
    service_fee_paid: boolean;
  }>;
  winner_payments: Array<{
    id: string;
    amount: number;
    gateway: string;
    status: string;
    customer_phone: string | null;
    client_reference_id: string;
    created_at: string;
  }>;
  fee_payments: Array<{
    id: string;
    amount: number;
    user_id: string;
    type: string;
    reference_id: string | null;
    created_at: string;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    user_id: string;
    reference_id: string | null;
    created_at: string;
  }>;
  escalations: Array<{
    id: string;
    action: string;
    actor_id: string;
    actor_phone: string | null;
    details: any;
    created_at: string;
  }>;
};

export type ApiSettlementConfig = {
  winning_price?: number;
  bid_fees_collected?: number;
  platform_share?: number;
  platform_share_percent?: number;
  tax?: number;
  commission?: number;
  net_to_seller?: number;
  configured_by?: string;
  configured_at?: string;
};

export type ApiUnifiedTransaction = {
  id: string;
  type: string;
  payment_type: string;
  category: "AUCTION" | "WALLET";
  amount: number;
  status: string;
  gateway: string | null;
  auction_id: string | null;
  product_name: string | null;
  user_id: string;
  user_phone: string | null;
  user_name: string | null;
  reference_id: string | null;
  ticket_number?: string | null;
  created_at: string;
  escalation_flag: string | null;
};

export type ApiTransactionsListResponse = {
  data: ApiUnifiedTransaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: {
    total_volume: number;
    auction_volume: number;
    wallet_topup_volume: number;
    winning_bid_volume: number;
    bid_fee_volume: number;
    deposit_volume: number;
    refund_volume: number;
    successful_count: number;
    pending_count: number;
    defaulted_count: number;
    auction_transactions_count: number;
    wallet_transactions_count: number;
  };
};

export type ApiComplianceReport = {
  generated_at: string;
  period: {
    start: string;
    end: string;
  };
  standards: {
    icc_auction_guidelines: string;
    uncitral_procurement_standards: string;
    tamper_proof_status: string;
  };
  metrics: {
    total_auctions: number;
    closed_auctions: number;
    total_bids: number;
    total_bid_fee_volume: number;
    winning_bids_total_volume: number;
    winner_payments_collected: number;
    winner_payments_held_in_escrow: number;
    payment_compliance_rate_percent: number;
    payment_default_rate_percent: number;
    second_winners_assigned_count: number;
    total_disputes_filed: number;
    unresolved_disputes: number;
  };
  legal_attestation: string;
};

export type EnterpriseRole =
  | 'user'
  | 'admin'
  | 'CEO'
  | 'CXO'
  | 'DIRECTOR'
  | 'MANAGER'
  | 'EXPERT'
  | 'SPECIALIST'
  | 'ANALYST';

export interface RoleDefinition {
  role: EnterpriseRole;
  label: string;
  level: number;
  description: string;
  tone: 'gold' | 'purple' | 'blue' | 'emerald' | 'amber' | 'cyan' | 'indigo' | 'neutral' | 'green';
}

export const ENTERPRISE_ROLES: RoleDefinition[] = [
  { role: 'CEO', label: 'Chief Executive Officer', level: 1, description: 'Full system ownership & ultimate approval authority', tone: 'purple' },
  { role: 'admin', label: 'System Administrator', level: 1, description: 'Superadmin engineering and platform management', tone: 'gold' },
  { role: 'CXO', label: 'Executive Officer (CXO)', level: 2, description: 'Division-level operations, governance, and policies', tone: 'blue' },
  { role: 'DIRECTOR', label: 'Director', level: 3, description: 'Departmental auctions, financial settlements, product approvals', tone: 'emerald' },
  { role: 'MANAGER', label: 'Manager', level: 4, description: 'Section operations, active monitor moderation, winner extensions', tone: 'amber' },
  { role: 'EXPERT', label: 'Domain Expert', level: 5, description: 'Dispute investigations, audit verification, and compliance', tone: 'cyan' },
  { role: 'SPECIALIST', label: 'Operations Specialist', level: 6, description: 'Module specific tasks, user support, KYC review', tone: 'indigo' },
  { role: 'ANALYST', label: 'Data Analyst', level: 7, description: 'Read-only financial, activity, and telemetry reporting', tone: 'neutral' },
  { role: 'user', label: 'End User', level: 7, description: 'Standard bidding, wallet, and profile participation', tone: 'green' },
];

export function isStaffRole(role?: string | null): boolean {
  if (!role) return false;
  return role !== 'user';
}

export type ApiUserPermission = {
  id: string;
  permission: string;
  granted_by?: string;
  granted_by_name?: string | null;
  created_at: string;
};


