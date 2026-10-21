import { z } from "zod"
import { STANDARD_AUCTION_CATEGORIES } from "./auctionCategories"

export const loginSchema = z.object({
  phone_number: z
    .string()
    .min(9, "Phone number must be at least 9 digits")
    .max(15, "Phone number is too long")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .max(128, "Password is too long"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long")
    .regex(/^[A-Za-z\u00C0-\u017F\s.'-]+$/, "Enter a valid name"),
  phone_number: z
    .string()
    .min(9, "Phone number must be at least 9 digits")
    .max(15, "Phone number is too long")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
})
export type RegisterValues = z.infer<typeof registerSchema>

export const depositSchema = z.object({
  amount: z
    .number({ message: "Enter a valid amount" })
    .positive("Amount must be greater than 0")
    .max(1_000_000, "Amount is too large")
    .refine((v) => Math.round(v * 100) === v * 100, "Maximum 2 decimal places"),
})
export type DepositValues = z.infer<typeof depositSchema>

export const placeBidSchema = z.object({
  amount: z
    .number({ message: "Enter a valid bid amount" })
    .positive("Bid must be greater than 0")
    .min(1.00, "Minimum bid is 1.00")
    .max(9_999_999_999.99, "Bid amount is too large")
    .refine((v) => Math.round(v * 100) === v * 100, "Maximum 2 decimal places"),
})
export type PlaceBidValues = z.infer<typeof placeBidSchema>

export const walletPinSchema = z.object({
  pin: z
    .string()
    .min(4, "PIN must be 4–6 digits")
    .max(6, "PIN must be 4–6 digits")
    .regex(/^\d+$/, "PIN must contain only digits"),
})
export type WalletPinValues = z.infer<typeof walletPinSchema>

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required").max(120, "Name is too long"),
  category: z.enum(STANDARD_AUCTION_CATEGORIES),
  current_market_price: z
    .number({ message: "Enter a valid price" })
    .positive("Price must be greater than 0")
    .max(10_000_000, "Price is too large"),
  description: z.string().max(2000, "Description is too long").optional().or(z.literal("")),
  image_urls: z.array(z.string().url("Enter valid image URLs")).max(8, "Maximum 8 images").optional(),
})
export type ProductValues = z.infer<typeof productSchema>

export const auctionSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  min_bid: z.number().min(0).optional(),
  max_bid: z.number().min(0).optional(),
}).refine((d) => new Date(d.end_time).getTime() > new Date(d.start_time).getTime(), {
  message: "End time must be after start time",
  path: ["end_time"],
})
export type AuctionValues = z.infer<typeof auctionSchema>

export function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 4) score++
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"]
  const colors = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#059669"]
  return { score, label: labels[score], color: colors[score] }
}
