const STORAGE_KEY = "taskflow.browserAlertsEnabled";
const ALERTS_CHANGED_EVENT = "taskflow-browser-alerts-changed";

export const isBrowserAlertsSupported = () => typeof window !== "undefined" && "Notification" in window;

export const getBrowserAlertsState = () => {
  if (!isBrowserAlertsSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      enabled: false,
    };
  }

  const permission = window.Notification.permission;
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  const preferenceEnabled = storedValue === null ? permission === "granted" : storedValue === "true";

  return {
    supported: true,
    permission,
    enabled: permission === "granted" && preferenceEnabled,
  };
};

export const setBrowserAlertsPreference = (enabled) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
};

export const requestBrowserAlertsPermission = async () => {
  if (!isBrowserAlertsSupported()) {
    return "unsupported";
  }

  return window.Notification.requestPermission();
};

export const subscribeToBrowserAlertsChanges = (onChange) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const sync = () => onChange(getBrowserAlertsState());

  window.addEventListener("storage", sync);
  window.addEventListener(ALERTS_CHANGED_EVENT, sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", sync);

  return () => {
    window.removeEventListener("storage", sync);
    window.removeEventListener(ALERTS_CHANGED_EVENT, sync);
    window.removeEventListener("focus", sync);
    document.removeEventListener("visibilitychange", sync);
  };
};
