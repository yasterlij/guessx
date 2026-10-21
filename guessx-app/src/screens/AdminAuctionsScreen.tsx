import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import {
  Plus,
  X,
  Pencil,
  XCircle,
  Trash2,
  Eye,
  Calendar,
  ImageIcon,
  Search,
  Filter,
  Upload,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  Camera,
  Trophy,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { api } from "../api";
import { AppBar, CTAButton, Badge, Card } from "../components/AuctionUI";
import { usePagination, PaginationBar } from "../components/Pagination";
import { STANDARD_AUCTION_CATEGORIES } from "../lib/auctionCategories";
import { formatCurrency, formatSpecSummary } from "../mockDataV0";
import { colors } from "../theme";

const { width } = Dimensions.get("window");

function AuctionThumb({ src }: { src?: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <View style={s.thumbWrap}>
        <ImageIcon size={20} color={colors.mutedForeground + "4D"} />
      </View>
    );
  }
  return (
    <View style={[s.thumbWrap, { overflow: "hidden" }]}>
      <Image
        source={{ uri: src }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
        onError={() => setErr(true)}
      />
    </View>
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

function BidChart({ amounts }: { amounts: number[] }) {
  const buckets = useMemo(() => {
    if (amounts.length === 0) return [];
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const range = max - min || 1;
    const count = Math.min(8, amounts.length);
    const bucketSize = range / count;
    return Array.from({ length: count }, (_, i) => {
      const start = min + i * bucketSize;
      let cnt = 0;
      amounts.forEach((a) => {
        const idx = Math.min(Math.floor((a - min) / bucketSize), count - 1);
        if (idx === i) cnt++;
      });
      return { label: formatCurrency(Math.round(start)), count: cnt };
    });
  }, [amounts]);

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  if (buckets.length === 0) return null;

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <BarChart3 size={12} color={colors.mutedForeground} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "600",
            color: colors.mutedForeground,
          }}
        >
          Bid Distribution
        </Text>
      </View>
      <View
        style={{
          height: 40,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        {buckets.map((b, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 7,
                fontWeight: "700",
                color: colors.navy,
                marginBottom: 1,
                opacity: 0,
              }}
            >
              {b.count}
            </Text>
            <View
              style={{
                width: "100%",
                borderRadius: 2,
                backgroundColor: colors.primary + "99",
                height: Math.max(
                  (b.count / maxCount) * 36,
                  b.count > 0 ? 4 : 0,
                ),
              }}
            />
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 7, color: colors.mutedForeground }}>
          {buckets[0]?.label || ""}
        </Text>
        <Text style={{ fontSize: 7, color: colors.mutedForeground }}>
          {buckets[buckets.length - 1]?.label || ""}
        </Text>
      </View>
    </View>
  );
}

function ImagePickerBox({
  value,
  onChange,
  onPreview,
}: {
  value: string;
  onChange: (v: string) => void;
  onPreview: () => void;
}) {
  const hasImg = !!value;
  const [picking, setPicking] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlText, setUrlText] = useState("");

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to your photo library to upload images.",
      );
      return;
    }
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  };

  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <TouchableOpacity
        onPress={value ? onPreview : pick}
        style={s.imgPreviewBtn}
        activeOpacity={0.7}
      >
        {picking ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : value ? (
          <>
            <Image
              source={{ uri: value }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
              onError={() => onChange("")}
            />
            {hasImg && (
              <TouchableOpacity
                onPress={() => onChange("")}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  width: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <X size={12} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Camera size={20} color={colors.mutedForeground + "4D"} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={pick}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          paddingHorizontal: 16,
          paddingVertical: 6,
          width: "100%",
        }}
      >
        <Upload size={12} color={colors.navy} />
        <Text style={{ fontSize: 10, fontWeight: "600", color: colors.navy }}>
          Browse & Upload
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowUrl(!showUrl)}>
        <Text style={{ fontSize: 8, color: colors.mutedForeground }}>
          {showUrl ? "Hide URL" : "or paste URL"}
        </Text>
      </TouchableOpacity>
      {showUrl && (
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          <TextInput
            value={urlText}
            onChangeText={setUrlText}
            placeholder="https://..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={{
              flex: 1,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.secondary,
              paddingHorizontal: 8,
              paddingVertical: 4,
              fontSize: 10,
              color: colors.foreground,
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (urlText) onChange(urlText);
              setUrlText("");
            }}
            style={{
              borderRadius: 6,
              backgroundColor: colors.primary,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "600",
                color: colors.primaryForeground,
              }}
            >
              Set
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function fmtDate(d: Date): string {
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function AdminAuctionsScreen() {
  const {
    go,
    auctions,
    addAuction,
    updateAuction,
    deleteAuction,
    closeAuction,
    refreshAuctions,
    allBids,
    goBack,
  } = useApp();
  const [showForceCloseConfirm, setShowForceCloseConfirm] = useState<
    string | null
  >(null);
  const [forceClosing, setForceClosing] = useState(false);
  const [forceCloseWarning, setForceCloseWarning] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewBidsId, setViewBidsId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [name, setName] = useState("");
  const CATEGORIES = [...STANDARD_AUCTION_CATEGORIES];
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
  const [category, setCategory] = useState<string>(
    STANDARD_AUCTION_CATEGORIES[0],
  );
  const [marketPrice, setMarketPrice] = useState("");
  const [bidFee, setBidFee] = useState("10");
  const [minBid, setMinBid] = useState("");
  const [maxBid, setMaxBid] = useState("");

  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [specText, setSpecText] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<"date" | "time">(
    "date",
  );
  const [endPickerMode, setEndPickerMode] = useState<"date" | "time">("date");
  const [submitting, setSubmitting] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const resetForm = () => {
    setName("");
    setCategory(STANDARD_AUCTION_CATEGORIES[0]);
    setMarketPrice("");
    setBidFee("10");
    setMinBid("");
    setMaxBid("");
    setDescription("");
    setHighlights("");
    setImageUrl("");
    setSpecText("");
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 86400000));
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setName(a.name);
    setCategory(a.category);
    setMarketPrice(String(a.marketPrice));
    setBidFee(String(a.bidFee || 10));
    setDescription(a.description);
    setImageUrl(a.images?.[0] || "");
    setHighlights(Array.isArray(a.highlights) ? a.highlights.join(", ") : "");
    setSpecText(
      Object.keys(emptySpecs)
        .map((key) => (a.specs || {})[key])
        .filter(Boolean)
        .join(", "),
    );
    setMinBid(a.minBid != null ? String(a.minBid) : "");
    setMaxBid(a.maxBid != null ? String(a.maxBid) : "");
    const end = a.endTime
      ? new Date(a.endTime)
      : new Date(Date.now() + 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    setStartDate(start);
    setEndDate(end);
    setShowForm(true);
  };

  const onStartChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (!selected) return;
    if (startPickerMode === "date") {
      const merged = new Date(selected);
      merged.setHours(startDate.getHours(), startDate.getMinutes());
      setStartDate(merged);
      setStartPickerMode("time");
      if (Platform.OS === "android") setShowStartPicker(true);
    } else {
      setStartDate(selected);
      setStartPickerMode("date");
    }
  };

  const onEndChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (!selected) return;
    if (endPickerMode === "date") {
      const merged = new Date(selected);
      merged.setHours(endDate.getHours(), endDate.getMinutes());
      setEndDate(merged);
      setEndPickerMode("time");
      if (Platform.OS === "android") setShowEndPicker(true);
    } else {
      setEndDate(selected);
      setEndPickerMode("date");
    }
  };

  const handleSubmit = async () => {
    if (!name) return;
    setSubmitting(true);
    const hl = highlights
      ? highlights
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    const specValues = specText
      ? specText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const payload = {
      name,
      category,
      marketPrice: Number(marketPrice || 0),
      description,
      highlights: hl,
      specs: Object.fromEntries(
        Object.keys(emptySpecs)
          .map((key, i) => [key, specValues[i]])
          .filter(([, value]) => value),
      ),
      ...(imageUrl ? { images: [imageUrl] } : {}),
    };
    if (editingId) {
      await updateAuction(editingId, {
        ...payload,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        minBid: minBid ? Number(minBid) : undefined,
        maxBid: maxBid ? Number(maxBid) : undefined,
        bidFee: bidFee ? Number(bidFee) : undefined,
      });
    } else {
      await addAuction({
        ...payload,
        bidFee: Number(bidFee),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        minBid: minBid ? Number(minBid) : undefined,
        maxBid: maxBid ? Number(maxBid) : undefined,
      });
    }
    setSubmitting(false);
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const handleClose = async (id: string) => {
    try {
      await api.closeAuction(id);
      await refreshAuctions();
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : undefined) || "";
      if (
        msg.toLowerCase().includes("no unique bids") ||
        msg.toLowerCase().includes("no unique winners") ||
        msg.toLowerCase().includes("no bids found")
      ) {
        setForceCloseWarning(msg);
        setShowForceCloseConfirm(id);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  const handleForceClose = async () => {
    if (!showForceCloseConfirm) return;
    setForceClosing(true);
    try {
      await api.forceCloseAuction(showForceCloseConfirm);
      Alert.alert("Success", "Auction has been force-closed successfully");
      refreshAuctions();
    } catch (e: unknown) {
      Alert.alert("Error", (e instanceof Error ? e.message : undefined) || "Failed to force-close auction");
    } finally {
      setForceClosing(false);
      setShowForceCloseConfirm(null);
      setForceCloseWarning("");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Auction", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteAuction(id),
      },
    ]);
  };

  const filtered = auctions.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const activeCount = auctions.filter(
    (a) => a.status === "live" || a.status === "ending-soon",
  ).length;
  const closedCount = auctions.filter((a) => a.status === "closed").length;
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
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
      </View>
      <AppBar
        title="Auction Management"
        onBack={() => goBack()}
        right={
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={openCreate}
          >
            <Plus size={20} color={colors.navyForeground} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View style={s.searchWrap}>
            <Search size={14} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                resetPage();
              }}
              placeholder="Search auctions..."
              placeholderTextColor={colors.mutedForeground + "80"}
              style={s.searchInput}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {["all", "live", "ending-soon", "closed"].map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => {
                setStatusFilter(st);
                resetPage();
              }}
              style={[
                s.filterChip,
                {
                  backgroundColor:
                    statusFilter === st ? colors.navy : colors.card,
                  borderColor:
                    statusFilter === st ? colors.navy : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color:
                    statusFilter === st
                      ? colors.navyForeground
                      : colors.mutedForeground,
                }}
              >
                {st === "all"
                  ? "All"
                  : st === "ending-soon"
                    ? "Ending"
                    : st.charAt(0).toUpperCase() + st.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: colors.mutedForeground,
            }}
          >
            {filtered.length} of {auctions.length} auctions
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Badge tone="green">{activeCount} active</Badge>
            <Badge tone="muted">{closedCount} closed</Badge>
          </View>
        </View>

        {showForm && (
          <Card
            style={{
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.primary + "33",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: colors.navy }}
              >
                {editingId ? "Edit Auction" : "New Auction"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Product name"
                  placeholderTextColor={colors.mutedForeground}
                  style={s.input}
                />
              </View>
              <ImagePickerBox
                value={imageUrl}
                onChange={setImageUrl}
                onPreview={() => setShowLightbox(true)}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <TextInput
                value={bidFee}
                onChangeText={(t) =>
                  setBidFee(
                    t
                      .replace(/[^\d.]/g, "")
                      .replace(/(\..*)\./g, "$1")
                      .replace(/(\.\d{2})\d+/g, "$1"),
                  )
                }
                placeholder="Bid Amount"
                placeholderTextColor={colors.mutedForeground}
                style={s.input}
                keyboardType="decimal-pad"
              />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 4,
              }}
            >
              Category
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: category === c ? colors.navy : colors.card,
                    borderWidth: 1,
                    borderColor: category === c ? colors.navy : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color:
                        category === c
                          ? colors.navyForeground
                          : colors.mutedForeground,
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 4,
              }}
            >
              Bid Configuration (optional)
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <TextInput
                value={minBid}
                onChangeText={(t) =>
                  setMinBid(
                    t
                      .replace(/[^\d.]/g, "")
                      .replace(/(\..*)\./g, "$1")
                      .replace(/(\.\d{2})\d+/g, "$1"),
                  )
                }
                placeholder="Min total bids"
                placeholderTextColor={colors.mutedForeground}
                style={[s.input, { flex: 1 }]}
                keyboardType="decimal-pad"
              />
              <TextInput
                value={maxBid}
                onChangeText={(t) =>
                  setMaxBid(
                    t
                      .replace(/[^\d.]/g, "")
                      .replace(/(\..*)\./g, "$1")
                      .replace(/(\.\d{2})\d+/g, "$1"),
                  )
                }
                placeholder="Max total bids"
                placeholderTextColor={colors.mutedForeground}
                style={[s.input, { flex: 1 }]}
                keyboardType="decimal-pad"
              />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
              style={s.input}
              multiline
              numberOfLines={2}
            />
            <TextInput
              value={highlights}
              onChangeText={setHighlights}
              placeholder="Highlights (comma separated)"
              placeholderTextColor={colors.mutedForeground}
              style={s.input}
            />
            <TextInput
              value={specText}
              onChangeText={setSpecText}
              placeholder="Product specs (comma separated)"
              placeholderTextColor={colors.mutedForeground}
              style={s.input}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 4,
              }}
            >
              Start
            </Text>
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => {
                setStartPickerMode("date");
                setShowStartPicker(true);
              }}
            >
              <Calendar size={14} color={colors.mutedForeground} />
              <Text style={s.dateText}>{fmtDate(startDate)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode={startPickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onStartChange}
              />
            )}
            <Text
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: colors.mutedForeground,
                marginBottom: 4,
                marginTop: 4,
              }}
            >
              End
            </Text>
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => {
                setEndPickerMode("date");
                setShowEndPicker(true);
              }}
            >
              <Calendar size={14} color={colors.mutedForeground} />
              <Text style={s.dateText}>{fmtDate(endDate)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode={endPickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onEndChange}
              />
            )}
            <CTAButton onPress={handleSubmit} disabled={submitting || !name}>
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Auction"
                  : "Create Auction"}
            </CTAButton>
          </Card>
        )}

        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Filter size={32} color={colors.mutedForeground + "4D"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              No matching auctions
            </Text>
            {search || statusFilter !== "all" ? (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.primary,
                    marginTop: 8,
                  }}
                >
                  Clear filters
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={{
                  fontSize: 11,
                  color: colors.mutedForeground,
                  marginTop: 4,
                }}
              >
                Tap + to create one
              </Text>
            )}
          </View>
        ) : (
          paginated.map((a) => {
            const bids = allBids.filter((b) => b.auctionId === a.id);
            const bidAmounts = bids.map((b) => b.amount);
            const avgBid =
              bidAmounts.length > 0
                ? Math.round(
                    bidAmounts.reduce((s, v) => s + v, 0) / bidAmounts.length,
                  )
                : 0;
            return (
              <View key={a.id}>
                <Card style={s.row}>
                  <AuctionThumb src={a.images?.[0]} />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={s.name} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <StatusBadge status={a.status} />
                    </View>
                    <Text style={s.meta}>
                      {a.uniqueBidders} bidders ·{" "}
                      {formatCurrency(a.marketPrice)}
                      {bidAmounts.length > 0
                        ? ` · Avg ${formatCurrency(avgBid)}`
                        : ""}
                      {a.specSummary ? ` · ${a.specSummary}` : ""}
                    </Text>
                  </View>
                  {a.publicCode ? (
                    <View style={s.statusChip}>
                      <Text style={s.statusChipText}>Code {a.publicCode}</Text>
                    </View>
                  ) : null}
                  {a.status === "closed" ? (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const mod = await import("../api");
                          const res = await mod.api.drawWinner(a.id);
                          Alert.alert(
                            "Winner Result",
                            res.winner_name
                              ? `Winner: ${res.winner_name}\nAmount: ${formatCurrency(res.winning_bid_amount ?? 0)}`
                              : "No unique winner found",
                          );
                        } catch {
                          Alert.alert("Error", "Failed to draw winner");
                        }
                      }}
                      style={[
                        s.iconBtn,
                        {
                          borderColor: colors.primary + "4D",
                          backgroundColor: colors.primary + "14",
                        },
                      ]}
                    >
                      <Trophy size={12} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openEdit(a)}
                      style={s.iconBtn}
                    >
                      <Pencil size={12} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      setViewBidsId(viewBidsId === a.id ? null : a.id)
                    }
                    style={s.iconBtn}
                  >
                    <Eye size={12} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  {a.status !== "closed" && (
                    <TouchableOpacity
                      onPress={() => handleClose(a.id)}
                      style={s.closeBtn}
                    >
                      <XCircle size={12} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(a.id)}
                    style={[
                      s.iconBtn,
                      { borderColor: colors.destructive + "4D" },
                    ]}
                  >
                    <Trash2 size={12} color={colors.destructive} />
                  </TouchableOpacity>
                </Card>
                {viewBidsId === a.id && (
                  <View style={s.bidsBox}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Eye size={12} color={colors.navy} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: colors.navy,
                          }}
                        >
                          Bids ({bids.length})
                        </Text>
                      </View>
                      {bidAmounts.length > 1 && (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 9,
                              color: colors.mutedForeground,
                            }}
                          >
                            <TrendingDown
                              size={10}
                              color={colors.mutedForeground}
                            />{" "}
                            Min: {formatCurrency(Math.min(...bidAmounts))}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color: colors.mutedForeground,
                            }}
                          >
                            <ArrowUpRight
                              size={10}
                              color={colors.mutedForeground}
                            />{" "}
                            Max: {formatCurrency(Math.max(...bidAmounts))}
                          </Text>
                        </View>
                      )}
                    </View>

                    {bids.length > 1 && <BidChart amounts={bidAmounts} />}

                    {bids.length === 0 ? (
                      <Text
                        style={{
                          textAlign: "center",
                          paddingVertical: 8,
                          fontSize: 10,
                          color: colors.mutedForeground,
                        }}
                      >
                        No bids placed yet
                      </Text>
                    ) : (
                      bids.map((b, i) => (
                        <View key={i} style={s.bidRow}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <View style={s.bidIdx}>
                              <Text
                                style={{
                                  fontSize: 8,
                                  fontWeight: "700",
                                  color: colors.navy + "99",
                                }}
                              >
                                {i + 1}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "500",
                                color: colors.mutedForeground,
                              }}
                            >
                              {b.userName
                                ? `${b.userName} (User ${(b.userId || "").slice(0, 8)})`
                                : b.userId
                                  ? `User ${b.userId.slice(0, 8)}`
                                  : "Anonymous"}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: colors.navy,
                            }}
                          >
                            {formatCurrency(b.amount)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
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

      <Modal
        visible={!!showForceCloseConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForceCloseConfirm(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              borderRadius: 20,
              backgroundColor: colors.card,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.destructive,
                marginBottom: 8,
              }}
            >
              Force Close Auction
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.mutedForeground,
                marginBottom: 16,
              }}
            >
              {forceCloseWarning ||
                "This auction cannot be closed normally. Force closing will end the auction without declaring a winner. This action cannot be undone."}
            </Text>
            {forceClosing ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowForceCloseConfirm(null)}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.mutedForeground,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleForceClose}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor: colors.destructive,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}
                  >
                    Force Close
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLightbox(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowLightbox(false)}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{ width: width - 40, height: width - 40 }}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={{ position: "absolute", top: 60, right: 20 }}
            onPress={() => setShowLightbox(false)}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function StatusBarCustom() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.navyForeground,
        }}
      >
        9:41
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
    paddingVertical: 8,
  },
  filterChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: colors.navy },
  meta: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 12,
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald200,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: { fontSize: 10, fontWeight: "700", color: colors.emerald700 },
  iconBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  closeBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.destructive + "4D",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  bidsBox: {
    marginTop: -8,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary + "66",
    padding: 12,
  },
  bidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.white + "99",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4,
  },
  bidIdx: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.navy + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "500",
    color: colors.foreground,
    marginBottom: 12,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateText: { fontSize: 13, fontWeight: "500", color: colors.foreground },
  imgPreviewBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
