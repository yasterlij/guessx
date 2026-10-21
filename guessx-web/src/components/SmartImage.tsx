import { useState, useEffect, useRef } from "react"
import { Gavel, ImageIcon } from "lucide-react"

type SmartImageProps = {
  src?: string
  alt: string
  className?: string
  loading?: "eager" | "lazy"
  fallbackClassName?: string
  showShimmer?: boolean
}

export function SmartImage({ src, alt, className = "", loading = "lazy", fallbackClassName = "", showShimmer = true }: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")
  const imgRef = useRef<HTMLImageElement>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setStatus("loading")
    setRetryCount(0)
  }, [src])

  useEffect(() => {
    if (imgRef.current?.complete) {
      setStatus("loaded")
    }
  }, [src])

  const handleError = () => {
    if (retryCount < 1) {
      setRetryCount(c => c + 1)
      if (imgRef.current) {
        const currentSrc = imgRef.current.src
        imgRef.current.src = ""
        setTimeout(() => { if (imgRef.current) imgRef.current.src = currentSrc }, 200)
      }
    } else {
      setStatus("error")
    }
  }

  if (!src || status === "error") {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-awash-blue/10 via-neutral-50 to-awash-gold/10 ${fallbackClassName}`}>
        <div className="flex flex-col items-center gap-2 opacity-40">
          {status === "error" ? <ImageIcon className="size-8 text-neutral-400" /> : <Gavel className="size-8 text-awash-gold-dark" />}
          <span className="text-[10px] font-medium text-neutral-400">{alt}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {status === "loading" && showShimmer && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-100 bg-[length:200%_100%]" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        onLoad={() => setStatus("loaded")}
        onError={handleError}
        className={`h-full w-full object-cover transition-all duration-700 ${
          status === "loaded" ? "opacity-100 scale-100" : "opacity-0 scale-105"
        } ${className}`}
      />
    </div>
  )
}