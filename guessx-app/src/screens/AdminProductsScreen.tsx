import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  ImageIcon,
  X,
  ArrowLeft,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { api } from "../api";
import { CTAButton, Card } from "../components/AuctionUI";
import { usePagination, PaginationBar } from "../components/Pagination";
import {
  STANDARD_AUCTION_CATEGORIES,
  normalizeAuctionCategory,
} from "../lib/auctionCategories";
import { formatCurrency, formatSpecSummary } from "../mockDataV0";
import { colors } from "../theme";

const emptySpecs = {
  storage: "",
  ram: "",
  edition: "",
  battery: "",
  camera: "",
  osVersion: "",
  display: "",
  chipset: "",
};
const specFields = [
  { key: "storage", label: "Storage" },
  { key: "ram", label: "RAM" },
  { key: "edition", label: "Edition" },
  { key: "battery", label: "Battery" },
  { key: "camera", label: "Camera" },
  { key: "osVersion", label: "OS Version" },
  { key: "display", label: "Display" },
  { key: "chipset", label: "Chipset" },
] as const;

function getProductCategory(product: {
  category?: string | null;
  name?: string | null;
}) {
  return normalizeAuctionCategory(product.category, product.name);
}

export function AdminProductsScreen() {
  const { go, goBack } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(
    STANDARD_AUCTION_CATEGORIES[0],
  );
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [specs, setSpecs] = useState(emptySpecs);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.listProducts(1, 100);
      setProducts((res as any).data || res || []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => {
    setName("");
    setCategory(STANDARD_AUCTION_CATEGORIES[0]);
    setPrice("");
    setDescription("");
    setImageUrl("");
    setSpecs(emptySpecs);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (p: any) => {
    setName(p.name || "");
    setCategory(getProductCategory(p));
    setPrice(String(p.current_market_price || ""));
    setDescription(p.description || "");
    setImageUrl((p.image_urls || [])[0] || "");
    setSpecs({ ...emptySpecs, ...(p.specs || {}) });
    setEditing(p);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Error", "Name and price are required");
      return;
    }
    const data: any = {
      name: name.trim(),
      current_market_price: Number(price),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      image_urls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
      specs: Object.fromEntries(
        Object.entries(specs).filter(([, value]) => value.trim()),
      ),
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
      Alert.alert("Error", (e instanceof Error ? e.message : String(e)) || "Failed to save");
    }
  };

  const remove = (id: string, name: string) => {
    Alert.alert("Delete Product", 'Delete "' + name + '"?', [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteProduct(id);
            loadProducts();
          } catch (e: unknown) {
            Alert.alert("Error", (e instanceof Error ? e.message : String(e)));
          }
        },
      },
    ]);
  };

  const filtered = products.filter(
    (p: any) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      getProductCategory(p).toLowerCase().includes(search.toLowerCase()),
  );

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => goBack()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.navyForeground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Products</Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          style={s.addBtn}
        >
          <Plus size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {showForm ? (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={s.formTitle}>
            {editing ? "Edit Product" : "New Product"}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Product name"
            style={s.input}
            placeholderTextColor={colors.mutedForeground}
          />
          <Text style={s.fieldLabel}>Category</Text>
          <View style={s.chipWrap}>
            {STANDARD_AUCTION_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setCategory(item)}
                style={[s.chip, category === item ? s.chipActive : null]}
              >
                <Text
                  style={[
                    s.chipText,
                    category === item ? s.chipTextActive : null,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="Payment"
            keyboardType="numeric"
            style={s.input}
            placeholderTextColor={colors.mutedForeground}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
            style={[s.input, { height: 80 }]}
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={s.imgPreviewRow}>
            {imageUrl.trim() ? (
              <Image
                source={{ uri: imageUrl.trim() }}
                style={s.imgPreviewBtn}
                resizeMode="cover"
                onError={() => setImageUrl("")}
              />
            ) : (
              <View
                style={[
                  s.imgPreviewBtn,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                <ImageIcon size={20} color={colors.mutedForeground} />
              </View>
            )}
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Image URL"
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          {specFields.map((field) => (
            <TextInput
              key={field.key}
              value={specs[field.key]}
              onChangeText={(value) =>
                setSpecs((prev) => ({ ...prev, [field.key]: value }))
              }
              placeholder={field.label}
              style={s.input}
              placeholderTextColor={colors.mutedForeground}
            />
          ))}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <CTAButton variant="outline" onPress={resetForm}>
                Cancel
              </CTAButton>
            </View>
            <View style={{ flex: 1 }}>
              <CTAButton onPress={save}>
                {editing ? "Update" : "Create"}
              </CTAButton>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <Card style={s.searchRow}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                resetPage();
              }}
              placeholder="Search products..."
              style={s.searchInput}
              placeholderTextColor={colors.mutedForeground}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </Card>
          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, padding: 16 }}>
              {filtered.length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.mutedForeground,
                    marginTop: 40,
                  }}
                >
                  No products found
                </Text>
              ) : (
                paginated.map((p: any) => (
                  <Card key={p.id} style={s.productRow}>
                    <View style={s.productIcon}>
                      {p.image_urls?.[0] ? (
                        <Image
                          source={{ uri: p.image_urls[0] }}
                          style={s.productThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <Package size={20} color={colors.mutedForeground} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName}>{p.name}</Text>
                      <Text style={s.productMeta}>
                        {getProductCategory(p)} ·{" "}
                        {formatCurrency(p.current_market_price)}
                      </Text>
                      {p.specs && formatSpecSummary(p.specs) ? (
                        <Text style={s.productMeta}>
                          {formatSpecSummary(p.specs)}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => openEdit(p)}
                      style={s.actionBtn}
                    >
                      <Edit3 size={16} color={colors.navy} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => remove(p.id, p.name)}
                      style={s.actionBtn}
                    >
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </Card>
                ))
              )}
              <PaginationBar
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
              />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.navy,
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navyForeground + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navyForeground,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.navy,
    marginLeft: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    fontSize: 13,
    fontWeight: "500",
    color: colors.navy,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
  chipTextActive: { color: colors.navyForeground },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  productThumb: { width: "100%", height: "100%" },
  productName: { fontSize: 13, fontWeight: "700", color: colors.navy },
  productMeta: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginTop: 2,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  imgPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  imgPreviewBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
