import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Bell, CheckCheck } from "lucide-react-native";
import { useApp } from "../AppContext";
import { api, type ApiNotification } from "../api";
import { AppBar, Badge, Card, CTAButton } from "../components/AuctionUI";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../theme";

function formatSentAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function NotificationsScreen() {
  const { go, goBack, refreshUnreadNotifications } = useApp();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getInbox(unreadOnly)
      .then((items) => {
        if (active) setNotifications(items);
      })
      .catch((err: any) => {
        if (active) setError((err instanceof Error ? err.message : undefined) || "Failed to load notifications");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, unreadOnly]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
      await refreshUnreadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      await refreshUnreadNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <AppBar title="Notifications" onBack={() => goBack()} />
      </View>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.headerRow}>
          <Text style={s.subtitle}>
            Auction updates, reminders, and winner alerts
          </Text>
          <Badge tone={unreadCount > 0 ? "orange" : "muted"}>
            {unreadCount} unread
          </Badge>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            onPress={() => setUnreadOnly((current) => !current)}
            style={[s.filterChip, unreadOnly ? s.filterChipActive : null]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                s.filterChipText,
                unreadOnly ? s.filterChipTextActive : null,
              ]}
            >
              {unreadOnly ? "Showing unread" : "Show unread only"}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <CTAButton
              variant="outline"
              onPress={markAllRead}
              disabled={markingAll || unreadCount === 0}
            >
              <View style={s.markAllInner}>
                <CheckCheck size={16} color={colors.foreground} />
                <Text style={s.markAllText}>
                  {markingAll ? "Marking..." : "Mark all read"}
                </Text>
              </View>
            </CTAButton>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="alert"
            title="Notifications unavailable"
            message={error}
            actionLabel="Retry"
            onAction={() => setRefreshKey((current) => current + 1)}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No notifications yet"
            message={
              unreadOnly
                ? "You have read everything for now."
                : "We will show winner alerts, auction reminders, and account updates here."
            }
            actionLabel={unreadOnly ? "Show all" : "Go to auctions"}
            onAction={() =>
              unreadOnly ? setUnreadOnly(false) : go("auctions")
            }
          />
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.map((item) => (
              <Card
                key={item.id}
                style={{ ...s.card, ...(!item.read ? s.unreadCard : {}) }}
              >
                <View style={s.cardRow}>
                  <View
                    style={[s.iconWrap, item.read ? s.iconWrapMuted : null]}
                  >
                    <Bell
                      size={18}
                      color={
                        item.read ? colors.mutedForeground : colors.primary
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.titleRow}>
                      <Text style={s.title}>{item.title}</Text>
                      {!item.read && <Badge tone="orange">New</Badge>}
                    </View>
                    <Text style={s.body}>{item.body}</Text>
                    <Text style={s.timestamp}>
                      {formatSentAt(item.sent_at)}
                    </Text>
                  </View>
                </View>
                {!item.read && (
                  <TouchableOpacity
                    onPress={() => markRead(item.id)}
                    style={s.readBtn}
                    activeOpacity={0.85}
                    disabled={busyId === item.id}
                  >
                    <Text style={s.readBtnText}>
                      {busyId === item.id ? "Saving..." : "Mark read"}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subtitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.mutedForeground,
  },
  filterChipTextActive: { color: colors.navyForeground },
  markAllInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: colors.foreground },
  loadingWrap: { paddingVertical: 48 },
  card: { padding: 14, gap: 12 },
  unreadCard: { borderColor: colors.primary + "55" },
  cardRow: { flexDirection: "row", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + "14",
    borderWidth: 1,
    borderColor: colors.primary + "2A",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapMuted: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.navy },
  body: { fontSize: 13, lineHeight: 20, color: colors.foreground },
  timestamp: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
    textTransform: "uppercase",
  },
  readBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  readBtnText: { fontSize: 12, fontWeight: "700", color: colors.awashBlue },
});
