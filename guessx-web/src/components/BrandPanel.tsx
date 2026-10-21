import { Gift, ShieldCheck, Zap, PiggyBank, Trophy } from "lucide-react"
import { GuessXLogo } from "./AuctionUI"

const reasons = [
  { icon: Gift, text: "Win premium products for the lowest price" },
  { icon: ShieldCheck, text: "Fair & transparent — lowest unique bid wins" },
  { icon: Zap, text: "Simple, secure and trusted payments" },
  { icon: PiggyBank, text: "Big savings, big rewards" },
]

export function BrandPanel({ className }: { className?: string }) {
  return (
    <aside className={`flex-1 flex-col justify-center text-navy-foreground ${className || ""}`}>
      <div className="rounded-3xl bg-white/95 px-6 py-4 shadow-lg w-fit">
        <GuessXLogo variant="light" size={46} />
      </div>
      <h1 className="mt-10 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-balance">
        Guess X Auctions
      </h1>
      <p className="mt-5 max-w-md text-lg font-medium text-white/70 text-pretty">
        Bid Low. Be Unique. Win Big! Place the lowest unique bid.
      </p>
      <div className="mt-9 inline-flex items-center gap-3 rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/30 w-fit">
        <Trophy className="size-6" />
        <span className="font-display text-lg font-bold">You Win. You Pay Low. You Enjoy Big.</span>
      </div>
      <ul className="mt-10 grid max-w-lg grid-cols-2 gap-4">
        {reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
              <r.icon className="size-[18px] text-primary" />
            </span>
            <span className="text-sm font-medium leading-snug text-white/80">{r.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm font-medium text-white/50">
        Guess X — Secure. Simple. Rewarding.
      </p>
    </aside>
  )
}
