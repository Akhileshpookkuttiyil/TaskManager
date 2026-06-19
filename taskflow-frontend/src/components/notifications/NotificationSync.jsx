import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications } from "../../store/slices/notificationsSlice";

const POLL_INTERVAL_MS = 30000;

export const NotificationSync = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    if (!token) return undefined;

    const syncNotifications = (force = false) => {
      dispatch(fetchNotifications({ limit: 10, force }));
    };

    syncNotifications(true);

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncNotifications(false);
      }
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNotifications(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, token]);

  return null;
};
