export enum AppRole {
  CEO = 'CEO',
  CXO = 'CXO',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  EXPERT = 'EXPERT',
  SPECIALIST = 'SPECIALIST',
  ANALYST = 'ANALYST',
  ADMIN = 'admin',
  USER = 'user',
}

export enum AppAction {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  SETTLE = 'settle',
  ROTATE = 'rotate',
  EXTEND = 'extend',
  CONFIRM = 'confirm',
  FORCE_CLOSE = 'force-close',
  DRAW_WINNER = 'draw-winner',
  BAN = 'ban',
  GRANT = 'grant',
  REVOKE = 'revoke',
}

export enum AppSubject {
  ALL = 'all',
  USER = 'User',
  AUCTION = 'Auction',
  BID = 'Bid',
  PRODUCT = 'Product',
  PAYMENT = 'Payment',
  WINNER = 'Winner',
  WALLET = 'Wallet',
  TRANSACTION = 'Transaction',
  NOTIFICATION = 'Notification',
  AUDIT_LOG = 'AuditLog',
  SETTLEMENT = 'Settlement',
  ANALYTICS = 'Analytics',
  DISPUTE = 'Dispute',
  PERMISSION = 'Permission',
  DIVISION = 'Division',
  DEPARTMENT = 'Department',
  SECTION = 'Section',
  FAVORITE = 'Favorite',
  OTP = 'Otp',
}

export interface UserContext {
  id: string;
  role: AppRole | string;
  division_id?: string | null;
  department_id?: string | null;
  section_id?: string | null;
}

export const ROLE_LEVELS: Record<string, number> = {
  [AppRole.CEO]: 1,
  [AppRole.ADMIN]: 1,
  [AppRole.CXO]: 2,
  [AppRole.DIRECTOR]: 3,
  [AppRole.MANAGER]: 4,
  [AppRole.EXPERT]: 5,
  [AppRole.SPECIALIST]: 6,
  [AppRole.ANALYST]: 7,
  [AppRole.USER]: 7,
};

export function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role] ?? 99;
}

export function canAccessLevel(userRole: string, requiredRole: string): boolean {
  return getRoleLevel(userRole) <= getRoleLevel(requiredRole);
}