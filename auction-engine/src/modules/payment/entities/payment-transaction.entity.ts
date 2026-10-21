import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum PaymentTransactionStatus {
  PENDING = "PENDING",
  SUCCESSFUL = "SUCCESSFUL",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  REVOKED = "REVOKED",
}

export enum PaymentGateway {
  SIKINAPAY = "SIKINAPAY",
  AWASH = "AWASH",
}

export enum PaymentType {
  BID_FEE = "BID_FEE",
  WINNING_BID = "WINNING_BID",
  WALLET = "WALLET",
}

@Entity({ name: "payment_transactions" })
export class PaymentTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  auction_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 128 })
  client_reference_id: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  sikina_payment_reference_id: string | null;

  @Column({ type: "varchar", nullable: true })
  sikina_payment_url: string | null;

  @Column({ type: "varchar", nullable: true })
  awash_payment_url: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  awash_transaction_id: string | null;

  @Column({
    type: "enum",
    enum: PaymentGateway,
    default: PaymentGateway.SIKINAPAY,
  })
  gateway: PaymentGateway;

  @Column({ type: "varchar", length: 50, nullable: true })
  customer_phone: string | null;

  @Column({
    type: "enum",
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status: PaymentTransactionStatus;

  @Column({ type: "varchar", nullable: true })
  currency: string | null;

  @Column({ type: "jsonb", nullable: true })
  webhook_payload: Record<string, any> | null;

  @Column({
    type: "enum",
    enum: PaymentType,
    default: PaymentType.WINNING_BID,
  })
  payment_type: PaymentType;

  @Column({ type: "int", default: 0 })
  retry_count: number;

  @Column({ type: "varchar", length: 512, default: "" })
  encrypted_amount: string;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;
}
