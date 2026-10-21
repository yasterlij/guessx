import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { SmartImage } from "./SmartImage"

type ImageCarouselProps = {
  images: string[]
  alt?: string
  className?: string
  aspectRatio?: string
  autoPlayInterval?: number
  showThumbnails?: boolean
  onImageClick?: (index: number) => void
  overlay?: React.ReactNode
}

function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback)
  useEffect(() => { saved.current = callback }, [callback])
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => saved.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

export function ImageCarousel({
  images,
  alt = "",
  className = "",
  aspectRatio = "aspect-[4/3]",
  autoPlayInterval = 4000,
  showThumbnails = false,
  onImageClick,
  overlay,
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [direction, setDirection] = useState<"left" | "right">("right")
  const containerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const total = images.length

  const goTo = useCallback((i: number) => {
    setDirection(i > current ? "right" : "left")
    setCurrent((i + total) % total)
  }, [current, total])

  const next = useCallback(() => goTo(current + 1), [goTo, current])
  const prev = useCallback(() => goTo(current - 1), [goTo, current])

  useInterval(next, isPaused || total <= 1 ? null : autoPlayInterval)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (total <= 1) return
    setIsDragging(true)
    startX.current = e.clientX
    setDragOffset(0)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setDragOffset(e.clientX - startX.current)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (Math.abs(dragOffset) > 60) {
      if (dragOffset > 0) prev()
      else next()
    }
    setDragOffset(0)
  }

  if (!images.length) return null

  const slideStyle = (i: number) => {
    const offset = i - current
    const translateX = isDragging ? offset * 100 + (dragOffset / (containerRef.current?.offsetWidth || 1)) * 100 : offset * 100
    const isActive = i === current
    const isAdjacent = Math.abs(offset) === 1
    const scale = isActive ? 1 : isAdjacent ? 0.92 : 0.85
    const opacity = isActive ? 1 : isAdjacent ? 0.6 : 0
    const zIndex = isActive ? 2 : isAdjacent ? 1 : 0

    return {
      transform: `translateX(${translateX}%) scale(${scale})`,
      opacity,
      zIndex,
      transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
    }
  }

  const progress = ((current + 1) / total) * 100

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 select-none shadow-[0_24px_60px_rgba(0,43,92,0.18)] ring-1 ring-awash-blue/10 transition-shadow duration-300 hover:shadow-[0_30px_80px_rgba(0,43,92,0.25)] ${aspectRatio} ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      ref={containerRef}
      style={{ touchAction: "pan-y" }}
    >
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle_at_center,rgba(200,166,66,0.18),transparent_65%)] blur-2xl" />
      <div className="absolute inset-0">
        {images.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            style={slideStyle(i)}
          >
            <SmartImage
              src={src}
              alt={`${alt} ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className={onImageClick ? "cursor-zoom-in" : ""}
            />
          </div>
        ))}
      </div>

      {overlay}

      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/60 hover:scale-110 opacity-0 group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/60 hover:scale-110 opacity-0 group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i) }}
                className="transition-all duration-300"
                aria-label={`Go to image ${i + 1}`}
              >
                <div
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "bg-white w-5 h-2 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      : "bg-white/50 w-2 h-2 hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-awash-gold to-awash-gold-light transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {showThumbnails && total > 1 && (
        <div className="absolute -bottom-1 left-0 right-0 z-10 flex justify-center gap-2 px-4 py-2 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                i === current ? "border-awash-gold opacity-100 scale-110" : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              <img
                src={src}
                alt=""
                className="size-10 object-cover"
                draggable={false}
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
