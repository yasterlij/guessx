import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp, AppProvider } from "./AppContext";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { AuctionsScreen } from "./screens/AuctionsScreen";
import { MyBidsScreen } from "./screens/MyBidsScreen";
import { ProductScreen } from "./screens/ProductScreen";
import { PayFeeScreen } from "./screens/PayFeeScreen";
import { PlaceBidScreen } from "./screens/PlaceBidScreen";
import { BidConfirmedScreen } from "./screens/BidConfirmedScreen";
import { MonitorScreen } from "./screens/MonitorScreen";
import { ClosedScreen } from "./screens/ClosedScreen";
import { ClosedAuctionsScreen } from "./screens/ClosedAuctionsScreen";
import { WinnerScreen } from "./screens/WinnerScreen";
import { PayWinningScreen } from "./screens/PayWinningScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { PaymentConfirmedScreen } from "./screens/PaymentConfirmedScreen";
import { PaymentResultScreen } from "./screens/PaymentResultScreen";

import { DeliveryScreen } from "./screens/DeliveryScreen";
import { DepositScreen } from "./screens/DepositScreen";
const AdminDashboardScreen = lazy(() => import("./screens/AdminDashboardScreen").then(m => ({ default: m.AdminDashboardScreen })));
const AdminAuctionsScreen = lazy(() => import("./screens/AdminAuctionsScreen").then(m => ({ default: m.AdminAuctionsScreen })));
const AdminProductsScreen = lazy(() => import("./screens/AdminProductsScreen").then(m => ({ default: m.AdminProductsScreen })));
const AdminUsersScreen = lazy(() => import("./screens/AdminUsersScreen").then(m => ({ default: m.AdminUsersScreen })));
const AdminTransactionsScreen = lazy(() => import("./screens/AdminTransactionsScreen").then(m => ({ default: m.AdminTransactionsScreen })));
const AdminAuditScreen = lazy(() => import("./screens/AdminAuditScreen").then(m => ({ default: m.AdminAuditScreen })));
const AdminMonitorListScreen = lazy(() => import("./screens/AdminMonitorListScreen").then(m => ({ default: m.AdminMonitorListScreen })));
const AdminAuctionMonitorScreen = lazy(() => import("./screens/AdminAuctionMonitorScreen").then(m => ({ default: m.AdminAuctionMonitorScreen })));
const AdminAnalyticsScreen = lazy(() => import("./screens/AdminAnalyticsScreen").then(m => ({ default: m.AdminAnalyticsScreen })));
const WinnerManagementScreen = lazy(() => import("./screens/WinnerManagementScreen").then(m => ({ default: m.WinnerManagementScreen })));
const SettlementReportScreen = lazy(() => import("./screens/SettlementReportScreen").then(m => ({ default: m.SettlementReportScreen })));
const DisputesScreen = lazy(() => import("./screens/DisputesScreen").then(m => ({ default: m.DisputesScreen })));
const RbacScreen = lazy(() => import("./screens/RbacScreen").then(m => ({ default: m.RbacScreen })));
import { WalletScreen } from "./screens/WalletScreen";
import { BottomTabBar } from "./components/AuctionUI";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";
import { ShimmerProvider } from "./components/SkeletonLoader";
import { BidConfirmedModal } from "./components/BidConfirmedModal";
import {
  Gavel,
  Wallet,
  Shield,
  LogOut,
  Trophy,
  Menu,
  X,
  User,
  Bell,
} from "lucide-react";
import { isStaffRole } from "@guessx/api";

function ScreenRouter() {
  const { view, user } = useApp();
  const isAdmin = isStaffRole(user?.role);
  const adminViews = [
    "admin-dashboard",
    "admin-auctions",
    "admin-products",
    "admin-users",
    "admin-transactions",
    "admin-audit",
    "admin-monitor",
    "admin-auction-monitor",
    "admin-analytics",
    "admin-winners",
    "admin-settlement",
    "admin-disputes",
    "admin-rbac",
  ];
  const isAdminView = adminViews.includes(view);

  let screen;
  switch (view) {
    case "login":
      screen = <LoginScreen />;
      break;
    case "register":
      screen = <RegisterScreen />;
      break;
    case "home":
      screen = <HomeScreen />;
      break;
    case "auctions":
      screen = <AuctionsScreen />;
      break;
    case "my-bids":
      screen = <MyBidsScreen />;
      break;
    case "product":
      screen = <ProductScreen />;
      break;
    case "pay-fee":
      screen = <PayFeeScreen />;
      break;
    case "place-bid":
      screen = <PlaceBidScreen />;
      break;
    case "bid-confirmed":
      screen = <BidConfirmedScreen />;
      break;
    case "monitor":
      screen = isAdmin ? <MonitorScreen /> : <HomeScreen />;
      break;
    case "closed":
      screen = <ClosedScreen />;
      break;
    case "closed-auctions":
      screen = <ClosedAuctionsScreen />;
      break;
    case "winner":
      screen = <WinnerScreen />;
      break;
    case "profile":
      screen = <ProfileScreen />;
      break;
    case "notifications":
      screen = <NotificationsScreen />;
      break;
    case "favorites":
      screen = <FavoritesScreen />;
      break;
    case "pay-winning":
      screen = <PayWinningScreen />;
      break;
    case "payment-confirmed":
      screen = <PaymentConfirmedScreen />;
      break;
    case "delivery":
      screen = <DeliveryScreen />;
      break;
    case "payment-success":
      screen = <PaymentResultScreen />;
      break;
    case "deposit":
      screen = <DepositScreen />;
      break;
    case "payment-failed":
      screen = <PaymentResultScreen />;
      break;
    case "admin-dashboard":
      screen = isAdmin ? <AdminDashboardScreen /> : <HomeScreen />;
      break;
    case "admin-auctions":
      screen = isAdmin ? <AdminAuctionsScreen /> : <HomeScreen />;
      break;
    case "admin-products":
      screen = isAdmin ? <AdminProductsScreen /> : <HomeScreen />;
      break;
    case "admin-users":
      screen = isAdmin ? <AdminUsersScreen /> : <HomeScreen />;
      break;
    case "admin-transactions":
      screen = isAdmin ? <AdminTransactionsScreen /> : <HomeScreen />;
      break;
    case "admin-audit":
      screen = isAdmin ? <AdminAuditScreen /> : <HomeScreen />;
      break;
    case "admin-monitor":
      screen = isAdmin ? <AdminMonitorListScreen /> : <HomeScreen />;
      break;
    case "admin-auction-monitor":
      screen = isAdmin ? <AdminAuctionMonitorScreen /> : <HomeScreen />;
      break;
    case "admin-analytics":
      screen = isAdmin ? <AdminAnalyticsScreen /> : <HomeScreen />;
      break;
    case "admin-winners":
      screen = isAdmin ? <WinnerManagementScreen /> : <HomeScreen />;
      break;
    case "admin-settlement":
      screen = isAdmin ? <SettlementReportScreen /> : <HomeScreen />;
      break;
    case "admin-disputes":
      screen = isAdmin ? <DisputesScreen /> : <HomeScreen />;
      break;
    case "admin-rbac":
      screen = isAdmin ? <RbacScreen /> : <HomeScreen />;
      break;
    case "wallet":
      screen = <WalletScreen />;
      break;
    default:
      screen = user ? <HomeScreen /> : <LoginScreen />;
  }

  if (isAdminView || view === "login" || view === "register") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[300px] text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            }
          >
            {screen}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 flex-col min-h-0"
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}

