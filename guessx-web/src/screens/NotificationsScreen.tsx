import { useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { useApp } from "../AppContext";
import { api, type ApiNotification } from "../api";
import { Badge, Card, CTAButton } from "../components/AuctionUI";
import { EmptyState } from "../components/EmptyState";

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack()}
            className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 text-awash-blue shadow-sm transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">
              Notifications
            </h1>
            <p className="text-sm font-medium text-neutral-500">
              Auction updates, reminders, and winner alerts
            </p>
          </div>
        </div>
        <Badge tone={unreadCount > 0 ? "orange" : "muted"}>
          {unreadCount} unread
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setUnreadOnly((current) => !current)}
          className={`btn-filter-chip ${unreadOnly ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}
        >
          {unreadOnly ? "Showing unread" : "Show unread only"}
        </button>
        <CTAButton
          variant="outline"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          <span className="inline-flex items-center gap-2">
            <CheckCheck className="size-4" />{" "}
            {markingAll ? "Marking..." : "Mark all read"}
          </span>
        </CTAButton>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
            </Card>
          ))}
        </div>
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
          onAction={() => (unreadOnly ? setUnreadOnly(false) : go("auctions"))}
        />
      ) : (
        <div className="grid gap-3">
          {notifications.map((item) => (
            <Card
              key={item.id}
              className={`p-4 ${item.read ? "opacity-80" : "border-awash-gold/40"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  <span
                    className={`mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl ${item.read ? "bg-neutral-100 text-neutral-400" : "bg-awash-gold/10 text-awash-gold-dark"}`}
                  >
                    <Bell className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-awash-blue">
                        {item.title}
                      </p>
                      {!item.read && <Badge tone="orange">New</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium leading-6 text-neutral-600">
                      {item.body}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {formatSentAt(item.sent_at)}
                    </p>
                  </div>
                </div>
                {!item.read && (
                  <button
                    onClick={() => markRead(item.id)}
                    disabled={busyId === item.id}
                    className="rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold text-awash-blue transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === item.id ? "Saving..." : "Mark read"}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
