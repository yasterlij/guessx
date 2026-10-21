import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  BID_FEE = "BID_FEE",
  REFUND = "REFUND",
}

@Entity({ name: "transactions" })
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "enum", enum: TransactionType })
  type: TransactionType;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference_id: string | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
