import { ChevronDown, Keyboard, Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { NotificationBell } from "../notifications/NotificationBell";
import { UserMenu } from "./UserMenu";

const pageMeta = {
  "/": { title: "Dashboard", subtitle: "Productivity snapshot" },
  "/tasks": { title: "Tasks Workspace", subtitle: "Focus & capture queue" },
  "/calendar": { title: "Calendar Planner", subtitle: "Time-aware schedule mapping" },
  "/profile": { title: "Workspace Settings", subtitle: "Personal details & appearance" },
  "/analytics": { title: "Productivity Insights", subtitle: "Streak & completion trends" },
  "/notifications": { title: "Notification Center", subtitle: "Manage system notifications & alerts" },
};

export const Topbar = ({ onQuickAdd, onOpenCommandPalette, onOpenShortcuts }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs for focus management
  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  const menuId = "user-menu";

  const meta = useMemo(() => {
    if (location.pathname === "/tasks") {
      const view = new URLSearchParams(location.search).get("view");
      const viewMode = new URLSearchParams(location.search).get("viewMode");
      if (viewMode === "calendar") {
        return { title: "Calendar Planner", subtitle: "Time-aware schedule mapping" };
      }
      if (view === "my_day") {
        return { title: "Today's Focus", subtitle: "Plan and conquer today's list" };
      }
      if (view === "upcoming") {
        return { title: "Upcoming Schedule", subtitle: "Track upcoming plans & dates" };
      }
      if (view === "inbox") {
        return { title: "Tasks Inbox", subtitle: "Your task collection inbox" };
      }
      return { title: "Tasks Workspace", subtitle: "Focus & capture queue" };
    }
    const matched = pageMeta[location.pathname];
    if (matched) return matched;
    if (location.pathname.startsWith("/tasks")) {
      return pageMeta["/tasks"];
    }
    return { title: "TaskFlow", subtitle: "Focused workspace" };
  }, [location.pathname, location.search]);

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Derive initials for trigger button avatar
  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user]);

  return (
    <header
      className="sticky top-0 z-30 border-b bg-app border-subtle transition-colors duration-150"
    >
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Navigation Context Info */}
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-bold tracking-tight text-primary sm:text-lg">
            {meta.title}
          </h1>
          <p className="hidden text-xs text-muted sm:block">
            {meta.subtitle}
          </p>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-1.5">
          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="btn-ghost hidden h-9 w-9 items-center justify-center p-0 text-muted sm:flex"
            aria-label="Open Command Palette"
            title="Command Palette (Ctrl+K)"
          >
            <Keyboard size={16} />
          </button>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={onQuickAdd}
            className="btn-primary hidden min-h-[34px] px-3 py-1.5 text-xs font-semibold sm:inline-flex"
          >
            <Plus size={14} strokeWidth={2.5} />
            Quick Add
          </button>

          <NotificationBell />

          {/* User Account Menu Trigger */}
          <div ref={containerRef} className="relative ml-0.5">
            <button
              ref={triggerRef}
              type="button"
              id={`${menuId}-trigger`}
              onClick={handleToggleMenu}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-left transition-colors focus-ring"
              style={
                menuOpen
                  ? { background: "var(--bg-hover)" }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!menuOpen) e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!menuOpen) e.currentTarget.style.background = "";
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuOpen ? menuId : undefined}
              aria-label="User account options"
            >
              {/* Avatar initials */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none bg-pressed text-primary border border-neutral"
                aria-hidden="true"
              >
                {initials}
              </div>
              <span className="hidden max-w-[96px] truncate text-sm font-semibold text-secondary sm:block">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown
                size={13}
                className="hidden transition-transform duration-150 text-muted sm:block"
                style={{
                  transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
                aria-hidden="true"
              />
            </button>

            {/* UserMenu dropdown */}
            <UserMenu
              isOpen={menuOpen}
              onClose={handleCloseMenu}
              onOpenShortcuts={onOpenShortcuts}
              triggerRef={triggerRef}
              id={menuId}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
