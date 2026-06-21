import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { markAllNotificationsRead, markNotificationRead } from "../../store/slices/notificationsSlice";
import {
  getBrowserAlertsState,
  requestBrowserAlertsPermission,
  setBrowserAlertsPreference,
  subscribeToBrowserAlertsChanges,
} from "./browserAlerts";

const sortNotificationsByRecent = (items) => [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const lineClampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lines,
  overflow: "hidden",
});

const NotificationItem = ({ notification, onRead }) => {
  const createdAt = notification.createdAt ? new Date(notification.createdAt) : null;

  return (
    <button
      type="button"
      onClick={() => onRead(notification)}
      className={`w-full rounded-xl border p-2.5 text-left transition-colors sm:p-3 ${
        notification.isRead
          ? "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
          : "border-brand-200 bg-brand-50/60 hover:border-brand-300 dark:border-brand-500/20 dark:bg-brand-500/10"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-medium text-neutral-900 sm:text-sm dark:text-white"
            style={lineClampStyle(2)}
          >
            {notification.title}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-neutral-500 sm:text-xs sm:leading-5 dark:text-neutral-400" style={lineClampStyle(2)}>
            {notification.message}
          </p>
        </div>

        {!notification.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" /> : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] sm:text-[11px]">
        <span className="min-w-0 text-neutral-400 dark:text-neutral-500">
          {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : ""}
        </span>
        <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{notification.isRead ? "Read" : "Unread"}</span>
      </div>
    </button>
  );
};

const BrowserAlertsToggle = ({ alerts, onToggle }) => {
  const disabled = !alerts.supported || alerts.permission === "denied";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={alerts.enabled}
      aria-label="Browser alerts"
      aria-disabled={disabled}
      onClick={onToggle}
      disabled={disabled}
      className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-left transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-800 sm:min-h-10"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">Browser alerts</span>
        <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">{alerts.enabled ? "ON" : "OFF"}</span>
      </span>

      <span
        className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
          alerts.enabled ? "bg-brand-600" : "bg-neutral-300 dark:bg-neutral-700"
        }`}
        aria-hidden="true"
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            alerts.enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
};

export const NotificationBell = () => {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((state) => state.notifications);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(() => getBrowserAlertsState());
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef(null);
  const menuId = "notification-panel";

  const recentItems = useMemo(() => sortNotificationsByRecent(items), [items]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToBrowserAlertsChanges(setAlerts);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 640) return; // Mobile has its own full screen backdrop button
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleToggle = () => {
    setOpen((value) => !value);
  };

  const handleRead = async (notification) => {
    const targetPath = notification.taskId ? `/tasks?focus=${notification.taskId}` : "/tasks";

    if (!notification.isRead) {
      await dispatch(markNotificationRead(notification._id));
    }

    navigate(targetPath);
    setOpen(false);
  };

  const handleMarkAll = async () => {
    await dispatch(markAllNotificationsRead());
  };

  const handleBrowserAlertsToggle = async () => {
    if (!alerts.supported) {
      return;
    }

    if (alerts.enabled) {
      setBrowserAlertsPreference(false);
      setAlerts((current) => ({ ...current, enabled: false }));
      return;
    }

    const permission = alerts.permission === "granted" ? "granted" : await requestBrowserAlertsPermission();
    const enabled = permission === "granted";

    setBrowserAlertsPreference(enabled);
    setAlerts({
      supported: alerts.supported,
      permission,
      enabled,
    });
  };

  if (typeof document === "undefined") {
    return null;
  }

  const renderPanel = () => {
    return (
      <div
        id={menuId}
        role="menu"
        className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:bottom-auto sm:left-auto sm:w-[min(22rem,calc(100vw-1.5rem))] sm:max-h-[min(28rem,calc(100dvh-6rem-env(safe-area-inset-bottom)))] md:w-[22rem] lg:w-80 xl:w-[23rem] 2xl:w-96 sm:rounded-xl sm:shadow-xl"
      >
        <div className="shrink-0 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {unreadCount} unread
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:hidden dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
              aria-label="Close notifications panel"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <BrowserAlertsToggle alerts={alerts} onToggle={handleBrowserAlertsToggle} />
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-neutral-200 px-3 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:w-auto sm:shrink-0 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <CheckCheck size={13} />
              Mark all
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 px-3 py-6 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 size={14} className="animate-spin" />
              Loading notifications
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex min-h-28 items-center justify-center px-3 py-6 text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentItems.map((notification) => (
                <NotificationItem key={notification._id} notification={notification} onRead={handleRead} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Open notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold leading-none text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        isMobile ? (
          createPortal(
            <>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-[1px]"
              />
              {renderPanel()}
            </>,
            document.body
          )
        ) : (
          renderPanel()
        )
      ) : null}
    </div>
  );
};
