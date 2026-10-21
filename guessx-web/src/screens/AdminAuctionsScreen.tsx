import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Pencil,
  XCircle,
  Trash2,
  Eye,
  ImageIcon,
  Filter,
  Search,
  Upload,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  Camera,
  Link,
  Trophy,
  PartyPopper,
} from "lucide-react";
import { useApp } from "../AppContext";
import { api } from "../api";
import { AdminLayout } from "../components/AdminLayout";
import { CTAButton, Badge, Card } from "../components/AuctionUI";
import { usePagination, PaginationBar } from "../components/Pagination";
import { STANDARD_AUCTION_CATEGORIES } from "../lib/auctionCategories";
import { EMPTY_PRODUCT_SPECS as emptySpecs } from "../lib/productSpecs";
import { formatCurrency, formatETB, formatMaskedCurrency } from "../mockDataV0";
import type { Auction, ProductSpecs } from "../mockDataV0";

function AuctionThumb({
  src,
  alt,
  onClick,
}: {
  src?: string;
  alt?: string;
  onClick?: () => void;
}) {
  const [err, setErr] = useState(false);
  const hasSrc =
    src &&
    (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/"));
  if (err || !hasSrc) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50">
        <ImageIcon className="size-5 text-neutral-300/30" />
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className="size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100"
    >
      <img
        src={src}
        alt={alt ?? "Product image"}
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
        className="h-full w-full object-cover"
      />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { tone: "green" | "orange" | "muted"; label: string }
  > = {
    live: { tone: "green", label: "Live" },
    "ending-soon": { tone: "orange", label: "Ending Soon" },
    closed: { tone: "muted", label: "Closed" },
  };
  const s = map[status] || { tone: "muted" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function BidChart({ amounts, total }: { amounts: number[]; total: number }) {
  const buckets = useMemo(() => {
    if (amounts.length === 0) return [];
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const range = max - min || 1;
    const count = Math.min(8, amounts.length);
    const bucketSize = range / count;
    const result = Array.from({ length: count }, (_, i) => {
      const start = min + i * bucketSize;
      return { label: formatCurrency(Math.round(start)), count: 0 };
    });
    amounts.forEach((a) => {
      const idx = Math.min(Math.floor((a - min) / bucketSize), count - 1);
      result[idx].count++;
    });
    return result;
  }, [amounts]);

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <BarChart3 className="size-3" /> Bid Distribution
      </div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {buckets.map((b, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
          >
            <div className="mb-0.5 text-[8px] font-bold text-awash-blue opacity-0 transition-opacity group-hover:opacity-100">
              {b.count}
            </div>
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-awash-gold/60 to-awash-gold-light/40 transition-all hover:from-awash-gold/80"
              style={{
                height: `${(b.count / maxCount) * 100}%`,
                minHeight: b.count > 0 ? 4 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[7px] text-neutral-400">
        <span>{buckets[0]?.label || ""}</span>
        <span>{buckets[buckets.length - 1]?.label || ""}</span>
      </div>
    </div>
  );
}

function ImageUploadBox({
  src,
  onFile,
  onClear,
}: {
  src: string;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [err, setErr] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20 overflow-hidden rounded-xl border-2 border-dashed border-border bg-neutral-100 transition-colors hover:border-awash-gold/40">
        {src && !err ? (
          <img
            src={src}
            alt="Preview"
            loading="lazy"
            decoding="async"
            onError={() => setErr(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Camera className="size-5 text-neutral-400/40" />
            <span className="text-[8px] font-medium text-neutral-400/40">
              Upload
            </span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {src && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setErr(false);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-white shadow"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-neutral-100 px-3 py-1.5 text-[10px] font-semibold text-awash-blue transition-colors hover:border-awash-gold/40 hover:bg-awash-gold/5"
      >
        <Upload className="size-3.5" /> Browse & Upload
      </button>
      <button
        onClick={() => setShowUrlInput(!showUrlInput)}
        className="flex items-center gap-1 text-[9px] font-semibold text-neutral-400 hover:text-awash-gold"
      >
        <Link className="size-3" /> {showUrlInput ? "Hide URL" : "Paste URL"}
      </button>
      {showUrlInput && (
        <div className="flex w-full gap-1">
          <input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://..."
            className="min-w-0 flex-1 rounded-lg border border-border bg-neutral-100 px-2 py-1 text-[10px] outline-none focus:border-awash-gold"
          />
          <button
            onClick={() => {
              if (urlValue) {
                onFile(urlValue);
                setUrlValue("");
              }
            }}
            className="rounded-lg bg-awash-gold px-2 py-1 text-[9px] font-semibold text-awash-blue"
          >
            Set
          </button>
        </div>
      )}
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-6" />
      </button>
      <img
        src={src}
        alt={alt ?? "Product image preview"}
        loading="lazy"
        decoding="async"
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyForm: {
  name: string;
  category: string;
  marketPrice: string;
  bidFee: string;
  description: string;
  highlights: string;
  specText: string;
  imageUrl: string;
  startTime: string;
  endTime: string;
  minBid: string;
  maxBid: string;
} = {
  name: "",
  category: STANDARD_AUCTION_CATEGORIES[0],
  marketPrice: "",
  bidFee: "10",
  description: "",
  highlights: "",
  specText: "",
  imageUrl: "",
  startTime: "",
  endTime: "",
  minBid: "",
  maxBid: "",
};

export function AdminAuctionsScreen() {
  const {
    go,
    auctions,
    addAuction,
    updateAuction,
    deleteAuction,
    closeAuction,
  } = useApp();
  const now = new Date();
  const defaultStart = toDatetimeLocal(now);
  const defaultEnd = toDatetimeLocal(new Date(now.getTime() + 7 * 86400000));
  const defaultStartISO = now.toISOString();
  const defaultEndISO = new Date(now.getTime() + 7 * 86400000).toISOString();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewBidsId, setViewBidsId] = useState<string | null>(null);
  const [bidsByAuction, setBidsByAuction] = useState<
    Record<
      string,
      {
        amount: number;
        user_id?: string;
        user_name?: string | null;
        bid_time?: string;
        ticket_number?: string;
      }[]
    >
  >({});
  const [bidsLoading, setBidsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [form, setForm] = useState({
    ...emptyForm,
    startTime: defaultStart,
    endTime: defaultEnd,
  });
  const [submitting, setSubmitting] = useState(false);
  const [imgPreviewErr, setImgPreviewErr] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [drawingWinner, setDrawingWinner] = useState<string | null>(null);
  const [winnerResult, setWinnerResult] = useState<{
    auctionId: string;
    winnerName?: string;
    winnerUserId?: string | null;
    amount?: number | null;
  } | null>(null);

  useEffect(() => {
    if (!viewBidsId) return;
    setBidsLoading(true);
    api
      .getAuctionBids(viewBidsId)
      .then((bids) =>
        setBidsByAuction((prev) => ({ ...prev, [viewBidsId]: bids })),
      )
      .catch(() => setBidsByAuction((prev) => ({ ...prev, [viewBidsId]: [] })))
      .finally(() => setBidsLoading(false));
  }, [viewBidsId]);

  const resetForm = () => {
    setForm({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd });
    setImgPreviewErr(false);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: Auction) => {
    setEditingId(a.id);
    const startDate = a.endTime
      ? new Date(new Date(a.endTime).getTime() - 7 * 86400000)
      : now;
    const endDate = a.endTime
      ? new Date(a.endTime)
      : new Date(now.getTime() + 7 * 86400000);
    setForm({
      name: a.name,
      category: a.category,
      marketPrice: String(a.marketPrice),
      bidFee: a.bidFee != null ? String(a.bidFee) : "10",
      description: a.description,
      highlights: a.highlights.join(", "),
      specText: Object.keys(emptySpecs)
        .map((key) => (a.specs || {})[key as keyof ProductSpecs])
        .filter(Boolean)
        .join(", "),
      imageUrl: a.images?.[0] || "",
      startTime: toDatetimeLocal(startDate),
      endTime: toDatetimeLocal(endDate),
      minBid: a.minBid != null ? String(a.minBid) : "",
      maxBid: a.maxBid != null ? String(a.maxBid) : "",
    });
    setImgPreviewErr(false);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setSubmitting(true);
    const highlights = form.highlights
      ? form.highlights
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    const specValues = form.specText
      ? form.specText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const minBid = form.minBid ? Number(form.minBid) : undefined;
    const maxBid = form.maxBid ? Number(form.maxBid) : undefined;
    const base = {
      name: form.name,
      category: form.category,
      marketPrice: Number(form.marketPrice || 0),
      description: form.description,
      highlights,
      specs: Object.fromEntries(
        Object.keys(emptySpecs)
          .map((key, i) => [key, specValues[i]])
          .filter(([, value]) => value),
      ),
      ...(form.imageUrl ? { images: [form.imageUrl] } : {}),
      ...(form.startTime
        ? { startTime: new Date(form.startTime).toISOString() }
        : {}),
      ...(form.endTime
        ? { endTime: new Date(form.endTime).toISOString() }
        : {}),
      ...(minBid != null ? { minBid } : {}),
      ...(maxBid != null ? { maxBid } : {}),
      ...(form.bidFee ? { bidFee: Number(form.bidFee) } : {}),
    };
    if (editingId) {
      await updateAuction(editingId, base);
    } else {
      await addAuction({
        ...base,
        bidFee: Number(form.bidFee),
        startTime: base.startTime || defaultStartISO,
        endTime: base.endTime || defaultEndISO,
      });
    }
    setSubmitting(false);
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this auction permanently?"))
      await deleteAuction(id);
  };

  const handleClose = async (id: string) => {
    if (window.confirm("Close this auction early?")) await closeAuction(id);
  };

  const handleDrawWinner = async (id: string, name: string) => {
    setDrawingWinner(id);
    setWinnerResult(null);
    try {
      const result = await api.drawWinner(id);
      setWinnerResult({
        auctionId: id,
        winnerName: result.winner_name ?? undefined,
        winnerUserId: result.winner_user_id,
        amount: result.winning_bid_amount,
      });
    } catch {
      setWinnerResult({
        auctionId: id,
        winnerName: undefined,
        winnerUserId: null,
        amount: undefined,
      });
    }
    setDrawingWinner(null);
  };

  const filtered = auctions.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });
  const activeCount = auctions.filter((a) => a.status !== "closed").length;
  const {
    page,
    setPage,
    perPage,
    setPerPage,
    totalPages,
    paginated,
    resetPage,
  } = usePagination(filtered, 10);

  return (
    <AdminLayout
      title="Auction Management"
      subtitle={`${auctions.length} auctions · ${activeCount} active`}
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
        >
          <Plus className="size-3.5" /> Create
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.04 } },
        }}
        className="space-y-4"
      >
        {lightboxImg && (
          <ImageLightbox
            src={lightboxImg}
            onClose={() => setLightboxImg(null)}
          />
        )}

        <motion.div
          variants={{
            hidden: { opacity: 0, y: -8 },
            visible: { opacity: 1, y: 0 },
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search auctions..."
              className="w-full rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm py-2 pl-8 pr-3 text-xs font-medium outline-none transition-all placeholder:text-neutral-400/50 focus:border-awash-gold focus:bg-white focus:shadow-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            className="rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-awash-blue outline-none transition-all focus:border-awash-gold focus:bg-white"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="ending-soon">Ending Soon</option>
            <option value="closed">Closed</option>
          </select>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              key="auction-form"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="mb-4 space-y-3 border border-awash-gold/20 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-awash-blue">
                    {editingId ? "Edit Auction" : "New Auction"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="rounded-lg p-1 transition-colors hover:bg-neutral-100"
                  >
                    <X className="size-4 text-neutral-400" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-3">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Product name"
                      className="input-full"
                    />
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="input-full"
                    >
                      {STANDARD_AUCTION_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUploadBox
                      src={form.imageUrl}
                      onFile={(dataUrl) => {
                        setForm((f) => ({ ...f, imageUrl: dataUrl }));
                        setImgPreviewErr(false);
                      }}
                      onClear={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    />
                  </div>
                </div>

                <input
                  value={form.bidFee}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bidFee: e.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1")
                        .replace(/(\.\d{2})\d+/g, "$1"),
                    }))
                  }
                  placeholder="Bid Amount"
                  className="input-full"
                />
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">
                      Min Bids (optional)
                    </span>
                    <input
                      value={form.minBid}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          minBid: e.target.value
                            .replace(/[^\d.]/g, "")
                            .replace(/(\..*)\./g, "$1")
                            .replace(/(\.\d{2})\d+/g, "$1"),
                        }))
                      }
                      placeholder="e.g. 5"
                      className="input-full"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">
                      Max Bids (optional)
                    </span>
                    <input
                      value={form.maxBid}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maxBid: e.target.value
                            .replace(/[^\d.]/g, "")
                            .replace(/(\..*)\./g, "$1")
                            .replace(/(\.\d{2})\d+/g, "$1"),
                        }))
                      }
                      placeholder="e.g. 100"
                      className="input-full"
                    />
                  </label>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Description"
                  className="input-full"
                  rows={2}
                />
                <input
                  value={form.highlights}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, highlights: e.target.value }))
                  }
                  placeholder="Highlights (comma separated)"
                  className="input-full"
                />
                <input
                  value={form.specText}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, specText: e.target.value }))
                  }
                  placeholder="Product specs (comma separated)"
                  className="input-full"
                />
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">
                      Start
                    </span>
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, startTime: e.target.value }))
                      }
                      className="input-full"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">
                      End
                    </span>
                    <input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, endTime: e.target.value }))
                      }
                      className="input-full"
                    />
                  </label>
                </div>
                <CTAButton
                  onClick={handleSubmit}
                  disabled={submitting || !form.name}
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Auction"
                      : "Create Auction"}
                </CTAButton>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="mb-3 flex items-center justify-between"
        >
          <p className="text-xs font-semibold text-neutral-400">
            {filtered.length} of {auctions.length} auctions
          </p>
          <div className="flex gap-1.5">
            <Badge tone="green">
              {
                auctions.filter(
                  (a) => a.status === "live" || a.status === "ending-soon",
                ).length
              }{" "}
              active
            </Badge>
            <Badge tone="muted">
              {auctions.filter((a) => a.status === "closed").length} closed
            </Badge>
          </div>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Filter className="size-8 opacity-30" />
            <p className="text-sm font-medium">No matching auctions</p>
            {search || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="text-xs font-semibold text-awash-gold transition-colors hover:text-awash-gold-dark"
              >
                Clear filters
              </button>
            ) : (
              <p className="text-xs">Click "Create Auction" to get started</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="flex flex-col gap-2"
          >
            {paginated.map((a: Auction) => {
              const bids =
                viewBidsId === a.id ? (bidsByAuction[a.id] ?? []) : [];
              const isEncrypted = bids.some((b: any) => b.amount_encrypted);
              const bidAmounts = isEncrypted ? [] : bids.map((b) => b.amount);
              const avgBid =
                bidAmounts.length > 0
                  ? Math.round(
                      bidAmounts.reduce((s, v) => s + v, 0) / bidAmounts.length,
                    )
                  : 0;
              const isClosed = a.status === "closed";
              return (
                <motion.div
                  key={a.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:border-awash-gold/20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]">
                    <AuctionThumb
                      src={a.images?.[0]}
                      onClick={() =>
                        a.images?.[0] && setLightboxImg(a.images[0])
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-awash-blue">
                          {a.name}
                        </p>
                        {a.publicCode && (
                          <Badge tone="green">Code {a.publicCode}</Badge>
                        )}
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-neutral-400">
                        {a.bidders} bidders · {formatCurrency(a.marketPrice)}
                        {bidAmounts.length > 0 && (
                          <span className="ml-2">
                            · Avg bid {formatCurrency(avgBid)}
                          </span>
                        )}
                        {a.specSummary && (
                          <span className="ml-2">· {a.specSummary}</span>
                        )}
                        {a.minBid && (
                          <span className="ml-2">· Min {a.minBid}</span>
                        )}
                        {a.maxBid && (
                          <span className="ml-2">· Max {a.maxBid}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {isClosed ? (
                        <button
                          onClick={() => handleDrawWinner(a.id, a.name)}
                          disabled={drawingWinner === a.id}
                          className="flex items-center gap-1 rounded-lg bg-awash-gold/10 border border-awash-gold/30 px-2.5 py-1.5 text-[10px] font-semibold text-awash-gold-dark hover:bg-awash-gold/20 transition-colors disabled:opacity-50"
                          title="Draw Winner"
                        >
                          {drawingWinner === a.id ? (
                            "..."
                          ) : (
                            <>
                              <Trophy className="size-3" /> Winner
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => openEdit(a)}
                          className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[10px] font-semibold text-awash-blue hover:bg-neutral-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="size-3" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setViewBidsId(viewBidsId === a.id ? null : a.id)
                        }
                        className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[10px] font-semibold text-awash-blue hover:bg-neutral-50 transition-colors"
                        title="View bids"
                      >
                        <Eye className="size-3" />
                      </button>
                      {!isClosed && (
                        <button
                          onClick={() => handleClose(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Close early"
                        >
                          <XCircle className="size-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {winnerResult && winnerResult.auctionId === a.id && (
                    <div className="mx-2 mb-2 -mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-inner animate-scale-in">
                      <div className="flex items-center gap-2">
                        <PartyPopper className="size-4 text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-800">
                          Winner Result
                        </p>
                      </div>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {winnerResult.winnerName
                          ? `Winner: ${winnerResult.winnerName}${winnerResult.winnerUserId ? ` (User ${winnerResult.winnerUserId.slice(0, 8)})` : ""}${winnerResult.amount ? ` — ${formatCurrency(winnerResult.amount)}` : ""}`
                          : "No unique winner found for this auction."}
                      </p>
                    </div>
                  )}

                  {viewBidsId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="-mt-2 mb-2 mx-2 rounded-2xl border border-border/60 bg-gradient-to-br from-neutral-50 to-white p-3 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-[11px] font-bold text-awash-blue">
                          <Eye className="size-3.5" /> Bids ({bids.length})
                        </p>
                        {bidAmounts.length > 1 && (
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <span className="flex items-center gap-1">
                              <TrendingDown className="size-3" /> Min:{" "}
                              {formatCurrency(Math.min(...bidAmounts))}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="size-3" /> Max:{" "}
                              {formatCurrency(Math.max(...bidAmounts))}
                            </span>
                          </div>
                        )}
                      </div>

                      {bids.length > 1 && (
                        <BidChart amounts={bidAmounts} total={bids.length} />
                      )}

                      {bidsLoading && bids.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-neutral-400">
                          Loading bids…
                        </p>
                      ) : bids.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-neutral-400">
                          No bids placed yet
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-col gap-1">
                          {bids.map((b, i) => {
                            const coded = b.user_id
                              ? `User ${b.user_id.slice(0, 8)}`
                              : "Anonymous";
                            const display = b.user_name
                              ? `${b.user_name} (${coded})`
                              : coded;
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1.5"
                              >
                                <span className="flex items-center gap-2 text-[10px] font-medium text-neutral-400">
                                  <span className="flex size-4 items-center justify-center rounded-full bg-awash-blue/10 text-[8px] font-bold text-awash-blue/60">
                                    {i + 1}
                                  </span>
                                  {display}
                                </span>
                                <span className="text-[11px] font-bold text-awash-blue">
                                  {(b as any).amount_encrypted
                                    ? formatMaskedCurrency()
                                    : formatCurrency(b.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </motion.div>
    </AdminLayout>
  );
}
