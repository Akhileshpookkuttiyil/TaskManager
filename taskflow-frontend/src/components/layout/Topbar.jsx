import { ChevronDown, LogOut, Plus, UserRound, Keyboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "../notifications/NotificationBell";
import { logout } from "../../store/slices/authSlice";
import { ThemeToggle } from "../theme/ThemeToggle";

const pageMeta = {
  "/": { title: "Dashboard", subtitle: "Productivity snapshot" },
  "/tasks": { title: "Tasks Workspace", subtitle: "Focus & capture queue" },
  "/calendar": { title: "Calendar Planner", subtitle: "Time-aware schedule mapping" },
  "/profile": { title: "Workspace Settings", subtitle: "Personal details & appearance" },
  "/analytics": { title: "Productivity Insights", subtitle: "Streak & completion trends" },
  "/notifications": { title: "Notification Center", subtitle: "Manage system notifications & alerts" },
};

export const Topbar = ({ onQuickAdd, onOpenCommandPalette }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
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

  // Handle outside clicks for User profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Escape key closure
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-950/95 transition-all">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Navigation Context Info */}
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-bold tracking-tight text-neutral-900 dark:text-white sm:text-lg">
            {meta.title}
          </h1>
          <p className="hidden text-xs text-neutral-400 dark:text-neutral-500 sm:block">
            {meta.subtitle}
          </p>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-2">
          {/* Shortcuts Info Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="btn-ghost hidden h-9 w-9 items-center justify-center p-0 text-neutral-400 sm:flex"
            aria-label="Open Command Palette"
            title="Command Palette (Ctrl+K)"
          >
            <Keyboard size={16} />
          </button>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={onQuickAdd}
            className="btn-primary min-h-[34px] text-xs font-semibold py-1.5 px-3 hidden sm:inline-flex"
          >
            <Plus size={14} strokeWidth={2.5} />
            Quick Add
          </button>

          <NotificationBell />
          <ThemeToggle />

          {/* User Account Menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus-ring"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              aria-label="User account options"
            >
              <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-sm">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden max-w-[100px] truncate text-sm font-semibold text-neutral-700 sm:block dark:text-neutral-300">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown size={14} className="hidden text-neutral-400 sm:block" />
            </button>

            {menuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    My Account
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-neutral-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                    {user?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  <UserRound size={15} />
                  Settings & Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  role="menuitem"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Topbar;
