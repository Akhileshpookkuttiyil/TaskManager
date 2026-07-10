import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Clock,
  Award,
  Zap,
  Search,
  Eye,
  CheckCheck,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../store/slices/notificationsSlice";
import { formatDateTimeValue } from "../utils/dates";
import toast from "react-hot-toast";

// Local storage key for dismissed notifications
const DISMISSED_NOTIFS_KEY = "taskflow-dismissed-notifications";

export const NotificationsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: notifications, unreadCount, loading } = useSelector((state) => state.notifications);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | unread | system | tasks
  
  // List of locally dismissed notification IDs
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_NOTIFS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    dispatch(fetchNotifications({ force: true }));
  }, [dispatch]);

  // Persist dismissed IDs
  const dismissNotification = (id) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(next));
    toast.success("Notification dismissed.");
  };

  const dismissAllNotifications = () => {
    const allIds = notifications.map((n) => n._id);
    const next = [...new Set([...dismissedIds, ...allIds])];
    setDismissedIds(next);
    localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(next));
    toast.success("All notifications cleared.");
  };

  const handleMarkRead = async (id) => {
    const result = await dispatch(markNotificationRead(id));
    if (markNotificationRead.fulfilled.match(result)) {
      toast.success("Marked as read.");
    }
  };

  const handleMarkAllRead = async () => {
    const result = await dispatch(markAllNotificationsRead());
    if (markAllNotificationsRead.fulfilled.match(result)) {
      toast.success("All marked as read.");
    }
  };

  // Filter & Search computation
  const filteredNotifications = useMemo(() => {
    let result = notifications.filter((n) => !dismissedIds.includes(n._id));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message?.toLowerCase().includes(query)
      );
    }

    if (filterType === "unread") {
      result = result.filter((n) => !n.isRead);
    } else if (filterType === "system") {
      result = result.filter((n) => n.type === "system" || n.type === "streak_milestone");
    } else if (filterType === "tasks") {
      result = result.filter((n) => n.type !== "system" && n.type !== "streak_milestone");
    }

    return result;
  }, [notifications, searchQuery, filterType, dismissedIds]);

  const handleNotificationClick = (notif) => {
    // Mark read
    if (!notif.isRead) {
      handleMarkRead(notif._id);
    }
    // Redirect if taskId exists
    if (notif.taskId) {
      navigate(`/tasks?focus=${notif.taskId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task_reminder":
      case "due_soon":
      case "due_today":
        return <Zap className="text-amber-500" size={16} />;
      case "overdue":
        return <Clock className="text-rose-500" size={16} />;
      case "task_completed":
        return <CheckCircle2 className="text-emerald-500" size={16} />;
      case "streak_milestone":
        return <Award className="text-brand-500" size={16} />;
      default:
        return <Bell className="text-neutral-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Workspace Inbox
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Notification Center
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            You have {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}.
          </p>
        </div>

        {filteredNotifications.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
            <button
              onClick={dismissAllNotifications}
              className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 hover:text-rose-600 hover:border-rose-200 dark:hover:text-rose-400"
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Search and Category filters */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="input pl-9"
            aria-label="Search notifications"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 rounded-lg border border-neutral-200/80 p-0.5 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40 w-fit">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "tasks", label: "Task updates" },
            { id: "system", label: "System Alerts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                filterType === tab.id
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="card p-2.5 divide-y divide-neutral-100 dark:divide-neutral-900">
        {loading && filteredNotifications.length === 0 ? (
          <div className="space-y-4 p-4">
            <div className="h-6 w-1/3 skeleton" />
            <div className="h-6 w-3/4 skeleton" />
            <div className="h-6 w-2/3 skeleton" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-900 mx-auto text-neutral-400">
              <Bell size={20} />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mt-3">
              Your inbox is clean
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
              No new alerts or updates right now. Check back later!
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start justify-between gap-4 p-4 transition-all duration-200 cursor-pointer ${
                !notif.isRead
                  ? "bg-brand-50/10 dark:bg-brand-500/5 hover:bg-brand-50/20 dark:hover:bg-brand-500/10"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              }`}
            >
              <div className="flex gap-3 min-w-0">
                {/* Icon wrapper */}
                <div className="mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-900 shadow-sm">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm leading-5 font-semibold text-neutral-900 dark:text-white truncate ${
                      !notif.isRead ? "" : "opacity-80"
                    }`}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[10px] font-semibold text-neutral-400 mt-2 block">
                    {notif.createdAt ? formatDateTimeValue(notif.createdAt, "MMM d, h:mm a") : "Recently"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif._id)}
                    className="btn-ghost h-8 w-8 p-0 text-neutral-400 hover:text-brand-500"
                    title="Mark as read"
                  >
                    <Eye size={14} />
                  </button>
                )}
                <button
                  onClick={() => dismissNotification(notif._id)}
                  className="btn-ghost h-8 w-8 p-0 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Dismiss notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default NotificationsPage;
