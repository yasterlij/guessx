import { useState, useMemo, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export const PER_PAGE_OPTIONS = [10, 20, 50]

export function usePagination<T>(items: T[], defaultPerPage = 10) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPerPage)
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginated = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage],
  )

  const resetPage = useCallback(() => setPage(1), [])

  return { page, setPage, perPage, setPerPage, totalPages, paginated, resetPage }
}

export function windowedPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const candidates = Array.from(new Set([1, total, current - 1, current, current + 1]))
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const result: (number | "…")[] = []
  let prev = 0
  for (const p of candidates) {
    if (p - prev > 1) result.push("…")
    result.push(p)
    prev = p
  }
  return result
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) {
  if (totalItems === 0) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, totalItems)

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs font-medium text-neutral-400 tabular-nums">
        Showing {start}–{end} of {totalItems}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-white/80 text-awash-blue transition-all hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed active:scale-95"
        >
          <ChevronLeft className="size-4" />
        </button>

        {windowedPages(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs font-medium text-neutral-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-95 ${
                p === page
                  ? "bg-gradient-to-r from-awash-gold to-awash-gold-light text-awash-blue shadow-md shadow-primary/20"
                  : "border border-border/60 bg-white/80 text-awash-blue hover:bg-white"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-white/80 text-awash-blue transition-all hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed active:scale-95"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <select
        value={perPage}
        onChange={(e) => onPerPageChange(Number(e.target.value))}
        aria-label="Items per page"
        className="rounded-lg border border-border/60 bg-white/80 px-2 py-1.5 text-xs font-semibold text-awash-blue outline-none transition-all focus:border-awash-gold focus:bg-white"
      >
        {PER_PAGE_OPTIONS.map((o) => (
          <option key={o} value={o}>{o} / page</option>
        ))}
      </select>
    </div>
  )
}
