import { useState, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  LayoutGrid,
  ChevronDown,
  Smartphone,
  Laptop,
  Tv,
  Headphones,
  Gamepad2,
  Tablet,
  Sparkles,
  Car,
  Shirt,
  Check,
} from "lucide-react"
import { useApp } from "../AppContext"
import { STANDARD_AUCTION_CATEGORIES } from "../lib/auctionCategories"

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Smartphones: Smartphone,
  Computers: Laptop,
  Electronics: Tv,
  Audio: Headphones,
  Gaming: Gamepad2,
  Tablets: Tablet,
  Appliances: Sparkles,
  Cars: Car,
  Clothes: Shirt,
}

export function CategoriesNavDropdown() {
  const { auctions, selectedCategory, selectCategory, view } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const liveAuctions = auctions.filter((a) => a.status !== "closed")
  const totalCount = liveAuctions.length
  const isCategoryViewActive = view === "auctions" && selectedCategory !== "All"

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`nav-btn flex items-center gap-1.5 cursor-pointer ${
          isOpen || isCategoryViewActive ? "active" : ""
        }`}
      >
        <LayoutGrid className="size-4" />
        <span>Categories</span>
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-border/70 bg-white/95 backdrop-blur-xl p-2 shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Browse Categories
            </div>

            <button
              type="button"
              onClick={() => {
                selectCategory("All")
                setIsOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                view === "auctions" && selectedCategory === "All"
                  ? "bg-awash-blue text-white font-semibold shadow-xs"
                  : "text-foreground hover:bg-cool-wash font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutGrid
                  className={`size-4 ${
                    view === "auctions" && selectedCategory === "All"
                      ? "text-white"
                      : "text-neutral-500"
                  }`}
                />
                <span>All Categories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    view === "auctions" && selectedCategory === "All"
                      ? "bg-white/20 text-white"
                      : "bg-canvas text-neutral-500"
                  }`}
                >
                  {totalCount}
                </span>
                {view === "auctions" && selectedCategory === "All" && (
                  <Check className="size-3.5 text-white" />
                )}
              </div>
            </button>

            <div className="my-1.5 h-px bg-border/40" />

            <div className="flex flex-col gap-0.5">
              {STANDARD_AUCTION_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat] || LayoutGrid
                const count = liveAuctions.filter((a) => a.category === cat).length
                const isSelected = view === "auctions" && selectedCategory === cat

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      selectCategory(cat)
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-awash-blue text-white font-semibold shadow-xs"
                        : "text-foreground hover:bg-cool-wash font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`size-4 ${
                          isSelected ? "text-white" : "text-neutral-500"
                        }`}
                      />
                      <span>{cat}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {count > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-canvas text-neutral-500"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      {isSelected && <Check className="size-3.5 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
