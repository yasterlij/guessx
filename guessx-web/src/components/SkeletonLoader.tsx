import { useEffect, useRef, createContext, useContext } from 'react'

const ShimmerContext = createContext<number | null>(null)

export function ShimmerProvider({ children }: { children: React.ReactNode }) {
  const anim = useRef(0)

  useEffect(() => {
    let frame = 0
    const loop = () => {
      frame = (frame + 1) % 200
      anim.current = frame / 100
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }, [])

  return (
    <ShimmerContext.Provider value={anim.current}>
      {children}
    </ShimmerContext.Provider>
  )
}

function ShimmerBlock({ style }: { style?: React.CSSProperties }) {
  const anim = useContext(ShimmerContext)
  if (anim === null) return <div style={{ backgroundColor: '#e5e7eb', borderRadius: 6, ...style }} />

  const opacity = 0.3 + anim * 0.4

  return (
    <div
      style={{
        backgroundColor: '#e5e7eb',
        borderRadius: 6,
        opacity,
        transition: 'opacity 0.5s ease',
        ...style,
      }}
    />
  )
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div className="aspect-[4/3] w-full">
        <ShimmerBlock style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      </div>
      <div style={{ padding: 12, gap: 8, display: 'flex', flexDirection: 'column' }}>
        <ShimmerBlock style={{ width: '70%', height: 14 }} />
        <ShimmerBlock style={{ width: '40%', height: 12 }} />
        <ShimmerBlock style={{ width: '50%', height: 12 }} />
      </div>
    </div>
  )
}

export function SkeletonRow({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        ...style,
      }}
    >
      <ShimmerBlock style={{ width: 44, height: 44, borderRadius: 12 }} />
      <div style={{ flex: 1, gap: 6, display: 'flex', flexDirection: 'column' }}>
        <ShimmerBlock style={{ width: '60%', height: 12 }} />
        <ShimmerBlock style={{ width: '35%', height: 10 }} />
      </div>
      <ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
    </div>
  )
}

export function SkeletonStatGrid({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', gap: 12, ...style }}>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            padding: 16,
            gap: 8,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 6 }} />
          <ShimmerBlock style={{ width: '60%', height: 20 }} />
          <ShimmerBlock style={{ width: '80%', height: 12 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonBanner() {
  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: '#e5e7eb44',
        padding: 16,
        gap: 8,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ShimmerBlock style={{ width: '50%', height: 14 }} />
      <ShimmerBlock style={{ width: '80%', height: 12 }} />
    </div>
  )
}