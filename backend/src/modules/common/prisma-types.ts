export type {
  Auction,
  Bid,
  Winner,
  Product,
  PaymentTransaction,
  AuditLog,
  NotificationLog,
  User,
  Transaction,
  Favorite,
  UserPermission,
  Otp,
} from "@prisma/client";
export {
  AuctionStatus,
  PaymentGateway,
  PaymentTransactionStatus,
  PaymentType,
  TransactionType,
} from "@prisma/client";

export const In = (arr: any[]) => ({ in: arr });
export const LessThan = (val: any) => ({ lt: val });
export const LessThanOrEqual = (val: any) => ({ lte: val });
export const MoreThan = (val: any) => ({ gt: val });
export const Like = (val: string) => ({ contains: val });
export const Not = (val: any) => ({ not: val });
export const IsNull = null as any;
export const Between = (a: any, b: any) => ({ gte: a, lte: b });

export type DataSource = any;
export type EntityManager = any;
export type Repository<T = any> = any;
export type PaymentStatus = string;
export type WinnerPaymentStatus = string;

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
} as const;

export const WinnerPaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  EXPIRED: "EXPIRED",
} as const;
