import { motion } from "framer-motion"
import { CheckCircle2, Package, Bike, MapPin, Home, Phone } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"


const steps = [
  { icon: CheckCircle2, title: "Order Confirmed", desc: "Payment received", done: true },
  { icon: Package, title: "Packed & Ready", desc: "GuessX fulfillment center", done: true },
  { icon: Bike, title: "Out for Delivery", desc: "Courier on the way", done: false, active: true },
  { icon: Home, title: "Delivered", desc: "Estimated today, 4:30 PM", done: false },
]

export function DeliveryScreen() {
  const { go, goBack, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-1 flex-col overflow-y-auto"
    >
      
      <AppBar title="Track Delivery" onBack={goBack} />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="flex-1 px-5 pb-20 lg:pb-6 pt-5"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="flex items-center gap-4 border-primary/30 bg-gradient-to-r from-primary/5 to-awash-gold-light/5 p-4">
            <span className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-awash-gold-light text-awash-blue shadow-lg shadow-primary/20">
              <Bike className="size-7" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-awash-blue">On its way!</p>
              <p className="text-xs font-medium text-awash-blue/70">
                Arriving today · Estimated 4:30 PM
              </p>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="mt-4 flex items-center gap-3 p-3">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-awash-blue/10 via-white to-awash-gold/10 shadow-[0_6px_18px_rgba(0,43,92,0.14)] ring-1 ring-awash-blue/10">
              <img
                src={auction.images?.[0] || "/placeholder.svg"}
                alt={auction.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-awash-blue">{auction.name}</p>
              <p className="text-xs font-medium text-neutral-400">Order #AWB-{auction.id.slice(0, 4).toUpperCase()}</p>
            </div>
          </Card>
        </motion.div>
        <motion.h2
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="mb-3 mt-6 font-display text-sm font-bold text-awash-blue"
        >
          Delivery Progress
        </motion.h2>
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          className="relative pl-2"
        >
          {steps.map((s, i) => {
            const last = i === steps.length - 1
            const active = s.active
            return (
              <motion.div
                key={s.title}
                variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {!last && (
                  <span
                    className={`absolute left-[15px] top-8 h-full w-0.5 ${s.done ? "bg-primary" : "bg-border/60"}`}
                  />
                )}
                <span
                  className={`relative z-10 flex size-8 flex-shrink-0 items-center justify-center rounded-full ${
                    s.done
                      ? "bg-gradient-to-br from-primary to-awash-gold-light text-awash-blue shadow-md"
                      : active
                      ? "bg-awash-blue text-white ring-4 ring-awash-blue/15"
                      : "bg-neutral-100 text-neutral-400"
                  }`}
                >
                  <s.icon className="size-4" />
                </span>
                <div className="pt-1">
                  <p className={`text-sm font-bold ${s.done || active ? "text-awash-blue" : "text-neutral-400"}`}>
                    {s.title}
                  </p>
                  <p className="text-xs font-medium text-neutral-400">{s.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <Card className="mt-2 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-[18px] flex-shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-bold text-awash-blue">Delivery Address</p>
                <p className="text-xs font-medium text-neutral-400">
                  Bole Sub-city, Woreda 03, Addis Ababa
                </p>
              </div>
              <button
                aria-label="Call courier"
                className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              >
                <Phone className="size-4" />
              </button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-white/90 p-4 backdrop-blur-xl lg:static">
        <CTAButton variant="navy" onClick={() => goBack()}>
          <Home className="size-[18px]" /> Back to Home
        </CTAButton>
      </div>
    </motion.div>
  )
}
