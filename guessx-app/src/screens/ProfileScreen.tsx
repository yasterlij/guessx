import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Wallet,
  Eye,
  EyeOff,
  TicketCheck,
  Trophy,
  Shield,
  LogOut,
  ChevronRight,
  Phone,
  Bell,
  Heart,
} from "lucide-react-native";
import { useApp } from "../AppContext";
import { AppBar, Badge } from "../components/AuctionUI";
import { formatCurrency } from "../mockDataV0";
import { colors } from "../theme";
import { isStaffRole } from "@guessx/api";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen() {
  const { go, goBack, user, walletBalance, logout, unreadNotificationCount } = useApp();
  const [showBalance, setShowBalance] = useState(true);
  const isAdmin = isStaffRole(user?.role);

  const menuItems = [
    {
      id: "wallet",
      label: "My Wallet & Escrow",
      icon: Wallet,
      onPress: () => go("wallet"),
    },
    {
      id: "my-bids",
      label: "My Bids",
      icon: TicketCheck,
      onPress: () => go("my-bids"),
    },
    {
      id: "winners",
      label: "Winners",
      icon: Trophy,
      onPress: () => go("winners-list"),
    },
    {
      id: "favorites",
      label: "Favorites",
      icon: Heart,
      onPress: () => go("favorites"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onPress: () => go("notifications"),
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin Panel",
            icon: Shield,
            onPress: () => go("admin-dashboard"),
          },
        ]
      : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.navy }}>
        <StatusBarCustom />
        <AppBar title="Profile" onBack={() => goBack()} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#003366", "#001F3F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.profileCard}
        >
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: colors.primary + "14",
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{getInitials(user?.name || "?")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={s.name} numberOfLines={1}>
                  {user?.name || "User"}
                </Text>
                <Badge tone={isAdmin ? "gold" : "green"}>
                  {isAdmin ? "Admin" : "User"}
                </Badge>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginTop: 4,
                }}
              >
                <Phone size={12} color="rgba(255,255,255,0.6)" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {user?.phone}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={["#FFFFFF", "#FFF8E7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.walletCard}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={s.walletIcon}>
                <Wallet size={20} color={colors.primary} />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "500",
                    color: colors.mutedForeground,
                  }}
                >
                  Wallet Balance
                </Text>
                <Text style={s.walletAmount}>
                  {showBalance ? formatCurrency(walletBalance) : "••••••"}
                </Text>
              </View>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setShowBalance((s) => !s)}
                style={s.iconBtn}
                activeOpacity={0.8}
              >
                {showBalance ? (
                  <Eye size={16} color={colors.mutedForeground} />
                ) : (
                  <EyeOff size={16} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => go("deposit")}
                activeOpacity={0.85}
                style={{ borderRadius: 10, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={["#C8A642", "#D4B85E", "#C8A642"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.primaryForeground,
                    }}
                  >
                    + Top Up
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={{ gap: 10 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={item.onPress}
              activeOpacity={0.85}
              style={s.menuRow}
            >
              <View style={s.menuIcon}>
                <item.icon size={18} color={colors.awashBlue} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              {item.id === "notifications" && unreadNotificationCount > 0 ? (
                <Badge tone="orange">{unreadNotificationCount}</Badge>
              ) : null}
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => logout()}
          activeOpacity={0.85}
          style={[
            s.menuRow,
            {
              backgroundColor: colors.destructive + "0D",
              borderColor: colors.destructive + "26",
            },
          ]}
        >
          <View
            style={[
              s.menuIcon,
              {
                backgroundColor: colors.destructive + "14",
                borderColor: colors.destructive + "26",
              },
            ]}
          >
            <LogOut size={18} color={colors.destructive} />
          </View>
          <Text style={[s.menuLabel, { color: colors.destructive }]}>
            Sign Out
          </Text>
          <ChevronRight size={16} color={colors.destructive} />
        </TouchableOpacity>
      </ScrollView>
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
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + "33",
    padding: 18,
    overflow: "hidden",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  name: {
    fontFamily: "System",
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    flexShrink: 1,
  },
  walletCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + "26",
    padding: 16,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  walletAmount: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "800",
    color: colors.awashBlue,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.awashBlue + "12",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.awashBlue + "1F",
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
});