function Navbar() {
  const { go, view, user, logout, unreadNotificationCount } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAuthed = !!user;
  if (!isAuthed) return null;

  const navItems = [
    { id: "home", label: "Home", icon: Wallet },
    { id: "auctions", label: "Live Auctions", icon: Gavel },
    { id: "closed-auctions", label: "Winners", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
    ...(user?.role === "admin"
      ? [{ id: "admin-dashboard", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <>
      <nav className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <button
              onClick={() => go("home")}
              className="flex items-center group py-1"
            >
              <img
                src="/guessx_logo.svg"
                alt="GuessX"
                className="h-12 sm:h-14 md:h-[3.75rem] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </button>
            <div className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(item.id as any)}
                  className={`nav-btn flex items-center gap-1.5 ${
                    view === item.id ? "active" : ""
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => go("notifications")}
              className="relative hidden sm:flex size-9 items-center justify-center rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm text-neutral-500 transition-all duration-300 hover:bg-white hover:text-awash-blue"
            >
              <Bell className="size-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </button>
            <span className="hidden text-sm font-medium text-neutral-500 sm:block">
              {user?.name || user?.phone}
            </span>
            <button
              onClick={() => logout()}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-neutral-500 transition-all duration-300 hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:shadow-sm"
            >
              <LogOut className="size-3.5" />
              Sign Out
            </button>
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="flex sm:hidden items-center justify-center size-9 rounded-lg border border-border/60 bg-white/50 backdrop-blur-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              {drawerOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-16 sm:top-20 w-64 max-w-[85vw] bg-white border-l border-border/50 shadow-2xl rounded-bl-2xl p-4 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-4 mb-3 border-b border-border/50">
              <div className="flex size-10 items-center justify-center rounded-full bg-awash-blue/10 text-awash-blue font-bold text-sm">
                {(user?.name || user?.phone)?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-awash-blue truncate">
                  {user?.name || "User"}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {user?.phone}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    go(item.id as any);
                    setDrawerOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    view === item.id
                      ? "bg-awash-blue text-white shadow-md"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <button
                onClick={() => {
                  logout();
                  setDrawerOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BottomNav() {
  const { go, view, user } = useApp();
  if (!user) return null;

  const showBottomBar = [
    "home",
    "auctions",
    "closed-auctions",
    "my-bids",
    "profile",
    "admin-dashboard",
    "admin-auctions",
    "admin-products",
    "admin-users",
  ].includes(view);

  if (!showBottomBar) return null;

  const items = [
    { id: "home", label: "Home", icon: Wallet },
    { id: "auctions", label: "Auctions", icon: Gavel },
    { id: "closed-auctions", label: "Winners", icon: Trophy },
    { id: "profile", label: "Profile", icon: User },
    ...(user?.role === "admin"
      ? [{ id: "admin-dashboard", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <div className="block sm:hidden">
      <BottomTabBar
        items={items}
        activeTab={view}
        onTabChange={(id) => go(id as any)}
      />
    </div>
  );
}

function AppContent() {
  const { view, user } = useApp();

  const adminViews = [
    "admin-dashboard",
    "admin-auctions",
    "admin-products",
    "admin-users",
    "admin-transactions",
    "admin-audit",
    "admin-monitor",
    "admin-auction-monitor",
    "admin-analytics",
  ];
  const isFullScreen =
    adminViews.includes(view) || view === "login" || view === "register";

  if (isFullScreen) {
    return (
      <div className="flex min-h-screen flex-col">
        <ScreenRouter />
        <ToastContainer />
        <BidConfirmedModal />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-dots">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 py-4 sm:py-6 pb-[88px] sm:pb-6 min-h-0">
        <ScreenRouter />
      </main>
      <BottomNav />
      <ToastContainer />
      <BidConfirmedModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ShimmerProvider>
          <AppContent />
        </ShimmerProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
