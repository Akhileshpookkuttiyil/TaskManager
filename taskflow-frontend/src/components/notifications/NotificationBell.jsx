import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Badge } from "../ui/Badge";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../store/slices/notificationsSlice";

const BROWSER_NOTIFICATION_TYPES = new Set(["due_soon", "due_today", "overdue"]);
const SHOWN_STORAGE_KEY = "taskflow-browser-notification-ids";

const readShownNotificationIds = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHOWN_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const writeShownNotificationIds = (ids) => {
  try {
    localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage failures and fall back to in-memory behavior.
  }
};

const NotificationItem = ({ notification, onRead }) => {
  const createdAt = notification.createdAt ? new Date(notification.createdAt) : null;

  return (
    <button
      type="button"
      onClick={() => onRead(notification)}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        notification.isRead
          ? "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
          : "border-brand-200 bg-brand-50/60 hover:border-brand-300 dark:border-brand-500/20 dark:bg-brand-500/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{notification.title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{notification.message}</p>
        </div>
        {!notification.isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-brand-600" /> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Badge value={notification.type} />
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : ""}
        </span>
      </div>
    </button>
  );
};

export const NotificationBell = () => {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((state) => state.notifications);
  const { token } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(() => (typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported"));
  const panelRef = useRef(null);
  const menuId = "notification-panel";
  const shownIdsRef = useRef(readShownNotificationIds());

  useEffect(() => {
    if (token) {
      dispatch(fetchNotifications({ limit: 10 }));
    }
  }, [dispatch, token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
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

  useEffect(() => {
    if (permission !== "granted" || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const nextShownIds = new Set(shownIdsRef.current);

    items
      .filter((notification) => !notification.isRead && BROWSER_NOTIFICATION_TYPES.has(notification.type) && !nextShownIds.has(notification._id))
      .forEach((notification) => {
        const browserNotification = new window.Notification(notification.title, {
          body: notification.message,
          tag: notification._id,
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };

        nextShownIds.add(notification._id);
      });

    shownIdsRef.current = nextShownIds;
    writeShownNotificationIds(nextShownIds);
  }, [items, permission]);

  const handleToggle = () => {
    setOpen((value) => {
      const next = !value;
      if (next) {
        dispatch(fetchNotifications({ limit: 10 }));
      }
      return next;
    });
  };

  const handleRead = async (notification) => {
    if (!notification.isRead) {
      await dispatch(markNotificationRead(notification._id));
    }
  };

  const handleMarkAll = async () => {
    await dispatch(markAllNotificationsRead());
  };

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const result = await window.Notification.requestPermission();
    setPermission(result);
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
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Notifications</h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{unreadCount} unread</p>
            </div>

            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                <Loader2 size={14} className="animate-spin" />
                Loading notifications
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">No notifications yet</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Due dates, completions, and reminders will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((notification) => (
                  <NotificationItem key={notification._id} notification={notification} onRead={handleRead} />
                ))}
              </div>
            )}

            <div className="mt-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Browser alerts
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {permission === "granted"
                  ? "Browser notifications are enabled for due-date reminders."
                  : permission === "denied"
                    ? "Browser notifications are blocked in your browser settings."
                    : "Enable browser notifications for due-date reminders and overdue alerts."}
              </p>

              {permission === "default" ? (
                <button type="button" onClick={handleRequestPermission} className="btn-secondary mt-3 w-full">
                  Enable browser alerts
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
