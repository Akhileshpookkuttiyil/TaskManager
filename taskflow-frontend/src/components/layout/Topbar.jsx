import { ChevronDown, LogOut, Menu, Plus, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "../notifications/NotificationBell";
import { logout } from "../../store/slices/authSlice";
import { ThemeToggle } from "../theme/ThemeToggle";

const pageMeta = {
  "/": { title: "Dashboard" },
  "/tasks": { title: "Tasks" },
  "/calendar": { title: "Calendar" },
  "/profile": { title: "Profile" },
};

export const Topbar = ({ onOpenNav, onQuickAdd }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuId = "user-menu";

  const meta = useMemo(() => pageMeta[location.pathname] || { title: "TaskFlow" }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenNav}
            className="btn-ghost h-9 w-9 px-0 text-neutral-500 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <h1 className="truncate text-lg font-semibold text-neutral-900 dark:text-white">{meta.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onQuickAdd} className="btn-secondary hidden sm:inline-flex">
            <Plus size={15} />
            Quick add
          </button>
          <NotificationBell />
          <ThemeToggle />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:hover:bg-neutral-800"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-neutral-700 sm:block dark:text-neutral-200">
                {user?.name}
              </span>
              <ChevronDown size={14} className="hidden text-neutral-400 sm:block" />
            </button>

            {menuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="border-b border-neutral-100 px-2.5 py-2 dark:border-neutral-800">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate("/profile");
                    setMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  role="menuitem"
                >
                  <UserRound size={15} />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
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
