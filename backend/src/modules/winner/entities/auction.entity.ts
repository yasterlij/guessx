import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Product } from "../../admin/entities/product.entity";

export enum AuctionStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  EXPIRED = "EXPIRED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  EXPIRED = "EXPIRED",
}

@Entity({ name: "auctions" })
export class Auction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  product_id: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product?: Product;

  @Column({ type: "timestamp" })
  start_time: Date;

  @Column({ type: "timestamp" })
  end_time: Date;

  @Column({ type: "enum", enum: AuctionStatus, default: AuctionStatus.ACTIVE })
  status: AuctionStatus;

  @Column({ type: "uuid", nullable: true })
  winner_user_id: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  winning_bid_amount: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  min_bid: number | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  max_bid: number | null;

  @Column({ type: "int", nullable: true, default: 1 })
  num_winners: number | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  payment_status: PaymentStatus | null;

  @Column({ type: "timestamp", nullable: true })
  payment_deadline: Date | null;

  @Column({ type: "timestamp", nullable: true })
  last_payment_update: Date | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @Column({ type: "int", default: 0 })
  extensions: number;

  @Column({ type: "varchar", length: 5, nullable: true })
  public_code: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  bid_fee: number | null;

  @Column({ type: "boolean", default: false })
  second_winner_assigned: boolean;

  @Column({ type: "int", default: 720, nullable: true })
  payment_deadline_hours: number | null;

  @Column({ type: "varchar", length: 50, default: "LOWEST_UNIQUE_BID" })
  escalation_rule: string;
}
