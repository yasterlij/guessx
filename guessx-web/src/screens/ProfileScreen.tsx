import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
} from "lucide-react";
import { useApp } from "../AppContext";
import { Badge } from "../components/AuctionUI";
import { formatCurrency } from "../mockDataV0";
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
      onClick: () => go("wallet"),
    },
    {
      id: "my-bids",
      label: "My Bids",
      icon: TicketCheck,
      onClick: () => go("my-bids"),
    },
    {
      id: "winners",
      label: "Winners",
      icon: Trophy,
      onClick: () => go("closed-auctions"),
    },
    {
      id: "favorites",
      label: "Favorites",
      icon: Heart,
      onClick: () => go("favorites"),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => go("notifications"),
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin Panel",
            icon: Shield,
            onClick: () => go("admin-dashboard"),
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8 stagger-enter"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => goBack()}
          className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Profile
          </h1>
          <p className="text-sm font-medium text-neutral-500">
            Your account and activity
          </p>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-6 shadow-[0_8px_32px_rgba(0,43,92,0.2)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg">
            <span className="font-display text-xl font-extrabold text-awash-gold-light">
              {getInitials(user?.name || "?")}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-xl font-extrabold text-white">
                {user?.name || "User"}
              </h2>
              <Badge tone={isAdmin ? "gold" : "green"}>
                {isAdmin ? "Admin" : "User"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-white/60">
              <Phone className="size-3.5" />
              <span>{user?.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wallet Balance ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-5 shadow-[0_4px_20px_rgba(0,43,92,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-awash-gold/10 border border-awash-gold/20 text-awash-gold">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-neutral-500">
                Wallet Balance
              </p>
              <p className="font-display text-2xl font-extrabold text-awash-blue tabular-nums tracking-tight">
                {showBalance ? formatCurrency(walletBalance) : "••••••"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBalance((s) => !s)}
              className="rounded-lg bg-neutral-100 px-2.5 py-2 text-xs font-medium text-neutral-500 transition-all hover:bg-neutral-200 border border-border/60"
            >
              {showBalance ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </button>
            <button
              onClick={() => go("wallet")}
              className="rounded-lg bg-gradient-to-r from-awash-gold to-awash-gold-light px-3.5 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]"
            >
              + Top Up
            </button>
          </div>
        </div>
      </div>

      {/* ── Menu ── */}
      <div className="flex flex-col gap-2">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onClick={item.onClick}
            className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 py-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white hover:shadow-[0_8px_32px_rgba(200,166,66,0.08)] active:scale-[0.98]"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-awash-blue/10 border border-awash-blue/15 text-awash-blue transition-colors group-hover:bg-awash-gold/10 group-hover:border-awash-gold/25 group-hover:text-awash-gold-dark">
              <item.icon className="size-4" />
            </span>
            <span className="flex-1 text-sm font-bold text-foreground">
              {item.label}
            </span>
            {item.id === "notifications" && unreadNotificationCount > 0 && (
              <Badge tone="orange">{unreadNotificationCount}</Badge>
            )}
            <ChevronRight className="size-4 text-neutral-400 transition-all group-hover:text-primary group-hover:translate-x-0.5" />
          </motion.button>
        ))}
      </div>

      {/* ── Sign Out ── */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: menuItems.length * 0.05 }}
        onClick={() => logout()}
        className="flex w-full items-center gap-3 rounded-2xl border border-red-200/60 bg-red-50/60 px-4 py-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-50 hover:border-red-300 hover:shadow-[0_8px_32px_rgba(239,68,68,0.1)] active:scale-[0.98]"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-red-100 border border-red-200 text-red-600">
          <LogOut className="size-4" />
        </span>
        <span className="flex-1 text-sm font-bold text-red-600">Sign Out</span>
        <ChevronRight className="size-4 text-red-400" />
      </motion.button>
    </motion.div>
  );
}
