import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { NotificationEngine } from "../notifications/NotificationEngine";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "../ui/CommandPalette";
import { ShortcutsModal } from "../ui/ShortcutsModal";

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
    <div className="app-shell min-h-screen min-[1025px]:flex">
      <NotificationEngine />
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Topbar 
          onQuickAdd={() => navigate("/tasks?new=true")} 
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
        <main className="mx-auto max-w-6xl px-4 py-6 max-[1024px]:pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 min-[1025px]:pb-8">
          <Outlet />
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
    </div>
  );
};
export default AppLayout;
