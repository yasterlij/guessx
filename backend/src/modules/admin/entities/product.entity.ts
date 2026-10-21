import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "products" })
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "jsonb", nullable: true })
  image_urls: string[] | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  current_market_price: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  brand: string | null;

  @Column({ type: "jsonb", nullable: true })
  specs: Record<string, string> | null;

  @Column({ type: "varchar", length: 80, default: "Electronics" })
  category: string;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  approval_status: string;

  @Column({ type: "uuid", nullable: true })
  approved_by: string | null;

  @Column({ type: "timestamp", nullable: true })
  approved_at: Date | null;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
