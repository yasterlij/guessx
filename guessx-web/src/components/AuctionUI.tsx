import type { ButtonHTMLAttributes, ReactNode } from "react"
import { ChevronLeft, Trophy, Zap, Flame, Star, Crown, Sparkles } from "lucide-react"

// ─── GuessX Brand Logo ───────────────────────────────────────────────

export function GuessXMark({ className, size = 38 }: { className?: string; size?: number }) {
  return (
    <img
      src="/guessx_logo.svg"
      alt="GuessX logo"
      style={{ height: size }}
      className={`w-auto object-contain ${className || ""}`}
    />
  )
}

export function GuessXLogo({
  className,
  variant = "light",
  size = 38,
}: {
  className?: string
  variant?: "light" | "dark"
  size?: number
}) {
  return (
    <div className={`flex items-center ${className || ""}`}>
      <img
        src="/guessx_logo.svg"
        alt="GuessX logo"
        style={{ height: size }}
        className="w-auto object-contain"
      />
    </div>
  )
}

export const AwashMark = GuessXMark
export const AwashLogo = GuessXLogo

// ─── Buttons ─────────────────────────────────────────────────────────

export function CTAButton({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "navy" | "outline"
}) {
  const styles = {
    primary: "btn-primary",
    navy: "btn-navy",
    outline: "btn-outline",
  }[variant]

  return (
    <button
      className={`${styles} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GoldButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-primary animate-shine ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function NavyButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-navy animate-shine ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-card-solid ${className || ""}`}>
      {children}
    </div>
  )
}

export function GoldCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-gold rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(200,166,66,0.15)] hover:border-primary/40 ${className || ""}`}>
      {children}
    </div>
  )
}

// ─── Phone Status Bar ───────────────────────────────────────────────

export function PhoneStatusBar(_props?: { dark?: boolean }) {
  return null
}

// ─── App Bar ─────────────────────────────────────────────────────────

export function AppBar({
  title,
  onBack,
  right,
  variant = "navy",
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  variant?: "navy" | "light" | "gold"
}) {
  const bgStyles = {
    navy: "bg-awash-blue/90 backdrop-blur-xl text-white border-b border-white/10",
    gold: "bg-gradient-to-r from-awash-gold/90 to-awash-gold-light/90 backdrop-blur-xl text-awash-blue border-b border-primary/20",
    light: "glass-nav border-b border-border/50 text-foreground",
  }[variant]
  return (
    <div className={`flex items-center gap-2 px-4 py-3.5 ${bgStyles}`}>
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className={`flex size-8 items-center justify-center rounded-full transition-colors ${
            variant === "light" ? "hover:bg-muted" : "hover:bg-white/10 backdrop-blur-sm"
          }`}
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="w-8" />
      )}
      <h1 className="flex-1 truncate text-center font-display text-base font-bold">{title}</h1>
      <div className="flex w-8 justify-end">{right}</div>
    </div>
  )
}

// ─── Stats ───────────────────────────────────────────────────────────

export function StatBlock({
  label,
  value,
  accent,
}: {
  label: string
  value: ReactNode
  accent?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className={`font-display text-base font-extrabold ${accent ? "text-gradient-gold" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode
  tone?: "gold" | "navy" | "green" | "muted" | "blue" | "orange" | "hot" | "featured" | "premium" | "new"
  className?: string
}) {
  const tones = {
    orange: "bg-ember/10 text-ember",
    gold: "bg-primary/10 text-primary",
    navy: "bg-ink/5 text-ink",
    green: "bg-emerald-50 text-emerald-700",
    muted: "bg-canvas text-neutral-500",
    blue: "bg-ink text-white",
    hot: "bg-ember text-white",
    featured: "bg-primary/10 text-primary",
    premium: "bg-ink text-white",
    new: "bg-emerald-500 text-white",
  }[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${tones} ${className || ""}`}
    >
      {children}
    </span>
  )
}

export function HotBadge({ className }: { className?: string }) {
  return (
    <Badge tone="hot" className={className}>
      <Flame className="size-3" /> Hot
    </Badge>
  )
}

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="featured" className={className}>
      <Star className="size-3" /> Featured
    </Badge>
  )
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <Badge tone="premium" className={className}>
      <Crown className="size-3" /> Premium
    </Badge>
  )
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge tone="new" className={className}>
      <Sparkles className="size-3" /> New
    </Badge>
  )
}

export function BadgeGold({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary ${className || ""}`}
    >
      {children}
    </span>
  )
}

// ─── Countdown Pill ──────────────────────────────────────────────────

export function CountdownPill({
  time,
  urgent,
}: {
  time: { d: string; h: string; m: string; s: string }
  urgent: boolean
}) {
  return (
    <span
      className={`countdown-pill ${
        urgent
          ? "bg-ember/10 text-ember"
          : "bg-ink text-white"
      }`}
    >
      {time.d !== "00" && <>{parseInt(time.d)}d </>}
      {time.h}:{time.m}:{time.s}
    </span>
  )
}

// ─── Savings Badge ───────────────────────────────────────────────────

export function SavingsBadge({ percent }: { percent: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1">
      <Zap className="size-3 text-emerald-600" />
      <span className="text-[10px] font-bold text-emerald-600">{percent}% off</span>
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  gold,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  action?: ReactNode
  gold?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={`flex size-11 items-center justify-center rounded-2xl ${
              gold ? "bg-primary/10 text-primary" : "bg-canvas text-foreground"
            }`}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h2
            className={`font-display text-2xl font-semibold tracking-[-0.022em] ${
              gold ? "text-primary" : "text-foreground"
            }`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs font-medium text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

// ─── Winner Badge ────────────────────────────────────────────────────

export function WinnerBadge({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200">
      <Trophy className="size-4 text-primary" />
      <span>{name}</span>
      <span className="text-neutral-400">·</span>
      <span className="tabular-nums">{amount}</span>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={`h-px bg-border ${className || ""}`} />
}

// ─── Tab Item ────────────────────────────────────────────────────────

export function TabItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`tab-item flex flex-col items-center justify-center gap-1 px-3 py-2 text-[10px] font-medium transition-all duration-300 ${
        active
          ? "text-primary"
          : "text-neutral-400 hover:text-neutral-600"
      }`}
    >
      <Icon
        className={`size-5 transition-colors duration-300 ${
          active ? "text-primary" : "text-neutral-400"
        }`}
      />
      <span className="leading-none">{label}</span>
    </button>
  )
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────

export function BottomTabBar({
  items,
  activeTab,
  onTabChange,
}: {
  items: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }>
  activeTab?: string
  onTabChange?: (id: string) => void
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[88px] items-start justify-around border-t border-border bg-white pt-2 pb-safe-area-bottom">
      {items.map((item) => {
        const isActive = item.id === activeTab
        return (
          <TabItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={isActive}
            onClick={() => onTabChange?.(item.id)}
          />
        )
      })}
    </nav>
  )
}

// ─── Confetti Overlay ────────────────────────────────────────────────

export function ConfettiOverlay({ show }: { show: boolean }) {
  if (!show) return null
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${0.6 + Math.random() * 0.6}s`,
    color: i % 3 === 0 ? "#0071e3" : i % 3 === 1 ? "#1d1d1f" : "#86868b",
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute size-2 rounded-sm"
          style={{
            left: p.left,
            top: "-10px",
            backgroundColor: p.color,
            animation: `confetti ${p.duration} ${p.delay} ease-out forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}
