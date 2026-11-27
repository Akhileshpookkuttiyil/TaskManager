import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { NotificationEngine } from "../notifications/NotificationEngine";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "../ui/CommandPalette";
import { ShortcutsModal } from "../ui/ShortcutsModal";
import { PomodoroProvider } from "../../context/PomodoroContext";
import { PomodoroModal } from "../pomodoro/PomodoroModal";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export const AppLayout = () => {
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e) => {
      // Don't trigger shortcuts inside text input elements
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Toggle Command Palette: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      
      // Quick Add Task: Alt+N
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        navigate("/tasks?new=true");
      }

      // Help shortcuts dialog: ?
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [navigate]);

  return (
    <PomodoroProvider>
      <div className="app-shell min-h-screen min-[1025px]:flex">
        {/* WCAG 2.2 Accessible Skip to Content Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-[var(--text-primary)] focus:text-[var(--bg-app)] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <NotificationEngine />
        <Sidebar />

        <div className="min-w-0 flex-1">
          <Topbar
            onQuickAdd={() => navigate("/tasks?new=true")}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
          <main
            id="main-content"
            tabIndex="-1"
            className="mx-auto max-w-6xl px-4 py-6 max-[1024px]:pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 min-[1025px]:pb-8 focus:outline-none"
          >
            <ErrorBoundary name="MainContent" variant="page">
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>

        <BottomNav onQuickAdd={() => navigate("/tasks?new=true")} />

        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onQuickAdd={() => navigate("/tasks?new=true")}
        />

        <ShortcutsModal
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />

        <PomodoroModal />
      </div>
    </PomodoroProvider>
  );
};
export default AppLayout;
