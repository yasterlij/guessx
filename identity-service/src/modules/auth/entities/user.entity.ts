import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export enum AuthProvider {
  LOCAL = "LOCAL",
  TELEBIRR = "TELEBIRR",
  BANKING_API = "BANKING_API",
  SUPER_APP = "SUPER_APP",
}

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 20, nullable: true, unique: true })
  phone_number: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  password_hash: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  wallet_balance: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  full_name: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  avatar_url: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  hashed_refresh_token: string | null;

  @Column({ type: "varchar", length: 20, default: AuthProvider.LOCAL })
  auth_provider: AuthProvider | string;

  @Column({ type: "varchar", length: 255, nullable: true })
  provider_id: string | null;

  @Column({ type: "boolean", default: false })
  phone_verified: boolean;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  fcm_token: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  apns_token: string | null;

  @Column({ type: "varchar", length: 20, default: UserRole.USER })
  role: UserRole | string;

  @Column({ type: "boolean", default: false })
  is_banned: boolean;

  @Column({ type: "varchar", length: 60, nullable: true })
  wallet_pin_hash: string | null;

  @Column({ type: "int", nullable: true, default: 0 })
  pin_attempts: number | null;

  @Column({ type: "timestamp", nullable: true })
  pin_locked_until: Date | null;
}
