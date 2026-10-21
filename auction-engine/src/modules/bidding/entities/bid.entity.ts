import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Auction } from "../../winner/entities/auction.entity";

@Entity({ name: "bids" })
export class Bid {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "uuid" })
  auction_id: string;

  @ManyToOne(() => Auction, { onDelete: "CASCADE" })
  @JoinColumn({ name: "auction_id" })
  auction?: Auction;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn({ name: "bid_time" })
  bid_time: Date;

  @Column({ type: "boolean", default: true })
  service_fee_paid: boolean;

  @Column({ type: "varchar", default: "" })
  ticket_number: string;

  @Column({ type: "text", default: "" })
  encrypted_amount: string;
}
