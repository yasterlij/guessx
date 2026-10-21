import { CURRENCY } from './theme'

export type AuctionStatus = 'live' | 'ending-soon' | 'closed'

export type ProductSpecs = {
  storage?: string
  ram?: string
  edition?: string
  battery?: string
  camera?: string
  osVersion?: string
  display?: string
  chipset?: string
}

export type Auction = {
  id: string
  publicCode?: string
  name: string
  category: string
  images: string[]
  marketPrice: number
  bidFee: number
  bidders: number
  uniqueBidders: number
  timeLeft: number
  endTime: string
  status: AuctionStatus
  description: string
  highlights: string[]
  specs?: ProductSpecs | null
  specSummary?: string
  totalBids: number
  minBid?: number
  maxBid?: number
  winning_bid_amount?: number | null
  winners?: { user_id: string; amount: number; name: string | null; rank: number; payment_status: string | null; payment_deadline: string | null }[]
  winnersCount?: number
  payment_status?: string | null
  payment_deadline?: string | null
  payment_deadline_hours?: number | null
  escalation_rule?: string | null
  second_winner_assigned?: boolean
}

export { CURRENCY }
export function formatETB(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  return Number(n.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCurrency(amount: number | null | undefined): string {
  return `${formatETB(amount)} ${CURRENCY}`
}

export function formatSpecSummary(specs?: ProductSpecs | null): string {
  if (!specs) return ''
  return [specs.storage, specs.ram, specs.edition].filter(Boolean).join(' | ')
}

export function getSpecEntries(specs?: ProductSpecs | null): Array<{ key: keyof ProductSpecs; label: string; value: string }> {
  if (!specs) return []
  const fields: Array<{ key: keyof ProductSpecs; label: string }> = [
    { key: 'storage', label: 'Storage' },
    { key: 'ram', label: 'RAM' },
    { key: 'edition', label: 'Edition' },
    { key: 'battery', label: 'Battery' },
    { key: 'camera', label: 'Camera' },
    { key: 'osVersion', label: 'OS Version' },
    { key: 'display', label: 'Display' },
    { key: 'chipset', label: 'Chipset' },
  ]
  return fields.map((field) => ({ ...field, value: specs[field.key] || '' })).filter((field) => field.value)
}

export function formatMaskedCurrency(mask = '••••'): string {
  return `${mask} ${CURRENCY}`
}

export function formatCountdown(totalSeconds: number): { d: string; h: string; m: string; s: string } {
  const clamped = Math.max(0, totalSeconds)
  const d = Math.floor(clamped / 86400)
  const h = Math.floor((clamped % 86400) / 3600)
  const m = Math.floor((clamped % 3600) / 60)
  const s = Math.floor(clamped % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) }
}

export type ComingSoonItem = {
  id: string
  name: string
  specSummary: string
  category: string
  marketPrice: number
  bidFee: number
  dropTime: string
  images: string[]
}

export const COMING_SOON_ITEMS: ComingSoonItem[] = [
  {
    id: 'cs-iphone-16-pro',
    name: 'Apple iPhone 16 Pro Max',
    specSummary: '512GB • Desert Titanium • A18 Pro • 48MP Fusion Camera',
    category: 'Smartphones',
    marketPrice: 265000,
    bidFee: 50,
    dropTime: 'Dropping in 2 Days',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'cs-ps5-pro',
    name: 'Sony PlayStation 5 Pro',
    specSummary: '2TB SSD • Spectral Super Resolution • 4K 120fps Ready',
    category: 'Gaming',
    marketPrice: 155000,
    bidFee: 35,
    dropTime: 'Dropping Friday',
    images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'cs-dji-mini-4-pro',
    name: 'DJI Mini 4 Pro Fly More Combo',
    specSummary: '4K/60fps HDR • Omnidirectional Sensing • 20km FHD Video',
    category: 'Electronics',
    marketPrice: 140000,
    bidFee: 30,
    dropTime: 'Dropping in 3 Days',
    images: ['https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'cs-galaxy-s25-ultra',
    name: 'Samsung Galaxy S25 Ultra',
    specSummary: '512GB • Titanium Gray • Snapdragon 8 Elite • S-Pen',
    category: 'Smartphones',
    marketPrice: 245000,
    bidFee: 50,
    dropTime: 'Dropping Next Week',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'cs-macbook-pro-m3',
    name: 'Apple MacBook Pro 16" M3 Max',
    specSummary: '36GB RAM • 1TB SSD • Liquid Retina XDR • Space Black',
    category: 'Computers',
    marketPrice: 420000,
    bidFee: 80,
    dropTime: 'Dropping in 5 Days',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'],
  },
  {
    id: 'cs-dyson-v15',
    name: 'Dyson V15 Detect Cordless Vacuum',
    specSummary: 'Laser Dust Reveal • HEPA Filtration • 60min Runtime',
    category: 'Home Appliances',
    marketPrice: 110000,
    bidFee: 25,
    dropTime: 'Dropping in 6 Days',
    images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80'],
  },
]
