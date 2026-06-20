import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchNotifications } from "../../store/slices/notificationsSlice";
import { getBrowserAlertsState, subscribeToBrowserAlertsChanges } from "./browserAlerts";

const POLL_INTERVAL_MS = 30000;
const BROWSER_NOTIFICATION_TYPES = new Set(["task_reminder", "due_soon", "due_today", "overdue"]);

export const NotificationEngine = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const notifications = useSelector((state) => state.notifications.items);
  const [browserAlerts, setBrowserAlerts] = useState(() => getBrowserAlertsState());
  const shownIdsRef = useRef(new Set());

  useEffect(() => {
    if (!token) {
      shownIdsRef.current = new Set();
      return undefined;
    }

    const syncNotifications = () => {
      dispatch(fetchNotifications({ limit: 20, force: true }));
    };

    syncNotifications();

    const pollId = window.setInterval(syncNotifications, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(pollId);
    };
  }, [dispatch, token]);

  useEffect(() => {
    const unsubscribe = subscribeToBrowserAlertsChanges(setBrowserAlerts);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!browserAlerts.enabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const nextShownIds = new Set(shownIdsRef.current);

    notifications
      .filter((notification) => !notification.isRead && BROWSER_NOTIFICATION_TYPES.has(notification.type) && !nextShownIds.has(notification._id))
      .forEach((notification) => {
        const browserNotification = new window.Notification(notification.title, {
          body: notification.message,
          tag: notification._id,
        });

        browserNotification.onclick = () => {
          window.focus();
          navigate(notification.taskId ? `/tasks?focus=${notification.taskId}` : "/tasks");
          browserNotification.close();
        };

        nextShownIds.add(notification._id);
      });

    shownIdsRef.current = nextShownIds;
  }, [browserAlerts.enabled, navigate, notifications]);

  return null;
};
