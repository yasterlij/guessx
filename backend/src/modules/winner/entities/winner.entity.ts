import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Auction } from "./auction.entity";

export enum WinnerPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  EXPIRED = "EXPIRED",
}

@Entity({ name: "winners" })
export class Winner {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  auction_id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @ManyToOne(() => Auction, { onDelete: "CASCADE" })
  @JoinColumn({ name: "auction_id" })
  auction?: Auction;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "int", default: 1 })
  rank: number;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  payment_status: WinnerPaymentStatus | string;

  @Column({ type: "timestamp", nullable: true })
  payment_deadline: Date | null;

  @Column({ type: "timestamp", nullable: true })
  notified_at: Date | null;

  @CreateDateColumn({ name: "created_at", nullable: true })
  created_at: Date | null;
}
