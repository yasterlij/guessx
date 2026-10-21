import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { colors } from '../theme'

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

function windowedPages(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const candidates = Array.from(new Set([1, total, current - 1, current, current + 1]))
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const result: (number | '…')[] = []
  let prev = 0
  for (const p of candidates) {
    if (p - prev > 1) result.push('…')
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
  pageSizeOptions = [10, 25, 50],
}: {
  page: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  pageSizeOptions?: number[]
}) {
  if (totalItems === 0) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, totalItems)

  return (
    <View style={s.wrap}>
      <Text style={s.summary}>Showing {start}–{end} of {totalItems}</Text>

      <View style={s.controls}>
        <TouchableOpacity
          onPress={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={[s.navBtn, page <= 1 && s.disabled]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={14} color={colors.navy} />
        </TouchableOpacity>

        <View style={s.pages}>
          {windowedPages(page, totalPages).map((p, i) =>
            p === '…' ? (
              <Text key={`e-${i}`} style={s.ellipsis}>…</Text>
            ) : (
              <TouchableOpacity
                key={p}
                onPress={() => onPageChange(p)}
                style={[s.pageChip, p === page && s.pageChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.pageText, p === page && s.pageTextActive]}>{p}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <TouchableOpacity
          onPress={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={[s.navBtn, page >= totalPages && s.disabled]}
          activeOpacity={0.7}
        >
          <ChevronRight size={14} color={colors.navy} />
        </TouchableOpacity>
      </View>

      <View style={s.perPageRow}>
        {pageSizeOptions.map((o) => (
          <TouchableOpacity
            key={o}
            onPress={() => onPerPageChange(o)}
            style={[s.perPageChip, o === perPage && s.perPageChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.perPageText, o === perPage && s.perPageTextActive]}>{o} / page</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginTop: 16, gap: 10, alignItems: 'center' },
  summary: { fontSize: 11, fontWeight: '600', color: colors.mutedForeground, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.35 },
  pages: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageChip: { minWidth: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  pageChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageText: { fontSize: 11, fontWeight: '700', color: colors.navy },
  pageTextActive: { color: colors.primaryForeground },
  ellipsis: { fontSize: 11, color: colors.mutedForeground, paddingHorizontal: 2 },
  perPageRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  perPageChip: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 4 },
  perPageChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  perPageText: { fontSize: 10, fontWeight: '600', color: colors.mutedForeground },
  perPageTextActive: { color: colors.navyForeground },
})
