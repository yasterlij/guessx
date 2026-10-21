import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Camera,
  Link,
  Upload,
  ImageIcon,
  Filter,
  DollarSign,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { useApp } from "../AppContext";
import { api, type ApiProduct } from "../api";
import { AdminLayout } from "../components/AdminLayout";
import { CTAButton, Badge, Card } from "../components/AuctionUI";
import { usePagination, PaginationBar } from "../components/Pagination";
import {
  STANDARD_AUCTION_CATEGORIES,
  normalizeAuctionCategory,
} from "../lib/auctionCategories";
import {
  SPEC_FIELDS as specFields,
  EMPTY_PRODUCT_SPECS as emptySpecs,
} from "../lib/productSpecs";
import { formatCurrency, formatETB, formatSpecSummary } from "../mockDataV0";
type ProductForm = {
  name: string;
  category: string;
  price: string;
  description: string;
  imageUrl: string;
} & Record<keyof typeof emptySpecs, string>;

function getProductCategory(product: {
  category?: string | null;
  name?: string | null;
}) {
  return normalizeAuctionCategory(product.category, product.name);
}

function ProductThumb({
  src,
  onClick,
}: {
  src?: string;
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
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
        className="h-full w-full object-cover"
      />
    </button>
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

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
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
        alt=""
        loading="lazy"
        decoding="async"
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const emptyForm: ProductForm = {
  name: "",
  category: STANDARD_AUCTION_CATEGORIES[0],
  price: "",
  description: "",
  imageUrl: "",
  ...emptySpecs,
};

export function AdminProductsScreen() {
  const { go, auctions } = useApp();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listProducts(1, 500);
      const list = (res as any).data || res || [];
      setProducts(list);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) || "Failed to load products");
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      category: getProductCategory(p),
      price: String(p.current_market_price || ""),
      description: p.description || "",
      imageUrl: (p.image_urls || [])[0] || "",
      ...emptySpecs,
      ...(p.specs || {}),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) return;
    setSubmitting(true);
    const data: any = {
      name: form.name.trim(),
      current_market_price: Number(form.price),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      specs: Object.fromEntries(
        Object.keys(emptySpecs)
          .map((key) => [key, (form as any)[key]?.trim()])
          .filter(([, value]) => value),
      ),
      image_urls: form.imageUrl.trim() ? [form.imageUrl.trim()] : undefined,
    };
    try {
      if (editing) {
        await api.updateProduct(editing.id, data);
      } else {
        await api.createProduct(data);
      }
      resetForm();
      loadProducts();
    } catch (e: unknown) {
      alert((e instanceof Error ? e.message : String(e)) || "Failed to save product");
    }
    setSubmitting(false);
  };

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      api
        .deleteProduct(id)
        .then(loadProducts)
        .catch((e: any) => alert((e instanceof Error ? e.message : String(e))));
    }
  };

  const categories = STANDARD_AUCTION_CATEGORIES.filter((category) =>
    products.some((p) => getProductCategory(p) === category),
  );

  const filtered = products.filter((p: ApiProduct) => {
    const category = getProductCategory(p);
    if (
      search &&
      !p.name?.toLowerCase().includes(search.toLowerCase()) &&
      !category.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (categoryFilter !== "all" && category !== categoryFilter) return false;
    return true;
  });

  const {
    page,
    setPage,
    perPage,
    setPerPage,
    totalPages,
    paginated,
    resetPage,
  } = usePagination(filtered, 10);

  const totalValue = products.reduce(
    (sum, p) => sum + Number(p.current_market_price || 0),
    0,
  );
  const inUseCount = products.filter((p) =>
    auctions.some((a) => a.productId === p.id),
  ).length;

  return (
    <AdminLayout
      title="Product Management"
      subtitle={`${products.length} products`}
      actions={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
        >
          <Plus className="size-3.5" /> New Product
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
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
              placeholder="Search products..."
              className="w-full rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm py-2 pl-8 pr-3 text-xs font-medium outline-none transition-all placeholder:text-neutral-400/50 focus:border-awash-gold focus:bg-white focus:shadow-lg"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                resetPage();
              }}
              className="rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-awash-blue outline-none transition-all focus:border-awash-gold focus:bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-3 gap-3"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card className="items-center p-3 text-center">
              <ShoppingBag className="size-5 text-awash-gold" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-blue tabular-nums">
                {loading ? "..." : products.length}
              </p>
              <p className="text-[10px] font-medium text-neutral-400">
                Products
              </p>
            </Card>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card className="items-center p-3 text-center">
              <DollarSign className="size-5 text-awash-gold" />
              <p className="mt-1 font-display text-2xl font-extrabold text-awash-gold-dark tabular-nums">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-[10px] font-medium text-neutral-400">
                Total Value
              </p>
            </Card>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Card className="items-center p-3 text-center">
              <Tag className="size-5 text-emerald-600" />
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">
                {categories.length}
              </p>
              <p className="text-[10px] font-medium text-neutral-400">
                Categories
              </p>
            </Card>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              key="product-form"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="mb-4 space-y-3 border border-awash-gold/20 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-awash-blue">
                    {editing ? "Edit Product" : "New Product"}
                  </h2>
                  <button
                    onClick={resetForm}
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
                    <input
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          price: e.target.value
                            .replace(/[^\d.]/g, "")
                            .replace(/(\..*)\./g, "$1")
                            .replace(/(\.\d{2})\d+/g, "$1"),
                        }))
                      }
                      type="text"
                      inputMode="decimal"
                      placeholder="Payment"
                      className="input-full"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUploadBox
                      src={form.imageUrl}
                      onFile={(dataUrl) =>
                        setForm((f) => ({ ...f, imageUrl: dataUrl }))
                      }
                      onClear={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    />
                  </div>
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
                <div className="grid grid-cols-2 gap-3">
                  {specFields.map((field) => (
                    <label key={field.key}>
                      <span className="mb-1 block text-[10px] font-semibold text-neutral-400">
                        {field.label}
                      </span>
                      <input
                        value={(form as any)[field.key] || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.label}
                        className="input-full"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <CTAButton
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancel
                  </CTAButton>
                  <CTAButton
                    onClick={handleSave}
                    disabled={submitting || !form.name || !form.price}
                    className="flex-1"
                  >
                    {submitting
                      ? "Saving..."
                      : editing
                        ? "Update Product"
                        : "Create Product"}
                  </CTAButton>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="mb-3 flex items-center justify-between"
        >
          <p className="text-xs font-semibold text-neutral-400">
            {filtered.length} of {products.length} products
          </p>
          {inUseCount > 0 && (
            <Badge tone="blue">{inUseCount} in auctions</Badge>
          )}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Filter className="size-8 opacity-30 text-red-400" />
            <p className="text-sm font-medium text-red-500">{error}</p>
            <button
              onClick={loadProducts}
              className="text-xs font-semibold text-awash-gold transition-colors hover:text-awash-gold-dark"
            >
              Retry
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Package className="size-8 opacity-30" />
            <p className="text-sm font-medium">
              {search || categoryFilter !== "all"
                ? "No matching products"
                : "No products yet"}
            </p>
            {search || categoryFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                }}
                className="text-xs font-semibold text-awash-gold transition-colors hover:text-awash-gold-dark"
              >
                Clear filters
              </button>
            ) : (
              <p className="text-xs">Click "New Product" to get started</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="space-y-2"
          >
            {paginated.map((p: ApiProduct) => (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:border-awash-gold/20 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <ProductThumb
                  src={p.image_urls?.[0]}
                  onClick={() =>
                    p.image_urls?.[0] && setLightboxImg(p.image_urls[0])
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-awash-blue">
                      {p.name}
                    </p>
                    <Badge tone="navy">{getProductCategory(p)}</Badge>
                    {p.specs && formatSpecSummary(p.specs) && (
                      <Badge tone="green">{formatSpecSummary(p.specs)}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-neutral-400">
                    {formatCurrency(p.current_market_price)}
                    {p.description && (
                      <span className="ml-2">
                        · {p.description.slice(0, 60)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[10px] font-semibold text-awash-blue transition-colors hover:bg-neutral-50 active:scale-95"
                    title="Edit"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() => confirmDelete(p.id, p.name)}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-50 active:scale-95"
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </motion.div>
            ))}
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
