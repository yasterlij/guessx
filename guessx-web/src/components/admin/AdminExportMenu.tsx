import { useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"

export function AdminExportMenu({
  onExportCsv,
  onExportXlsx,
  onExportPdf,
  loading = false,
  label = "Export",
  className = "",
}: {
  onExportCsv?: () => void | Promise<void>
  onExportXlsx?: () => void | Promise<void>
  onExportPdf?: () => void | Promise<void>
  loading?: boolean
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  const handleAction = async (fn?: () => void | Promise<void>) => {
    if (!fn) return
    setOpen(false)
    await fn()
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-neutral-50 shadow-sm transition-all disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <Download className="size-3.5 text-neutral-500" />
        )}
        <span>{label}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-border/80 bg-white p-1 shadow-xl">
            {onExportCsv && (
              <button
                type="button"
                onClick={() => handleAction(onExportCsv)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-50"
              >
                <Download className="size-3.5 text-neutral-500" />
                <span>Export CSV</span>
              </button>
            )}
            {onExportXlsx && (
              <button
                type="button"
                onClick={() => handleAction(onExportXlsx)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-50"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                <span>Export Excel (XLSX)</span>
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => handleAction(onExportPdf)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-neutral-50"
              >
                <FileText className="size-3.5 text-rose-600" />
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
