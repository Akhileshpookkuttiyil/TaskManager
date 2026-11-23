import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme-context";

const STORAGE_KEY = "taskflow-theme";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || "system");
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme) => {
      let isDark = currentTheme === "dark";
      if (currentTheme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      setSystemIsDark(isDark);
      root.classList.toggle("dark", isDark);
      root.classList.toggle("light", !isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e) => {
        setSystemIsDark(e.matches);
        root.classList.toggle("dark", e.matches);
        root.classList.toggle("light", !e.matches);
        root.style.colorScheme = e.matches ? "dark" : "light";
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
    return undefined;
  }, [theme]);

  const isDark = theme === "dark" || (theme === "system" && systemIsDark);
  const resolvedTheme = isDark ? "dark" : "light";

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
    }),
    [theme, resolvedTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
