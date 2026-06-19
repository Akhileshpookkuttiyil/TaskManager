import { Toaster } from "react-hot-toast";
import { useTheme } from "./theme-context";

export const ThemedToaster = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: "500",
          background: isDark ? "#1a1a1a" : "#ffffff",
          color: isDark ? "#e5e5e5" : "#1a1a1a",
          border: `1px solid ${isDark ? "#2a2a2a" : "#e4e4e4"}`,
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 4px 24px rgba(0,0,0,0.08)",
          padding: "10px 14px",
        },
      }}
    />
  );
};
