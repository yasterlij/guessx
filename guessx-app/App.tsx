import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Gavel, LogOut, Wallet, Trophy, UserRound } from "lucide-react-native";
import { AppProvider, useApp } from "./src/AppContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { AuctionsScreen } from "./src/screens/AuctionsScreen";
import { MyBidsScreen } from "./src/screens/MyBidsScreen";
import { ProductScreen } from "./src/screens/ProductScreen";
import { PayFeeScreen } from "./src/screens/PayFeeScreen";
import { PlaceBidScreen } from "./src/screens/PlaceBidScreen";
import { BidConfirmedScreen } from "./src/screens/BidConfirmedScreen";
import { MonitorScreen } from "./src/screens/MonitorScreen";
import { ClosedScreen } from "./src/screens/ClosedScreen";
import { WinnerScreen } from "./src/screens/WinnerScreen";
import { PayWinningScreen } from "./src/screens/PayWinningScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { FavoritesScreen } from "./src/screens/FavoritesScreen";
import { PaymentConfirmedScreen } from "./src/screens/PaymentConfirmedScreen";
import { DeliveryScreen } from "./src/screens/DeliveryScreen";
import { WinnersListScreen } from "./src/screens/WinnersListScreen";
import { AdminDashboardScreen } from "./src/screens/AdminDashboardScreen";
import { AdminMonitorListScreen } from "./src/screens/AdminMonitorListScreen";
import { AdminAuctionMonitorScreen } from "./src/screens/AdminAuctionMonitorScreen";
import { AdminAuctionsScreen } from "./src/screens/AdminAuctionsScreen";
import { AdminUsersScreen } from "./src/screens/AdminUsersScreen";
import { AdminProductsScreen } from "./src/screens/AdminProductsScreen";
import { AdminTransactionsScreen } from "./src/screens/AdminTransactionsScreen";
import { AdminSettlementScreen } from "./src/screens/AdminSettlementScreen";
import { DepositScreen } from "./src/screens/DepositScreen";
import { WalletScreen } from "./src/screens/WalletScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ToastProvider } from "./src/components/Toast";
import { ShimmerProvider } from "./src/components/SkeletonLoader";
import { colors } from "./src/theme";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ShimmerProvider>
          <SafeAreaProvider>
            <AppProvider>
              <StatusBar style="light" />
              <ScreenRouter />
            </AppProvider>
          </SafeAreaProvider>
        </ShimmerProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

import { isStaffRole } from "@guessx/api";

function ScreenRouter() {
  const { view, user, go } = useApp();
  const isAdmin = isStaffRole(user?.role);

  const screen = (() => {
    switch (view) {
      case "login":
        return <LoginScreen />;
      case "register":
        return <RegisterScreen />;
      case "home":
        return <HomeScreen />;
      case "auctions":
        return <AuctionsScreen />;
      case "my-bids":
        return <MyBidsScreen />;
      case "product":
        return <ProductScreen />;
      case "pay-fee":
        return <PayFeeScreen />;
      case "place-bid":
        return <PlaceBidScreen />;
      case "bid-confirmed":
        return <BidConfirmedScreen />;
      case "monitor":
        return isAdmin ? <MonitorScreen /> : <HomeScreen />;
      case "closed":
        return <ClosedScreen />;
      case "winner":
        return <WinnerScreen />;
      case "profile":
        return <ProfileScreen />;
      case "notifications":
        return <NotificationsScreen />;
      case "favorites":
        return <FavoritesScreen />;
      case "pay-winning":
        return <PayWinningScreen />;
      case "payment-confirmed":
        return <PaymentConfirmedScreen />;
      case "payment-success":
        return <PaymentConfirmedScreen />;
      case "payment-failed":
        return <HomeScreen />;
      case "delivery":
        return <DeliveryScreen />;
      case "admin-dashboard":
        return isAdmin ? <AdminDashboardScreen /> : <HomeScreen />;
      case "admin-auctions":
        return isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />;
      case "admin-monitor":
        return isAdmin ? <AdminMonitorListScreen /> : <HomeScreen />;
      case "admin-auction-monitor":
        return isAdmin ? <AdminAuctionMonitorScreen /> : <HomeScreen />;
      case "admin-users":
        return isAdmin ? <AdminUsersScreen /> : <HomeScreen />;
      case "admin-products":
        return isAdmin ? <AdminProductsScreen /> : <HomeScreen />;
      case "admin-transactions":
        return isAdmin ? <AdminTransactionsScreen /> : <HomeScreen />;
      case "admin-settlement":
        return isAdmin ? <AdminSettlementScreen /> : <HomeScreen />;
      case "wallet":
        return <WalletScreen />;
      case "winners-list":
        return <WinnersListScreen />;
      case "deposit":
        return <DepositScreen />;
      default:
        return user ? <HomeScreen /> : <LoginScreen />;
    }
  })();

  const showTabBar =
    user &&
    ["home", "auctions", "my-bids", "winners-list", "profile", "wallet"].includes(view);

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutralGray50 }}>
      <StatusBar style={user ? "dark" : "light"} />
      <View style={{ flex: 1 }}>{screen}</View>
      {showTabBar && <BottomTabBar />}
    </View>
  );
}

function BottomTabBar() {
  const { view, go, logout } = useApp();
  const tabs = [
    { key: "home", label: "Home", icon: Wallet },
    { key: "auctions", label: "Auctions", icon: Gavel },
    { key: "winners-list", label: "Winners", icon: Trophy },
    { key: "profile", label: "Profile", icon: UserRound },
  ] as const;

  return (
    <View style={s.tabBar}>
      <View style={s.tabBarInner}>
        {tabs.map((tab) => {
          const active = view === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tab}
              onPress={() => go(tab.key as any)}
              activeOpacity={0.7}
            >
              {active && <View style={s.activeIndicator} />}
              <View style={{ position: "relative", marginTop: 4 }}>
                <Icon
                  size={22}
                  color={active ? colors.primary : colors.neutralGray400}
                />
              </View>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={s.logoutBtn}
        onPress={() => logout()}
        activeOpacity={0.7}
      >
        <LogOut size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingBottom: 28,
    paddingTop: 4,
    paddingHorizontal: 8,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBarInner: { flex: 1, flexDirection: "row", alignItems: "flex-start" },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    gap: 1,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.destructive + "14",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.destructive + "20",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.neutralGray400,
    marginTop: 2,
  },
  tabLabelActive: { color: colors.primary, fontWeight: "700" },
});
